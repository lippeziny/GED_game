import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { Server } from 'socket.io';
import { LEVELS } from '../src/data/gameData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: true,
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6,
});

const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
const MAX_PLAYERS = 32;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function cleanName(value) {
  return String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 22);
}

function cleanCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function createCode() {
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function levelInfo(levelNumber) {
  return LEVELS.find((item) => item.level === levelNumber) || LEVELS[0];
}

function snapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    status: room.status,
    level: room.level,
    startedAt: room.startedAt,
    countdownEndsAt: room.countdownEndsAt,
    campaignComplete: room.campaignComplete,
    createdAt: room.createdAt,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      ready: player.ready,
      online: player.online,
      finishedAt: player.finishedAt,
      elapsedMs: player.elapsedMs,
    })),
    challenge: {
      level: levelInfo(room.level).level,
      title: levelInfo(room.level).title,
      difficulty: levelInfo(room.level).difficulty,
      color: levelInfo(room.level).color,
      targetFileName: levelInfo(room.level).targetFileName,
      clue: levelInfo(room.level).clue,
    },
  };
}

function sendUpdate(room) {
  room.lastActivity = Date.now();
  io.to(room.code).emit('room:update', snapshot(room));
}

function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === String(playerId));
}

function validPlayerId(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 80;
}

function reply(ack, payload) {
  if (typeof ack === 'function') ack(payload);
}

function error(ack, message) {
  reply(ack, { ok: false, error: message });
}

function maybeStartCountdown(room) {
  const onlinePlayers = room.players.filter((player) => player.online);
  if (room.status !== 'lobby' || onlinePlayers.length < 2) return false;
  if (!onlinePlayers.every((player) => player.ready)) return false;

  room.status = 'countdown';
  room.countdownEndsAt = Date.now() + 3000;
  room.lastActivity = Date.now();
  sendUpdate(room);
  const expectedLevel = room.level;
  setTimeout(() => {
    const current = rooms.get(room.code);
    if (!current || current.status !== 'countdown' || current.level !== expectedLevel) return;
    const onlinePlayers = current.players.filter((player) => player.online);
    if (onlinePlayers.length < 2 || !onlinePlayers.every((player) => player.ready)) {
      current.status = 'lobby';
      current.countdownEndsAt = null;
      current.players.forEach((player) => { player.ready = false; });
      sendUpdate(current);
      return;
    }
    current.status = 'playing';
    current.startedAt = Date.now();
    current.countdownEndsAt = null;
    sendUpdate(current);
  }, 3000);
  return true;
}

io.on('connection', (socket) => {
  socket.on('heartbeat', ({ roomCode } = {}) => {
    const room = rooms.get(cleanCode(roomCode));
    if (room) room.lastActivity = Date.now();
  });

  socket.on('room:create', (payload = {}, ack) => {
    const name = cleanName(payload.name);
    const playerId = payload.playerId;
    const requestedLevel = Number(payload.level || 1);
    if (name.length < 2) return error(ack, 'Digite um nome com pelo menos 2 caracteres.');
    if (!validPlayerId(playerId)) return error(ack, 'Não foi possível identificar este jogador. Atualize a página e tente novamente.');
    const selectedLevel = Number.isInteger(requestedLevel) && requestedLevel >= 1 && requestedLevel <= 10 ? requestedLevel : 1;
    const code = createCode();
    const room = {
      code,
      hostId: playerId,
      status: 'lobby',
      level: selectedLevel,
      startedAt: null,
      countdownEndsAt: null,
      campaignComplete: false,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      players: [{ id: playerId, name, ready: false, online: true, socketId: socket.id, finishedAt: null, elapsedMs: null }],
    };
    rooms.set(code, room);
    socket.join(code);
    reply(ack, { ok: true, room: snapshot(room) });
    sendUpdate(room);
  });

  socket.on('room:join', (payload = {}, ack) => {
    const code = cleanCode(payload.roomCode);
    const name = cleanName(payload.name);
    const playerId = payload.playerId;
    const room = rooms.get(code);
    if (!room) return error(ack, 'Sala não encontrada. Confira o código ou peça um novo link.');
    if (name.length < 2) return error(ack, 'Digite um nome com pelo menos 2 caracteres.');
    if (!validPlayerId(playerId)) return error(ack, 'Não foi possível identificar este jogador. Atualize a página e tente novamente.');

    let player = findPlayer(room, playerId);
    if (!player && room.status !== 'lobby') return error(ack, 'Esta partida já começou. Peça ao organizador um novo link para outra sala.');
    if (!player && room.players.length >= MAX_PLAYERS) return error(ack, 'A sala atingiu o limite de 32 participantes.');

    if (player && player.socketId && player.socketId !== socket.id) {
      const previousSocket = io.sockets.sockets.get(player.socketId);
      if (previousSocket) previousSocket.leave(code);
    }

    if (!player) {
      player = { id: playerId, name, ready: false, online: true, socketId: socket.id, finishedAt: null, elapsedMs: null };
      room.players.push(player);
    } else {
      player.name = name;
      player.online = true;
      player.socketId = socket.id;
    }
    socket.join(code);
    room.lastActivity = Date.now();
    reply(ack, { ok: true, room: snapshot(room) });
    sendUpdate(room);
  });

  socket.on('player:ready', (payload = {}, ack) => {
    const room = rooms.get(cleanCode(payload.roomCode));
    if (!room || room.status !== 'lobby') return error(ack, 'A sala não está aceitando confirmações de prontidão.');
    const player = findPlayer(room, payload.playerId);
    if (!player || player.socketId !== socket.id) return error(ack, 'Jogador não encontrado nesta sala.');
    player.ready = Boolean(payload.ready);
    sendUpdate(room);
    maybeStartCountdown(room);
    reply(ack, { ok: true, room: snapshot(room) });
  });

  socket.on('file:found', (payload = {}, ack) => {
    const room = rooms.get(cleanCode(payload.roomCode));
    if (!room || room.status !== 'playing') return error(ack, 'A rodada não está ativa.');
    const player = findPlayer(room, payload.playerId);
    if (!player || player.socketId !== socket.id) return error(ack, 'Jogador não encontrado nesta sala.');
    const challenge = levelInfo(room.level);
    if (payload.fileId !== challenge.targetFileId) return error(ack, 'Este não é o documento solicitado. Continue procurando.');
    if (player.finishedAt) return error(ack, 'Você já concluiu este nível.');

    const now = Date.now();
    player.finishedAt = now;
    player.elapsedMs = Math.max(0, now - room.startedAt);
    const completed = room.players.filter((item) => item.finishedAt !== null).sort((a, b) => a.finishedAt - b.finishedAt);
    const place = completed.findIndex((item) => item.id === player.id) + 1;
    const onlinePlayers = room.players.filter((item) => item.online);
    const allDone = onlinePlayers.length > 0 && onlinePlayers.every((item) => item.finishedAt !== null);
    if (allDone) room.status = 'completed';
    sendUpdate(room);
    reply(ack, { ok: true, elapsedMs: player.elapsedMs, place, totalPlayers: room.players.length, allDone });
  });

  socket.on('room:next-level', (payload = {}, ack) => {
    const room = rooms.get(cleanCode(payload.roomCode));
    if (!room) return error(ack, 'Sala não encontrada.');
    if (room.hostId !== payload.playerId) return error(ack, 'Somente o organizador pode avançar o nível.');
    const onlinePlayers = room.players.filter((player) => player.online);
    if (room.status !== 'completed' || onlinePlayers.length === 0 || !onlinePlayers.every((player) => player.finishedAt !== null)) {
      return error(ack, 'Todos os participantes precisam concluir o nível antes de avançar.');
    }
    if (room.level >= 10) {
      room.campaignComplete = true;
      sendUpdate(room);
      return reply(ack, { ok: true, room: snapshot(room), campaignComplete: true });
    }
    room.level += 1;
    room.status = 'lobby';
    room.startedAt = null;
    room.countdownEndsAt = null;
    room.players.forEach((player) => {
      player.ready = false;
      player.finishedAt = null;
      player.elapsedMs = null;
    });
    room.lastActivity = Date.now();
    sendUpdate(room);
    reply(ack, { ok: true, room: snapshot(room) });
  });

  socket.on('room:leave', (payload = {}) => {
    const room = rooms.get(cleanCode(payload.roomCode));
    if (!room) return;
    const player = findPlayer(room, payload.playerId);
    if (player && player.socketId === socket.id) {
      player.online = false;
      player.ready = false;
      player.socketId = null;
      if (room.hostId === player.id) {
        const nextHost = room.players.find((item) => item.online);
        if (nextHost) room.hostId = nextHost.id;
      }
      if (room.status === 'playing') {
        const onlinePlayers = room.players.filter((item) => item.online);
        if (onlinePlayers.length > 0 && onlinePlayers.every((item) => item.finishedAt !== null)) room.status = 'completed';
      }
      if (room.status === 'countdown') {
        room.status = 'lobby';
        room.countdownEndsAt = null;
        room.players.forEach((item) => { item.ready = false; });
      }
      sendUpdate(room);
    }
    socket.leave(room.code);
  });

  socket.on('disconnect', () => {
    for (const room of rooms.values()) {
      const player = room.players.find((item) => item.socketId === socket.id);
      if (!player) continue;
      player.online = false;
      player.socketId = null;
      if (room.status === 'lobby') player.ready = false;
      if (room.status === 'playing') {
        const onlinePlayers = room.players.filter((item) => item.online);
        if (onlinePlayers.length > 0 && onlinePlayers.every((item) => item.finishedAt !== null)) room.status = 'completed';
      }
      if (room.hostId === player.id) {
        const nextHost = room.players.find((item) => item.online);
        if (nextHost) room.hostId = nextHost.id;
      }
      if (room.status === 'countdown') {
        room.status = 'lobby';
        room.countdownEndsAt = null;
        room.players.forEach((item) => { item.ready = false; });
      }
      sendUpdate(room);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.lastActivity > ROOM_TTL_MS) rooms.delete(code);
  }
}, 10 * 60 * 1000).unref();

const distPath = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distPath, 'index.html');

// Render (and other hosts) can use this endpoint as a deployment health check.
app.get('/health', (_req, res) => {
  const buildReady = process.env.NODE_ENV !== 'production' || existsSync(indexHtmlPath);
  res.status(buildReady ? 200 : 503).json({
    ok: buildReady,
    service: 'drive-hunt-ged',
    buildReady,
    rooms: rooms.size,
    hint: buildReady ? undefined : 'The frontend build is missing. Run npm install && npm run build from the project root.'
  });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath, { maxAge: '1h', index: 'index.html' }));
  app.get('*', (_req, res) => {
    if (!existsSync(indexHtmlPath)) {
      return res.status(503).type('html').send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Drive Hunt GED — configuração pendente</title><body style="margin:0;background:#17191e;color:#f4f6fb;font:16px system-ui;display:grid;min-height:100vh;place-items:center;padding:24px;box-sizing:border-box"><main style="max-width:650px;background:#242933;border:1px solid #3a4352;border-radius:20px;padding:32px"><h1>Drive Hunt GED</h1><h2>O site ainda não foi compilado.</h2><p>O servidor iniciou, mas não encontrou <code>dist/index.html</code>.</p><p>No serviço de hospedagem, configure o comando de build como <code>npm install && npm run build</code> e o comando de inicialização como <code>npm start</code>. A raiz do serviço deve conter <code>package.json</code>, <code>render.yaml</code> e a pasta <code>src/</code>.</p><p>Consulte o README incluído no projeto para conferir a configuração.</p></main></body></html>`);
    }
    return res.sendFile(indexHtmlPath);
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Drive Hunt GED ativo na porta ${PORT}`);
  if (process.env.NODE_ENV === 'production' && !existsSync(indexHtmlPath)) {
    console.error(`Build ausente: ${indexHtmlPath}. Execute npm run build na raiz do projeto.`);
  }
});

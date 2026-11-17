// Adaptador Socket.IO: autentica cada socket, valida eventos e envia a cada papel apenas a sua visão.
import { Bucket, KeyedLimiter } from './ratelimit.js';

const str = (v, max = 64) => (typeof v === 'string' && v.length <= max ? v : '');

export function registerSockets(io, engine, { store, trustProxy = false, log = console } = {}) {
  const sockets = new Map(); // socket.id -> socket (somente os já vinculados a uma sala)
  const byRoom = new Map();  // code -> Set<socket.id>
  const failedJoin = new KeyedLimiter(12, 5 * 60 * 1000);
  const createLimit = new KeyedLimiter(15, 10 * 60 * 1000);
  const pending = new Map(); // code -> timeout (agrupa rajadas de eventos em uma transmissão)

  const ipOf = (socket) => {
    const fwd = trustProxy && String(socket.handshake?.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    return fwd || socket.handshake?.address || 'unknown';
  };

  const bind = (socket, data) => {
    unbind(socket);
    socket.data = { ...data, treeLevel: 0 };
    sockets.set(socket.id, socket);
    if (!byRoom.has(data.code)) byRoom.set(data.code, new Set());
    byRoom.get(data.code).add(socket.id);
  };
  const unbind = (socket) => {
    const d = socket.data;
    if (d?.code) byRoom.get(d.code)?.delete(socket.id);
    sockets.delete(socket.id);
    socket.data = {};
  };

  function sendView(socket, room) {
    const d = socket.data;
    if (d.role === 'host') {
      socket.emit('state', engine.hostView(room));
    } else {
      const p = room.players.find((x) => x.id === d.playerId);
      if (!p || p.removed) { socket.emit('kicked'); unbind(socket); return; }
      const view = engine.playerView(room, p);
      socket.emit('state', view);
      const needTree = ['countdown', 'playing', 'paused'].includes(room.phase) && view.me.eligible && d.treeLevel !== room.level;
      if (needTree) { d.treeLevel = room.level; socket.emit('tree', { level: room.level, root: engine._tree(room, room.level).root }); }
    }
  }

  function broadcast(room) {
    const ids = byRoom.get(room.code); if (!ids) return;
    for (const id of [...ids]) { const s = sockets.get(id); if (s) sendView(s, room); }
    if (room.phase === 'closed') { for (const id of [...ids]) { const s = sockets.get(id); if (s) { s.emit('closed'); unbind(s); } } byRoom.delete(room.code); }
  }

  engine.onChange = (room, deletedCode) => {
    if (deletedCode) { byRoom.delete(deletedCode); }
    if (room && !pending.has(room.code)) {
      pending.set(room.code, setTimeout(() => { pending.delete(room.code); const r = engine.rooms.get(room.code); if (r) broadcast(r); }, 40));
    }
    store?.schedule(() => engine.serialize());
  };

  const hostOf = (socket) => (socket.data?.role === 'host' ? socket.data : null);
  const playerOf = (socket) => (socket.data?.role === 'player' ? socket.data : null);
  const answer = (ack, payload) => { if (typeof ack === 'function') ack(payload); };

  io.on('connection', (socket) => {
    socket.data = {};
    const bucket = new Bucket(40, 10_000);
    const on = (event, handler) => socket.on(event, (payload, ack) => {
      if (typeof payload === 'function') { ack = payload; payload = {}; }
      if (!bucket.take()) return answer(ack, { ok: false, error: 'Muitas ações em pouco tempo. Aguarde um instante.', code: 'rate' });
      if (payload === null || typeof payload !== 'object') payload = {};
      try { handler(payload, ack); } catch (e) { log.error(`Erro no evento ${event}:`, e); answer(ack, { ok: false, error: 'Erro interno. Tente novamente.' }); }
    });

    on('host:create', (_p, ack) => {
      if (!createLimit.take(ipOf(socket))) return answer(ack, { ok: false, error: 'Muitas salas criadas deste endereço. Aguarde alguns minutos.', code: 'rate' });
      const r = engine.createRoom();
      if (!r.ok) return answer(ack, r);
      bind(socket, { role: 'host', code: r.room.code, token: r.hostToken });
      answer(ack, { ok: true, code: r.room.code, hostToken: r.hostToken, view: engine.hostView(r.room) });
    });

    on('host:resume', (p, ack) => {
      const code = str(p.code, 8); const token = str(p.hostToken, 80);
      const r = engine.resumeHost(code, token);
      if (!r.ok) return answer(ack, r);
      bind(socket, { role: 'host', code: r.room.code, token });
      answer(ack, { ok: true, code: r.room.code, view: engine.hostView(r.room) });
    });

    on('host:action', (p, ack) => {
      const h = hostOf(socket); // identidade vem do vínculo do socket, nunca do payload
      if (!h) return answer(ack, { ok: false, error: 'Ação restrita ao apresentador.', code: 'auth' });
      const action = str(p.action, 24);
      const r = engine.host(h.code, h.token, action, p.arg);
      answer(ack, r.ok ? { ok: true, finished: r.finished } : r);
    });

    on('player:join', (p, ack) => {
      const ip = ipOf(socket);
      if (failedJoin.blocked(ip)) return answer(ack, { ok: false, error: 'Muitas tentativas inválidas. Aguarde alguns minutos.', code: 'rate' });
      const r = engine.joinRoom(str(p.code, 8), str(p.nick, 80));
      if (!r.ok) { if (['not_found', 'nick', 'duplicate'].includes(r.code)) failedJoin.take(ip); return answer(ack, r); }
      bind(socket, { role: 'player', code: r.room.code, playerId: r.player.id, token: r.token });
      answer(ack, { ok: true, code: r.room.code, playerId: r.player.id, token: r.token, late: r.late, view: engine.playerView(r.room, r.player) });
      broadcast(r.room); // entrega a árvore se a rodada já estiver em andamento
    });

    on('player:resume', (p, ack) => {
      const ip = ipOf(socket);
      if (failedJoin.blocked(ip)) return answer(ack, { ok: false, error: 'Muitas tentativas inválidas. Aguarde alguns minutos.', code: 'rate' });
      const r = engine.resumePlayer(str(p.code, 8), str(p.playerId, 64), str(p.token, 80));
      if (!r.ok) { failedJoin.take(ip); return answer(ack, r); }
      bind(socket, { role: 'player', code: r.room.code, playerId: r.player.id, token: r.player.token });
      answer(ack, { ok: true, code: r.room.code, view: engine.playerView(r.room, r.player) });
      broadcast(r.room);
    });

    on('doc:open', (p, ack) => {
      const d = playerOf(socket);
      if (!d) return answer(ack, { ok: false, error: 'Entre em uma sala primeiro.', code: 'auth' });
      const r = engine.openDoc(d.code, d.playerId, d.token, str(p.fileId, 16));
      answer(ack, r);
    });

    socket.on('disconnect', () => {
      const d = socket.data;
      if (d?.role === 'player') engine.setOnline(d.code, d.playerId, false);
      else if (d?.role === 'host') { const room = engine.getRoom(d.code); if (room) engine.onChange(room); }
      unbind(socket);
    });
  });

  const sweeper = setInterval(() => { failedJoin.sweep(); createLimit.sweep(); }, 60_000); sweeper.unref?.();
  return { broadcast, sockets, byRoom };
}

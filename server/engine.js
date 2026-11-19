// Motor de partidas do Drive Hunt GED. Independente de rede: todo o estado oficial
// (fases, cronômetro, pontuação, ranking) vive aqui e é controlado pelo servidor.
import crypto from 'node:crypto';
import {
  TOTAL_LEVELS, COUNTDOWN_MS, MAX_PLAYERS, NICK_MIN, NICK_MAX, DEFAULT_POINTS,
  ROUND_SECONDS, TIPS, LEVEL_META, ERROR_PENALTY, scoreFor,
} from '../shared/constants.js';
import { buildLevel } from './tree.js';

const PIN_LEN = 6;
const FILE_ID = /^f[0-9a-z]{2,8}$/;

export function normalizeNick(raw) {
  const nick = String(raw ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  if (nick.length < NICK_MIN) return { error: `O apelido precisa ter pelo menos ${NICK_MIN} caracteres.` };
  if (nick.length > NICK_MAX) return { error: `O apelido pode ter no máximo ${NICK_MAX} caracteres.` };
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(nick)) return { error: 'Use apenas letras, números, espaço, ponto, hífen ou sublinhado.' };
  const key = nick.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return { nick, key };
}

// Foto do jogador: data URL já recortada e reduzida pelo cliente (JPEG/PNG/WebP, até ~45 KB).
export function validateAvatar(v) {
  if (v === undefined || v === null || v === '') return { avatar: null };
  const m = typeof v === 'string' && v.length <= 62000 ? /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(v) : null;
  if (!m) return { error: 'Foto inválida. Escolha outra imagem.' };
  const b = Buffer.from(m[2], 'base64');
  const okMagic = (m[1] === 'image/jpeg' && b[0] === 0xff && b[1] === 0xd8)
    || (m[1] === 'image/png' && b.slice(0, 4).toString('hex') === '89504e47')
    || (m[1] === 'image/webp' && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP');
  return okMagic ? { avatar: v, mime: m[1], bytes: b } : { error: 'Foto inválida. Escolha outra imagem.' };
}

const secret = () => crypto.randomBytes(18).toString('hex');
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a ?? '')); const y = Buffer.from(String(b ?? ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const fail = (error, code = 'invalid') => ({ ok: false, error, code });

export class GameEngine {
  constructor({ now = () => Date.now(), points = DEFAULT_POINTS, errorPenalty = ERROR_PENALTY, roundSeconds = ROUND_SECONDS, maxRooms = 300, onChange = () => {} } = {}) {
    this.now = now;
    this.points = points;
    this.errorPenalty = errorPenalty;
    this.roundSeconds = roundSeconds;
    this.maxRooms = maxRooms;
    this.onChange = onChange;
    this.rooms = new Map();
    this.trees = new Map(); // `${code}:${level}` -> árvore (derivada da semente; não persistida)
  }

  // ---------- Sessões ----------
  createRoom() {
    if (this.rooms.size >= this.maxRooms) return fail('Limite de salas do servidor atingido. Tente novamente em alguns minutos.', 'capacity');
    let code;
    do { code = String(crypto.randomInt(0, 10 ** PIN_LEN)).padStart(PIN_LEN, '0'); } while (this.rooms.has(code));
    const t = this.now();
    const room = {
      code, hostToken: secret(), seed: crypto.randomInt(1, 2 ** 30), phase: 'lobby', level: 0,
      locked: false, lateJoin: true, showRanking: false, createdAt: t, lastActivity: t, closedAt: null,
      players: [], round: null, history: {}, seq: 0,
    };
    this.rooms.set(code, room);
    return { ok: true, room, hostToken: room.hostToken };
  }

  getRoom(code) { return this.rooms.get(String(code ?? '').replace(/\D/g, '').slice(0, PIN_LEN)) || null; }

  _touch(room) { room.lastActivity = this.now(); room.seq += 1; this.onChange(room); }

  _tree(room, level) {
    const key = `${room.code}:${level}`;
    if (!this.trees.has(key)) this.trees.set(key, buildLevel(level, room.seed));
    return this.trees.get(key);
  }

  _hostOk(room, token) { return room && safeEqual(room.hostToken, token); }
  _player(room, id) { return room.players.find((p) => p.id === id && !p.removed) || null; }
  _active(room) { return room.players.filter((p) => !p.removed); }

  joinRoom(code, rawNick, rawAvatar) {
    const room = this.getRoom(code);
    if (!room || room.phase === 'closed') return fail('Sala não encontrada. Confira o PIN.', 'not_found');
    const n = normalizeNick(rawNick);
    if (n.error) return fail(n.error, 'nick');
    const av = validateAvatar(rawAvatar);
    if (av.error) return fail(av.error, 'avatar');
    if (room.phase === 'finished') return fail('Esta partida já terminou.', 'finished');
    if (room.locked) return fail('O professor bloqueou novas entradas nesta sala.', 'locked');
    if (room.phase !== 'lobby' && !room.lateJoin) return fail('A partida já começou e a entrada tardia está desativada.', 'started');
    if (this._active(room).length >= MAX_PLAYERS) return fail(`A sala atingiu o limite de ${MAX_PLAYERS} participantes.`, 'full');
    if (this._active(room).some((p) => p.key === n.key)) return fail('Este apelido já está em uso nesta sala. Escolha outro.', 'duplicate');
    const player = {
      id: crypto.randomUUID(), token: secret(), nick: n.nick, key: n.key, online: true,
      joinedAt: this.now(), order: room.players.length, eligibleFrom: room.phase === 'lobby' ? 1 : room.level + 1,
      total: 0, totalMs: 0, results: [], wrong: {}, wrongIds: {}, removed: false,
      avatar: av.avatar, av: av.avatar ? crypto.createHash('sha1').update(av.avatar).digest('hex').slice(0, 8) : null,
    };
    room.players.push(player);
    this._touch(room);
    return { ok: true, room, player, token: player.token, late: room.phase !== 'lobby' };
  }

  resumePlayer(code, playerId, token) {
    const room = this.getRoom(code);
    if (!room || room.phase === 'closed') return fail('Sala não encontrada.', 'not_found');
    const p = this._player(room, playerId);
    if (!p || !safeEqual(p.token, token)) return fail('Não foi possível restaurar sua sessão.', 'auth');
    p.online = true;
    this._touch(room);
    return { ok: true, room, player: p };
  }

  resumeHost(code, token) {
    const room = this.getRoom(code);
    if (!room || room.phase === 'closed') return fail('Sala não encontrada.', 'not_found');
    if (!this._hostOk(room, token)) return fail('Credencial de apresentador inválida.', 'auth');
    this._touch(room);
    return { ok: true, room };
  }

  setOnline(code, playerId, online) {
    const room = this.getRoom(code);
    const p = room && this._player(room, playerId);
    if (!p || p.online === online) return;
    p.online = online;
    this._touch(room);
  }

  // ---------- Cronômetro ----------
  elapsed(room, t = this.now()) {
    const r = room.round;
    if (!r || !r.startAt) return 0;
    if (r.endedAt) return r.finalElapsed;
    const ref = r.pausedAt ?? t;
    return Math.max(0, ref - r.startAt - r.pausedTotal);
  }

  timer(room, t = this.now()) {
    const r = room.round;
    const base = { serverNow: t, running: false, elapsedMs: 0, remainingMs: 0, limitMs: 0, countdownMs: 0 };
    if (!r) return base;
    if (room.phase === 'countdown') return { ...base, limitMs: r.limitMs, remainingMs: r.limitMs, countdownMs: Math.max(0, r.countdownEndsAt - t) };
    const el = this.elapsed(room, t);
    return { ...base, running: room.phase === 'playing', elapsedMs: el, limitMs: r.limitMs, remainingMs: Math.max(0, r.limitMs - el) };
  }

  tick() {
    const t = this.now();
    for (const room of [...this.rooms.values()]) {
      const r = room.round;
      if (room.phase === 'countdown' && t >= r.countdownEndsAt) {
        room.phase = 'playing'; r.startAt = r.countdownEndsAt; this._touch(room);
      } else if (room.phase === 'playing' && this.elapsed(room, t) >= r.limitMs) {
        this._finishRound(room, 'tempo');
      }
      const idle = t - room.lastActivity;
      const anyOnline = room.players.some((p) => p.online);
      if ((room.phase === 'closed' && t - room.closedAt > 10 * 60 * 1000) || (!anyOnline && idle > 6 * 3600 * 1000)) {
        this.rooms.delete(room.code);
        for (const k of [...this.trees.keys()]) if (k.startsWith(`${room.code}:`)) this.trees.delete(k);
        this.onChange(null, room.code);
      }
    }
  }

  // ---------- Controles do apresentador ----------
  host(code, token, action, arg) {
    const room = this.getRoom(code);
    if (!room || room.phase === 'closed') return fail('Sala não encontrada.', 'not_found');
    if (!this._hostOk(room, token)) return fail('Ação restrita ao apresentador.', 'auth');
    switch (action) {
      case 'start': return this._start(room);
      case 'pause': return this._pause(room);
      case 'resume': return this._resume(room);
      case 'endRound': return this._endRound(room);
      case 'showRanking': room.showRanking = Boolean(arg); this._touch(room); return { ok: true };
      case 'next': return this._next(room);
      case 'lock': room.locked = Boolean(arg); this._touch(room); return { ok: true };
      case 'lateJoin': room.lateJoin = Boolean(arg); this._touch(room); return { ok: true };
      case 'kick': return this._kick(room, arg);
      case 'close': return this._close(room);
      default: return fail('Ação desconhecida.');
    }
  }

  _start(room) {
    if (room.phase !== 'lobby') return fail('A partida já foi iniciada.');
    if (this._active(room).length < 1) return fail('Aguarde ao menos um participante entrar.');
    return this._beginRound(room, 1);
  }

  _beginRound(room, level) {
    const participants = this._active(room).filter((p) => p.eligibleFrom <= level).map((p) => p.id);
    if (!participants.length) return fail('Nenhum participante apto para esta rodada.');
    const tree = this._tree(room, level);
    const t = this.now();
    room.level = level; room.phase = 'countdown'; room.showRanking = false;
    room.round = {
      level, countdownEndsAt: t + COUNTDOWN_MS, startAt: null, pausedAt: null, pausedTotal: 0,
      limitMs: (this.roundSeconds[level - 1] ?? 180) * 1000, participants, results: [], endedAt: null,
      finalElapsed: 0, endReason: null, targetId: tree.targetId,
    };
    this._touch(room);
    return { ok: true };
  }

  _pause(room) {
    if (room.phase !== 'playing') return fail('Só é possível pausar durante a rodada.');
    room.phase = 'paused'; room.round.pausedAt = this.now(); this._touch(room); return { ok: true };
  }

  _resume(room) {
    if (room.phase !== 'paused') return fail('A partida não está pausada.');
    const r = room.round; r.pausedTotal += this.now() - r.pausedAt; r.pausedAt = null; room.phase = 'playing';
    this._touch(room); return { ok: true };
  }

  _endRound(room) {
    if (room.phase !== 'playing' && room.phase !== 'paused') return fail('Não há rodada em andamento.');
    return this._finishRound(room, 'professor');
  }

  _finishRound(room, reason) {
    const r = room.round; const t = this.now();
    r.finalElapsed = this.elapsed(room, t); // respeita pausas
    r.endedAt = t; r.endReason = reason; r.pausedAt = null;
    room.phase = 'roundEnd';
    room.history[r.level] = r.results.map((x) => ({ ...x }));
    this._touch(room);
    return { ok: true };
  }

  _next(room) {
    if (room.phase !== 'roundEnd') return fail('Encerre a rodada atual antes de avançar.');
    if (room.level >= TOTAL_LEVELS) { room.phase = 'finished'; room.showRanking = true; this._touch(room); return { ok: true, finished: true }; }
    return this._beginRound(room, room.level + 1);
  }

  _kick(room, playerId) {
    const p = this._player(room, String(playerId));
    if (!p) return fail('Participante não encontrado.');
    p.removed = true; p.online = false;
    this._touch(room);
    return { ok: true, kickedId: p.id };
  }

  _close(room) {
    room.phase = 'closed'; room.closedAt = this.now(); this._touch(room); return { ok: true };
  }

  // ---------- Ação do jogador ----------
  openDoc(code, playerId, token, fileId) {
    const room = this.getRoom(code);
    if (!room) return fail('Sala não encontrada.', 'not_found');
    const p = this._player(room, playerId);
    if (!p || !safeEqual(p.token, token)) return fail('Sessão inválida.', 'auth');
    if (room.phase === 'paused') return fail('A partida está pausada.', 'paused');
    if (room.phase !== 'playing') return fail('A rodada não está ativa.', 'inactive');
    const r = room.round;
    if (!r.participants.includes(p.id)) return fail('Você entrou durante esta rodada e jogará a partir da próxima.', 'spectator');
    if (typeof fileId !== 'string' || !FILE_ID.test(fileId)) return fail('Documento inválido.');
    const existing = r.results.find((x) => x.playerId === p.id);
    if (existing) return { ok: true, correct: true, already: true, result: { ...existing }, total: p.total };
    const file = this._findFile(this._tree(room, r.level).root, fileId);
    if (!file) return fail('Documento inexistente.');
    if (fileId !== r.targetId) {
      p.wrongIds ||= {};
      const seen = (p.wrongIds[r.level] ||= []);
      if (!seen.includes(fileId)) { seen.push(fileId); p.wrong[r.level] = seen.length; this._touch(room); } // reabrir o mesmo arquivo não conta de novo
      return { ok: true, correct: false, errors: p.wrong[r.level] || 0 };
    }
    const elapsedMs = this.elapsed(room);
    const place = r.results.length + 1;
    const errors = p.wrong[r.level] || 0;
    const result = { playerId: p.id, nick: p.nick, level: r.level, elapsedMs, place, errors, points: scoreFor(place, errors, this.points, this.errorPenalty) };
    r.results.push(result);
    p.results.push(result);
    p.total += result.points; p.totalMs += elapsedMs;
    const alive = r.participants.every((id) => r.results.some((x) => x.playerId === id));
    if (alive) this._finishRound(room, 'todos'); else this._touch(room);
    return { ok: true, correct: true, result: { ...result }, total: p.total, fileName: file.n };
  }

  _findFile(node, id) {
    for (const ch of node.c || []) {
      if (ch.id === id) return ch;
      if (!ch.id) { const f = this._findFile(ch, id); if (f) return f; }
    }
    return null;
  }

  avatarOf(code, playerId) {
    const room = this.getRoom(code); const p = room && this._player(room, String(playerId));
    if (!p || !p.avatar) return null;
    const v = validateAvatar(p.avatar); return v.bytes ? { mime: v.mime, bytes: v.bytes, av: p.av } : null;
  }

  // ---------- Ranking ----------
  standings(room) {
    const errs = (p) => Object.values(p.wrong || {}).reduce((a, n) => a + n, 0);
    // Pontos (tempo + erros) → menos erros → menor tempo total → ordem de entrada
    const list = this._active(room).slice().sort((a, b) => b.total - a.total || errs(a) - errs(b) || (a.totalMs - b.totalMs) || a.order - b.order);
    return list.map((p, i) => ({
      pos: i + 1, id: p.id, nick: p.nick, av: p.av, total: p.total, totalMs: p.totalMs, errors: errs(p), levelsDone: p.results.length, online: p.online,
      last: p.results.find((x) => x.level === room.level) || null,
    }));
  }

  // ---------- Visões (o que cada papel pode ver) ----------
  _challenge(room, reveal) {
    const r = room.round; if (!r) return null;
    const tree = this._tree(room, r.level); const meta = LEVEL_META[r.level - 1];
    return {
      level: r.level, title: meta.title, difficulty: meta.difficulty, color: meta.color,
      description: tree.description, fileName: r.level <= 5 || reveal ? tree.targetName : null,
    };
  }

  _common(room) {
    const act = this._active(room);
    return {
      code: room.code, phase: room.phase, level: room.level, totalLevels: TOTAL_LEVELS, locked: room.locked, lateJoin: room.lateJoin,
      seq: room.seq, timer: this.timer(room), count: { total: act.length, online: act.filter((p) => p.online).length },
      showRanking: room.showRanking,
    };
  }

  playerView(room, player) {
    const v = this._common(room); const r = room.round;
    const mine = r && r.results.find((x) => x.playerId === player.id);
    const st = this.standings(room);
    const me = st.find((s) => s.id === player.id);
    const inRound = r && r.participants.includes(player.id);
    const ended = ['roundEnd', 'finished'].includes(room.phase);
    return {
      ...v, role: 'player',
      me: { id: player.id, nick: player.nick, av: player.av, total: player.total, totalMs: player.totalMs, errors: r && r.level === room.level ? (player.wrong[r.level] || 0) : 0, totalErrors: me?.errors ?? 0, pos: me?.pos ?? null, levelsDone: player.results.length, eligible: Boolean(inRound), waitingNext: !inRound && room.phase !== 'lobby' && room.phase !== 'finished', result: mine ? { ...mine } : null },
      challenge: ['countdown', 'playing', 'paused', 'roundEnd'].includes(room.phase) ? this._challenge(room, ended) : null,
      progress: r ? { found: r.results.length, of: r.participants.length } : null,
      roundResults: ended && r ? r.results.map((x) => ({ ...x })) : [],
      standings: ended || room.showRanking ? st : st.filter((s) => s.id === player.id),
      tip: ended && r ? TIPS[r.level - 1] : null,
      endReason: ended && r ? r.endReason : null,
      names: room.phase === 'lobby' ? this._active(room).map((p) => ({ id: p.id, nick: p.nick, av: p.av, online: p.online })) : undefined,
    };
  }

  hostView(room) {
    const v = this._common(room); const r = room.round;
    const players = this._active(room).map((p) => {
      const res = r && r.results.find((x) => x.playerId === p.id);
      const inRound = r && r.participants.includes(p.id);
      let status = 'lobby';
      if (r && ['countdown', 'playing', 'paused', 'roundEnd'].includes(room.phase)) status = res ? 'found' : inRound ? 'searching' : 'waiting';
      return { id: p.id, nick: p.nick, av: p.av, online: p.online, status, total: p.total, totalMs: p.totalMs, wrong: r ? (p.wrong[r.level] || 0) : 0, result: res ? { ...res } : null };
    });
    return {
      ...v, role: 'host', players,
      challenge: r ? this._challenge(room, true) : null,
      progress: r ? { found: r.results.length, of: r.participants.length } : null,
      roundResults: r ? r.results.map((x) => ({ ...x })) : [],
      standings: this.standings(room), endReason: r?.endReason ?? null,
      tip: r && room.phase === 'roundEnd' ? TIPS[r.level - 1] : null,
      history: Object.fromEntries(Object.entries(room.history)),
    };
  }

  // ---------- Persistência ----------
  serialize() {
    const savedAt = this.now();
    return [...this.rooms.values()].map((room) => ({
      ...room, savedAt,
      players: room.players.map((p) => ({ ...p })),
    }));
  }

  restore(rooms) {
    const t = this.now();
    for (const room of rooms || []) {
      room.players.forEach((p) => { p.online = false; });
      if (room.phase === 'playing') { room.phase = 'paused'; room.round.pausedAt = Math.min(t, room.savedAt ?? t); } // a queda não consome tempo de jogo
      if (room.phase === 'countdown') { // recomeça a contagem
        room.round.countdownEndsAt = t + COUNTDOWN_MS;
      }
      room.lastActivity = t;
      this.rooms.set(room.code, room);
    }
  }
}

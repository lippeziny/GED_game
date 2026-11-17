import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { GameEngine } from '../server/engine.js';
import { registerSockets } from '../server/sockets.js';

// Socket.IO simulado: mesma superfície usada pelo adaptador (on/emit/handshake/data).
class FakeSocket {
  constructor(io, ip = '1.1.1.1') { this.id = `s${Math.random().toString(36).slice(2)}`; this.io = io; this.handshake = { address: ip, headers: {} }; this.data = {}; this.h = {}; this.inbox = []; }
  on(ev, fn) { this.h[ev] = fn; }
  emit(ev, payload) { this.inbox.push([ev, payload]); }
  call(ev, payload) { return new Promise((res) => { this.h[ev](payload, res); }); }
  last(ev) { return [...this.inbox].reverse().find(([e]) => e === ev)?.[1]; }
  drop() { this.h.disconnect?.(); }
}
class FakeIO { constructor() { this.cb = null; } on(_e, cb) { this.cb = cb; } connect(ip) { const s = new FakeSocket(this, ip); this.cb(s); return s; } }
const wait = (ms = 80) => new Promise((r) => setTimeout(r, ms));

function boot() {
  const io = new FakeIO(); const engine = new GameEngine();
  registerSockets(io, engine, { log: { error() {} } });
  return { io, engine };
}

test('fluxo completo via eventos: criar, entrar, iniciar, achar, ranking, pausar, fechar', async () => {
  const { io, engine } = boot();
  const host = io.connect(); const c = await host.call('host:create', {});
  assert.ok(c.ok); const code = c.code;
  const players = [];
  for (const nick of ['Ana', 'Beto', 'Caio']) { const s = io.connect(); const r = await s.call('player:join', { code, nick }); assert.ok(r.ok, r.error); players.push({ s, ...r }); }
  assert.equal((await io.connect().call('player:join', { code, nick: 'ana' })).code, 'duplicate');
  await wait();
  assert.equal(host.last('state').count.online, 3);

  // jogador tentando ações de professor
  for (const a of ['start', 'pause', 'endRound', 'next', 'close']) assert.equal((await players[0].s.call('host:action', { action: a })).code, 'auth');
  assert.equal((await players[0].s.call('host:action', { action: 'start', hostToken: c.hostToken })).code, 'auth'); // token no payload não vale

  assert.ok((await host.call('host:action', { action: 'start' })).ok);
  await wait();
  for (const p of players) { assert.ok(p.s.last('tree'), 'árvore enviada'); assert.equal(JSON.stringify(p.s.last('tree')).includes('targetId'), false); }
  engine.now = () => Date.now() + 3100; engine.tick(); await wait(); // avança relógio
  const room = engine.getRoom(code); assert.equal(room.phase, 'playing');
  const tgt = engine._tree(room, 1).targetId;
  const wrongId = (() => { let id; const w = (n) => n.c.forEach((x) => { if (!id && x.id && x.id !== tgt) id = x.id; else if (!x.id) w(x); }); w(engine._tree(room, 1).root); return id; })();
  assert.equal((await players[0].s.call('doc:open', { fileId: wrongId })).correct, false);
  assert.equal((await players[0].s.call('doc:open', { fileId: 'zzz; DROP' })).ok, false);
  const r1 = await players[1].s.call('doc:open', { fileId: tgt }); assert.equal(r1.result.points, 1000);
  await wait(); assert.equal(host.last('state').progress.found, 1);
  assert.equal(players[2].s.last('state').standings.length, 1); // não vê o ranking alheio durante a rodada
  assert.ok((await host.call('host:action', { action: 'pause' })).ok);
  await wait(); assert.equal(players[0].s.last('state').phase, 'paused');
  assert.ok((await host.call('host:action', { action: 'resume' })).ok);
  assert.ok((await host.call('host:action', { action: 'endRound' })).ok);
  await wait(); assert.equal(players[2].s.last('state').phase, 'roundEnd');
  assert.ok(players[2].s.last('state').tip);
  assert.ok((await host.call('host:action', { action: 'close' })).ok);
  await wait(); assert.ok(players[0].s.last('closed') !== undefined || players[0].s.inbox.some(([e]) => e === 'closed'));
});

test('reconexão do jogador e do professor em novos sockets', async () => {
  const { io, engine } = boot();
  const host = io.connect(); const { code, hostToken } = await host.call('host:create', {});
  const p = io.connect(); const j = await p.call('player:join', { code, nick: 'Ana' });
  p.drop(); await wait();
  assert.equal(engine.getRoom(code).players[0].online, false);
  const p2 = io.connect(); const back = await p2.call('player:resume', { code, playerId: j.playerId, token: j.token });
  assert.ok(back.ok); assert.equal(engine.getRoom(code).players[0].online, true);
  assert.equal((await io.connect().call('player:resume', { code, playerId: j.playerId, token: 'falso' })).code, 'auth');
  host.drop(); const h2 = io.connect();
  assert.ok((await h2.call('host:resume', { code, hostToken })).ok);
  assert.equal((await io.connect().call('host:resume', { code, hostToken: 'x' })).code, 'auth');
  assert.ok((await h2.call('host:action', { action: 'lock', arg: true })).ok);
  assert.equal((await io.connect().call('player:join', { code, nick: 'Outro' })).code, 'locked');
});

test('limitação de tentativas: PIN inválido repetido bloqueia o endereço', async () => {
  const { io } = boot(); const s = io.connect('9.9.9.9'); let blocked = false;
  for (let i = 0; i < 20; i += 1) { const r = await io.connect('9.9.9.9').call('player:join', { code: '000000', nick: 'Zé' }); if (r.code === 'rate') blocked = true; }
  assert.ok(blocked); void s;
});

test('limitação de taxa por socket e entradas malformadas', async () => {
  const { io } = boot(); const s = io.connect(); let limited = false;
  for (let i = 0; i < 60; i += 1) { const r = await s.call('doc:open', 12345); if (r.code === 'rate') limited = true; }
  assert.ok(limited);
  const s2 = io.connect(); for (const bad of [null, 'x', 7, [], { code: {}, nick: [] }]) { const r = await s2.call('player:join', bad); assert.equal(r.ok, false); }
});

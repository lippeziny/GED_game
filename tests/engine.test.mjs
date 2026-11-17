import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, normalizeNick } from '../server/engine.js';
import { buildLevel, countNodes } from '../server/tree.js';
import { pointsForPlace } from '../shared/constants.js';

function setup(opts = {}) {
  const clock = { t: 1_000_000 };
  const eng = new GameEngine({ now: () => clock.t, ...opts });
  const { room, hostToken } = eng.createRoom();
  const join = (nick) => { const r = eng.joinRoom(room.code, nick); assert.ok(r.ok, r.error); return r; };
  const advance = (ms) => { clock.t += ms; eng.tick(); };
  const go = () => { assert.ok(eng.host(room.code, hostToken, 'start').ok); advance(3000); };
  const target = (lvl = room.level) => eng._tree(room, lvl).targetId;
  const wrong = (lvl = room.level) => {
    const t = eng._tree(room, lvl); let id = null;
    const w = (n) => (n.c || []).forEach((c) => { if (!id && c.id && c.id !== t.targetId) id = c.id; else if (!c.id) w(c); });
    w(t.root); return id;
  };
  return { eng, clock, room, hostToken, join, advance, go, target, wrong };
}

test('1-3. sessão com PIN de 6 dígitos únicos e credencial de apresentador', () => {
  const eng = new GameEngine();
  const pins = new Set();
  for (let i = 0; i < 50; i += 1) { const r = eng.createRoom(); assert.match(r.room.code, /^\d{6}$/); assert.ok(r.hostToken.length >= 32); pins.add(r.room.code); }
  assert.equal(pins.size, 50);
});

test('5-6. entrada de vários jogadores; apelidos validados e duplicados recusados', () => {
  const s = setup();
  for (let i = 0; i < 30; i += 1) s.join(`Aluno ${i}`);
  assert.equal(s.eng.joinRoom(s.room.code, 'aluno 3').code, 'duplicate');
  assert.equal(s.eng.joinRoom(s.room.code, 'ALUNO 3 ').code, 'duplicate');
  assert.equal(s.eng.joinRoom(s.room.code, 'Álvaro').ok, true);
  assert.equal(s.eng.joinRoom(s.room.code, 'alvaro').code, 'duplicate'); // sem acento
  for (const bad of ['', ' ', 'a', 'x'.repeat(21), '<script>', null]) assert.equal(s.eng.joinRoom(s.room.code, bad).code, 'nick');
  assert.equal(s.eng.joinRoom('000000', 'Fulano').code, 'not_found');
  assert.equal(normalizeNick('  Ana   Paula ').nick, 'Ana Paula');
});

test('segurança: jogador não controla a sessão; token errado é recusado', () => {
  const s = setup(); const p = s.join('Ana');
  for (const a of ['start', 'pause', 'resume', 'endRound', 'next', 'lock', 'close', 'kick', 'showRanking']) {
    assert.equal(s.eng.host(s.room.code, p.token, a, p.player.id).code, 'auth', a);
    assert.equal(s.eng.host(s.room.code, 'x', a).code, 'auth');
  }
  assert.equal(s.room.phase, 'lobby');
  assert.equal(s.eng.openDoc(s.room.code, p.player.id, 'errado', 'f1a').code, 'auth');
});

test('7-8. início sincronizado: contagem de 3 s e cronômetro único do servidor', () => {
  const s = setup(); s.join('Ana'); s.join('Beto');
  assert.ok(s.eng.host(s.room.code, s.hostToken, 'start').ok);
  assert.equal(s.room.phase, 'countdown');
  assert.equal(s.eng.timer(s.room).countdownMs, 3000);
  s.advance(2999); assert.equal(s.room.phase, 'countdown');
  s.advance(1); assert.equal(s.room.phase, 'playing');
  assert.equal(s.eng.timer(s.room).elapsedMs, 0);
  s.advance(5000); assert.equal(s.eng.timer(s.room).elapsedMs, 5000);
});

test('10-14. documento correto/incorreto, tempo, pontuação e ranking', () => {
  const s = setup(); const a = s.join('Ana'); const b = s.join('Beto'); const c = s.join('Caio');
  s.go();
  const w = s.eng.openDoc(s.room.code, a.player.id, a.token, s.wrong());
  assert.deepEqual([w.ok, w.correct], [true, false]);
  assert.equal(a.player.total, 0);
  s.advance(18420);
  const ra = s.eng.openDoc(s.room.code, a.player.id, a.token, s.target());
  assert.equal(ra.result.elapsedMs, 18420); assert.equal(ra.result.place, 1); assert.equal(ra.result.points, 1000);
  s.advance(1000);
  const rb = s.eng.openDoc(s.room.code, b.player.id, b.token, s.target());
  assert.equal(rb.result.place, 2); assert.equal(rb.result.points, 900);
  const st = s.eng.standings(s.room);
  assert.deepEqual(st.map((x) => [x.nick, x.total]), [['Ana', 1000], ['Beto', 900], ['Caio', 0]]);
  assert.equal(s.room.phase, 'playing'); // Caio ainda procura
  assert.equal(c.player.total, 0);
});

test('sem pontuação duplicada: repetir a abertura não soma de novo', () => {
  const s = setup(); const a = s.join('Ana'); s.join('Beto'); s.go(); s.advance(4000);
  const r1 = s.eng.openDoc(s.room.code, a.player.id, a.token, s.target());
  const r2 = s.eng.openDoc(s.room.code, a.player.id, a.token, s.target());
  assert.equal(r2.already, true); assert.equal(a.player.total, 1000); assert.equal(s.room.round.results.length, 1);
  assert.equal(r1.result.elapsedMs, r2.result.elapsedMs);
});

test('15. pausa e retomada preservam o tempo efetivo; ações bloqueadas na pausa', () => {
  const s = setup(); const a = s.join('Ana'); s.go();
  s.advance(10_000);
  assert.ok(s.eng.host(s.room.code, s.hostToken, 'pause').ok);
  s.advance(60_000);
  assert.equal(s.eng.timer(s.room).elapsedMs, 10_000);
  assert.equal(s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()).code, 'paused');
  assert.ok(s.eng.host(s.room.code, s.hostToken, 'resume').ok);
  s.advance(5_000);
  assert.equal(s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()).result.elapsedMs, 15_000);
});

test('16. encerramento administrativo impede novas conclusões', () => {
  const s = setup(); const a = s.join('Ana'); const b = s.join('Beto'); s.go(); s.advance(3000);
  s.eng.openDoc(s.room.code, a.player.id, a.token, s.target());
  assert.ok(s.eng.host(s.room.code, s.hostToken, 'endRound').ok);
  assert.equal(s.room.phase, 'roundEnd');
  assert.equal(s.eng.openDoc(s.room.code, b.player.id, b.token, s.target()).code, 'inactive');
  assert.equal(b.player.total, 0);
});

test('tempo limite encerra a rodada automaticamente (descontando pausa)', () => {
  const s = setup(); s.join('Ana'); s.go();
  s.advance(80_000); s.eng.host(s.room.code, s.hostToken, 'pause'); s.advance(500_000); s.eng.host(s.room.code, s.hostToken, 'resume');
  assert.equal(s.room.phase, 'playing'); s.advance(9_999); assert.equal(s.room.phase, 'playing');
  s.advance(1); assert.equal(s.room.phase, 'roundEnd'); assert.equal(s.room.round.endReason, 'tempo');
});

test('17-23. dez níveis consecutivos, pontos acumulados, resultados preservados, pódio e encerramento', () => {
  const s = setup(); const ps = ['Ana', 'Beto', 'Caio', 'Duda', 'Edu', 'Fabi', 'Gui'].map((n) => s.join(n));
  assert.equal(s.eng.host(s.room.code, s.hostToken, 'next').ok, false);
  s.go();
  for (let lvl = 1; lvl <= 10; lvl += 1) {
    assert.equal(s.room.level, lvl);
    const order = lvl % 2 ? ps : [...ps].reverse();
    order.forEach((p, i) => { s.advance(1000 + i * 10); assert.ok(s.eng.openDoc(s.room.code, p.player.id, p.token, s.target()).ok); });
    assert.equal(s.room.phase, 'roundEnd'); // todos concluíram -> encerra sozinho
    assert.equal(Object.keys(s.room.history).length, lvl); // histórico nunca é apagado
    if (lvl < 10) { assert.ok(s.eng.host(s.room.code, s.hostToken, 'next').ok); s.advance(3000); }
  }
  assert.ok(s.eng.host(s.room.code, s.hostToken, 'next').finished);
  assert.equal(s.room.phase, 'finished');
  const st = s.eng.standings(s.room);
  assert.equal(st.length, 7);
  assert.ok(st.every((x) => x.levelsDone === 10));
  assert.equal(st.reduce((a, x) => a + x.total, 0), 10 * [1000, 900, 800, 700, 600, 550, 500].reduce((a, b) => a + b, 0));
  for (let i = 1; i < st.length; i += 1) assert.ok(st[i - 1].total >= st[i].total);
  assert.equal(s.eng.host(s.room.code, s.hostToken, 'close').ok, true);
  assert.equal(s.room.phase, 'closed');
  assert.equal(s.eng.joinRoom(s.room.code, 'Tarde').code, 'not_found');
});

test('desempate por menor tempo total e depois por ordem de entrada', () => {
  const s = setup(); const a = s.join('Ana'); const b = s.join('Beto'); const c = s.join('Caio'); s.go();
  s.advance(5000); s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()); // 1º: 1000
  s.advance(1);    s.eng.openDoc(s.room.code, b.player.id, b.token, s.target());
  s.eng.host(s.room.code, s.hostToken, 'endRound'); s.eng.host(s.room.code, s.hostToken, 'next'); s.advance(3000);
  s.advance(2000); s.eng.openDoc(s.room.code, b.player.id, b.token, s.target()); // Beto 1º: 900+1000
  s.advance(5);    s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()); // Ana 2º: 1000+900
  assert.equal(a.player.total, b.player.total);
  assert.ok(b.player.totalMs < a.player.totalMs);
  assert.equal(s.eng.standings(s.room)[0].nick, 'Beto');
  assert.equal(c.player.total, 0); // quem não concluiu não pontua
});

test('20-21. entrada tardia só joga da próxima rodada; bloqueio recusa novos', () => {
  const s = setup(); const a = s.join('Ana'); s.go(); s.advance(2000);
  const late = s.eng.joinRoom(s.room.code, 'Tardio'); assert.ok(late.ok && late.late);
  assert.equal(s.eng.openDoc(s.room.code, late.player.id, late.token, s.target()).code, 'spectator');
  assert.equal(late.player.total, 0);
  assert.equal(s.eng.playerView(s.room, late.player).me.waitingNext, true);
  s.eng.host(s.room.code, s.hostToken, 'lock', true);
  assert.equal(s.eng.joinRoom(s.room.code, 'Bloqueado').code, 'locked');
  s.eng.host(s.room.code, s.hostToken, 'lock', false);
  s.eng.host(s.room.code, s.hostToken, 'lateJoin', false);
  assert.equal(s.eng.joinRoom(s.room.code, 'Outro').code, 'started');
  s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()); // Ana conclui; tardio não conta na rodada
  assert.equal(s.room.phase, 'roundEnd');
  s.eng.host(s.room.code, s.hostToken, 'next'); s.advance(3000);
  assert.ok(s.eng.openDoc(s.room.code, late.player.id, late.token, s.target()).ok); // próxima rodada: pode pontuar
  assert.equal(late.player.total, 1000);
});

test('19. desconexão/reconexão restaura estado e não duplica pontos', () => {
  const s = setup(); const a = s.join('Ana'); const b = s.join('Beto'); s.go(); s.advance(4000);
  s.eng.openDoc(s.room.code, a.player.id, a.token, s.target());
  s.eng.setOnline(s.room.code, a.player.id, false);
  assert.equal(s.eng.hostView(s.room).players.find((p) => p.nick === 'Ana').online, false);
  assert.equal(a.player.total, 1000);
  const back = s.eng.resumePlayer(s.room.code, a.player.id, a.token);
  assert.ok(back.ok); assert.equal(s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()).already, true);
  assert.equal(a.player.total, 1000);
  assert.equal(s.eng.resumePlayer(s.room.code, a.player.id, 'falso').code, 'auth');
  assert.equal(s.eng.playerView(s.room, a.player).timer.elapsedMs, 4000); // cronômetro oficial continua
  assert.equal(s.room.phase, 'playing'); void b;
});

test('18. persistência: serialização e restauração (queda do servidor pausa a rodada)', () => {
  const s = setup(); const a = s.join('Ana'); s.join('Beto'); s.go(); s.advance(7000);
  s.eng.openDoc(s.room.code, a.player.id, a.token, s.target());
  const snap = JSON.parse(JSON.stringify(s.eng.serialize()));
  const eng2 = new GameEngine({ now: () => s.clock.t + 120_000 }); eng2.restore(snap);
  const r2 = eng2.getRoom(s.room.code);
  assert.equal(r2.phase, 'paused'); assert.equal(r2.players.find((p) => p.nick === 'Ana').total, 1000);
  assert.ok(r2.players.every((p) => !p.online));
  assert.equal(eng2.timer(r2).elapsedMs, 7000); // queda não consome tempo de jogo
  assert.ok(eng2.resumePlayer(r2.code, a.player.id, a.token).ok);
  assert.ok(eng2.host(r2.code, s.hostToken, 'resume').ok);
});

test('visões: jogador não recebe alvo oculto nem dados de terceiros; host vê tudo', () => {
  const s = setup(); const a = s.join('Ana'); s.join('Beto'); s.go();
  s.room.level = 6; s.room.round.level = 6; // nível 6+ não revela o nome do arquivo
  const pv = s.eng.playerView(s.room, a.player);
  assert.equal(pv.challenge.fileName, null); assert.ok(pv.challenge.description.length > 20);
  assert.equal(JSON.stringify(pv).includes('targetId'), false);
  assert.equal(pv.standings.length, 1); assert.equal(pv.roundResults.length, 0);
  assert.equal(s.eng.hostView(s.room).players.length, 2);
});

test('expulsar jogador libera o apelido e invalida a sessão', () => {
  const s = setup(); const a = s.join('Ana'); s.eng.host(s.room.code, s.hostToken, 'kick', a.player.id);
  assert.equal(s.eng.resumePlayer(s.room.code, a.player.id, a.token).code, 'auth');
  assert.ok(s.eng.joinRoom(s.room.code, 'Ana').ok);
});

test('pontuação configurável', () => {
  const s = setup({ points: [500, 300] });
  const a = s.join('Ana'); const b = s.join('Beto'); s.go(); s.advance(1000);
  assert.equal(s.eng.openDoc(s.room.code, a.player.id, a.token, s.target()).result.points, 500);
  assert.equal(s.eng.openDoc(s.room.code, b.player.id, b.token, s.target()).result.points, 300);
  assert.equal(pointsForPlace(6), 550); assert.equal(pointsForPlace(40), 100);
});

test('árvores: dificuldade crescente e alvo único e sem ambiguidade em várias sementes', () => {
  let prev = 0;
  for (let lvl = 1; lvl <= 10; lvl += 1) {
    for (const seed of [1, 7, 99, 12345]) {
      const t = buildLevel(lvl, seed); let hits = 0; const ids = new Set();
      const w = (n) => (n.c || []).forEach((c) => { if (c.id) { ids.add(c.id); if (c.n === t.targetName) hits += 1; } else w(c); });
      w(t.root);
      assert.equal(hits, 1, `nível ${lvl} seed ${seed}`);
      assert.ok(ids.has(t.targetId));
    }
    const c = countNodes(buildLevel(lvl, 1).root);
    assert.ok(c.files > prev, `nível ${lvl} deve ter mais arquivos`); prev = c.files;
  }
});

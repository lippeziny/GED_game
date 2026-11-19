import test from 'node:test';
import assert from 'node:assert/strict';
import { searchImages, fetchThumb, cleanQuery } from '../server/images.js';
import { GameEngine, validateAvatar } from '../server/engine.js';

const UUID = '3f2c1a9e-1b2c-4d5e-8f90-a1b2c3d4e5f6';
const resp = (body, { ok = true, type = 'application/json' } = {}) => ({ ok, status: ok ? 200 : 500, json: async () => body, arrayBuffer: async () => Buffer.from(body), headers: { get: () => type } });

test('busca: Openverse mapeia resultados para URLs do nosso proxy e descarta ids inválidos', async () => {
  let called;
  const f = async (url) => { called = url; return resp({ results: [{ id: UUID, title: 'Gato', creator: 'Ana', license: 'by', license_version: '4.0' }, { id: '../../etc', title: 'x' }] }); };
  const r = await searchImages('gato <script>', { f });
  assert.ok(r.ok); assert.equal(r.results.length, 1);
  assert.equal(r.results[0].src, `/api/imagem?p=ov&r=${UUID}`); assert.match(r.results[0].credit, /Ana · BY 4.0/);
  assert.ok(called.includes('mature=false')); assert.ok(!called.includes('%3C') && !called.includes('<'));
  assert.equal(cleanQuery('  a  <b>  '), 'a b');
  assert.equal((await searchImages('a', { f })).ok, false);
});

test('busca: falha do provedor vira mensagem amigável; Wikimedia só com host permitido', async () => {
  assert.equal((await searchImages('gato', { f: async () => { throw new Error('rede'); } })).ok, false);
  const f = async () => resp({ query: { pages: { 1: { pageid: 1, title: 'File:Gato.jpg', imageinfo: [{ thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Gato.jpg/500px-Gato.jpg', extmetadata: { LicenseShortName: { value: 'CC BY-SA 4.0' } } }] }, 2: { pageid: 2, title: 'File:Mau.jpg', imageinfo: [{ thumburl: 'https://evil.example/x.jpg' }] } } } });
  const r = await searchImages('gato', { f, providers: ['wikimedia'] });
  assert.equal(r.results.length, 1); assert.ok(r.results[0].src.startsWith('/api/imagem?p=wm&r=%2Fwikipedia%2Fcommons%2Fthumb'));
});

test('proxy de miniatura: hosts fixos, tipo e tamanho validados', async () => {
  const urls = []; const img = (type, n = 10) => async (u) => { urls.push(u); return resp(Buffer.alloc(n, 1).toString('latin1'), { type }); };
  assert.equal((await fetchThumb('ov', UUID, { f: img('image/jpeg') })).mime, 'image/jpeg'); assert.equal(urls[0], `https://api.openverse.org/v1/images/${UUID}/thumb/`);
  assert.equal((await fetchThumb('ov', 'http://evil', { f: img('image/jpeg') })).status, 400);
  assert.equal((await fetchThumb('wm', '/wikipedia/commons/../../etc/passwd', { f: img('image/jpeg') })).status, 400);
  assert.equal((await fetchThumb('wm', '/wikipedia/commons/thumb/a/ab/G.jpg/500px-G.jpg', { f: img('image/jpeg') })).mime, 'image/jpeg');
  assert.equal((await fetchThumb('ov', UUID, { f: img('text/html') })).status, 415);
  assert.equal((await fetchThumb('ov', UUID, { f: img('image/png', 4 * 1024 * 1024) })).status, 413);
});

const jpeg = (n = 200) => `data:image/jpeg;base64,${Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, 7)]).toString('base64')}`;
test('foto do jogador: formato, assinatura e tamanho validados; visão só expõe o selo', () => {
  assert.equal(validateAvatar(jpeg()).avatar !== null, true);
  for (const bad of ['data:image/svg+xml;base64,PHN2Zz4=', 'data:image/jpeg;base64,AAAA', 'http://x/y.jpg', jpeg(60000), 'data:image/png;base64,/9j/4AAQ']) assert.ok(validateAvatar(bad).error, String(bad).slice(0, 30));
  const eng = new GameEngine(); const { room, hostToken } = eng.createRoom();
  assert.equal(eng.joinRoom(room.code, 'Ana', 'lixo').code, 'avatar');
  const a = eng.joinRoom(room.code, 'Ana', jpeg()); assert.ok(a.ok); assert.ok(a.player.av);
  const b = eng.joinRoom(room.code, 'Beto'); assert.ok(b.ok); assert.equal(b.player.av, null);
  const view = eng.playerView(room, a.player); assert.equal(JSON.stringify(view).includes('base64'), false);
  assert.equal(eng.hostView(room).players.find((p) => p.nick === 'Ana').av, a.player.av);
  assert.equal(eng.avatarOf(room.code, a.player.id).mime, 'image/jpeg'); assert.equal(eng.avatarOf(room.code, b.player.id), null);
  eng.host(room.code, hostToken, 'kick', a.player.id); assert.equal(eng.avatarOf(room.code, a.player.id), null);
});

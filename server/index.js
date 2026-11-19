import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { Server } from 'socket.io';
import { GameEngine } from './engine.js';
import { FileStore, NullStore } from './store.js';
import { registerSockets } from './sockets.js';
import { searchImages, fetchThumb } from './images.js';
import { KeyedLimiter } from './ratelimit.js';
import { DEFAULT_POINTS, ERROR_PENALTY } from '../shared/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || ''; // só necessário se o front-end estiver em outro domínio
const trustProxy = process.env.TRUST_PROXY ? process.env.TRUST_PROXY === '1' : isProd;

function parsePoints(value) {
  const list = String(value || '').split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n) && n >= 0);
  return list.length ? list : DEFAULT_POINTS;
}

const app = express();
if (trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  next();
});
const httpServer = createServer(app);
const io = new Server(httpServer, {
  serveClient: false, pingInterval: 20000, pingTimeout: 20000, maxHttpBufferSize: 1e5,
  perMessageDeflate: { threshold: 1024 },
  cors: CLIENT_ORIGIN ? { origin: CLIENT_ORIGIN.split(',').map((s) => s.trim()) } : undefined,
});

const penalty = Number(process.env.PENALIDADE_POR_ERRO);
const engine = new GameEngine({ points: parsePoints(process.env.PONTOS_POR_COLOCACAO), errorPenalty: Number.isFinite(penalty) && penalty >= 0 && process.env.PENALIDADE_POR_ERRO ? penalty : ERROR_PENALTY });
const store = process.env.PERSISTENCE === 'off' ? new NullStore() : new FileStore(DATA_DIR);
engine.restore(store.load());
registerSockets(io, engine, { store, trustProxy });

setInterval(() => engine.tick(), 250).unref();
// Salva periodicamente enquanto houver rodada em andamento (o horário salvo limita o tempo "perdido" numa queda).
setInterval(() => { if ([...engine.rooms.values()].some((r) => r.phase === 'playing')) store.schedule(() => engine.serialize()); }, 5000).unref();

// ---- Foto do jogador e busca de imagens ----
const imageProviders = String(process.env.IMAGENS_PROVEDORES || 'openverse').split(',').map((x) => x.trim()).filter(Boolean);
const searchOn = process.env.IMAGENS_BUSCA !== 'off';
const searchLimit = new KeyedLimiter(40, 10 * 60 * 1000);
const thumbLimit = new KeyedLimiter(400, 10 * 60 * 1000);
app.get('/api/imagens', async (req, res) => {
  if (!searchOn) return res.status(503).json({ ok: false, error: 'A busca de imagens está desativada. Envie uma foto do aparelho.' });
  if (!searchLimit.take(req.ip)) return res.status(429).json({ ok: false, error: 'Muitas buscas seguidas. Aguarde um pouco.' });
  const r = await searchImages(String(req.query.q || ''), { providers: imageProviders });
  res.status(r.ok ? 200 : 502).json(r);
});
app.get('/api/imagem', async (req, res) => {
  if (!searchOn || !thumbLimit.take(req.ip)) return res.status(429).end();
  const r = await fetchThumb(String(req.query.p || ''), String(req.query.r || ''));
  if (r.error) return res.status(r.status).type('text').send(r.error);
  res.set({ 'Content-Type': r.mime, 'Cache-Control': 'public, max-age=86400' }).send(r.bytes);
});
app.get('/api/avatar/:code/:id', (req, res) => {
  const a = engine.avatarOf(req.params.code, req.params.id);
  if (!a) return res.status(404).end();
  res.set({ 'Content-Type': a.mime, 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' }).send(a.bytes);
});

const distPath = path.resolve(__dirname, '../dist');
const indexHtml = path.join(distPath, 'index.html');
app.get('/health', (_req, res) => {
  const buildReady = !isProd || existsSync(indexHtml);
  res.status(buildReady ? 200 : 503).json({ ok: buildReady, service: 'drive-hunt-ged', buildReady, rooms: engine.rooms.size, persistence: store.ok === false ? 'indisponível' : store instanceof NullStore ? 'desligada' : 'arquivo' });
});

if (isProd) {
  app.use(express.static(distPath, { maxAge: '1h', index: 'index.html' }));
  app.get('*', (_req, res) => {
    if (!existsSync(indexHtml)) return res.status(503).type('text').send('Drive Hunt GED: o front-end ainda não foi compilado. Execute "npm run build".');
    return res.sendFile(indexHtml);
  });
}

function shutdown() { store.flush?.(); process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);

httpServer.listen(PORT, '0.0.0.0', () => console.log(`Drive Hunt GED ativo na porta ${PORT} (${isProd ? 'produção' : 'desenvolvimento'}; dados em ${DATA_DIR})`));

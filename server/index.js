import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { Server } from 'socket.io';
import { GameEngine } from './engine.js';
import { FileStore, NullStore } from './store.js';
import { registerSockets } from './sockets.js';
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

import { io } from 'socket.io-client';

// Reconexão automática com recuo progressivo (0,5 s → 5 s), sem limite de tentativas.
export const socket = io({
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.4,
  timeout: 10000,
});

export function emitAck(event, payload = {}, timeoutMs = 8000) {
  return new Promise((resolve) => {
    if (!socket.connected) return resolve({ ok: false, error: 'Sem conexão com o servidor. Aguarde a reconexão.', code: 'offline' });
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve({ ok: false, error: 'O servidor demorou a responder. Tente novamente.', code: 'timeout' }); } }, timeoutMs);
    socket.emit(event, payload, (res) => { if (done) return; done = true; clearTimeout(timer); resolve(res || { ok: false, error: 'Resposta inválida do servidor.' }); });
  });
}

const KEY = 'drive-hunt-ged.session';
export const session = {
  load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* armazenamento indisponível */ } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

import { useCallback, useEffect, useRef, useState } from 'react';
import { socket, emitAck, session } from '../services/socket.js';

export function useGame() {
  const [connected, setConnected] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [sess, setSess] = useState(() => session.load());
  const [view, setView] = useState(null);
  const [tree, setTree] = useState(null);
  const [notice, setNotice] = useState('');
  const [ended, setEnded] = useState(null); // 'closed' | 'kicked'
  const sessRef = useRef(sess);
  const stamp = useRef(0);
  const noticeTimer = useRef(null);
  sessRef.current = sess;

  const toast = useCallback((m) => { setNotice(m); clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => setNotice(''), 4000); }, []);

  const resume = useCallback(async () => {
    const s = sessRef.current; if (!s) return;
    const res = s.role === 'host' ? await emitAck('host:resume', { code: s.code, hostToken: s.hostToken }) : await emitAck('player:resume', { code: s.code, playerId: s.playerId, token: s.token });
    if (res.ok) { stamp.current = performance.now(); setView(res.view); return; }
    if (['auth', 'not_found'].includes(res.code)) { session.clear(); setSess(null); setView(null); setTree(null); toast('Sua sessão anterior não está mais disponível.'); }
  }, [toast]);

  useEffect(() => {
    const onConnect = () => { setConnected(true); setAttempts(0); resume(); };
    const onDisc = () => setConnected(false);
    const onState = (v) => { stamp.current = performance.now(); setView(v); };
    const onTree = (t) => setTree(t);
    const onEnd = (kind) => () => { setEnded(kind); session.clear(); setSess(null); };
    const onAttempt = (n) => setAttempts(n);
    const closed = onEnd('closed'); const kicked = onEnd('kicked');
    socket.on('connect', onConnect); socket.on('disconnect', onDisc); socket.on('state', onState); socket.on('tree', onTree);
    socket.on('closed', closed); socket.on('kicked', kicked); socket.io.on('reconnect_attempt', onAttempt);
    socket.connect();
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisc); socket.off('state', onState); socket.off('tree', onTree); socket.off('closed', closed); socket.off('kicked', kicked); socket.io.off('reconnect_attempt', onAttempt); socket.disconnect(); };
  }, [resume]);

  const createRoom = useCallback(async () => {
    const r = await emitAck('host:create');
    if (!r.ok) { toast(r.error); return r; }
    const s = { role: 'host', code: r.code, hostToken: r.hostToken }; session.save(s); setSess(s); stamp.current = performance.now(); setView(r.view); setEnded(null);
    return r;
  }, [toast]);

  const join = useCallback(async (code, nick) => {
    const r = await emitAck('player:join', { code, nick });
    if (!r.ok) return r;
    const s = { role: 'player', code: r.code, playerId: r.playerId, token: r.token, nick }; session.save(s); setSess(s); stamp.current = performance.now(); setView(r.view); setEnded(null);
    return r;
  }, []);

  const hostAction = useCallback(async (action, arg) => { const r = await emitAck('host:action', { action, arg }); if (!r.ok) toast(r.error); return r; }, [toast]);
  const openDoc = useCallback((fileId) => emitAck('doc:open', { fileId }), []);
  const leave = useCallback(() => { session.clear(); setSess(null); setView(null); setTree(null); setEnded(null); socket.disconnect(); socket.connect(); }, []);

  return { connected, attempts, sess, view, tree, stamp, notice, ended, toast, createRoom, join, hostAction, openDoc, leave };
}

// Cronômetro local ancorado no instante oficial enviado pelo servidor.
export function useTimer(view, stamp) {
  const [, force] = useState(0);
  const phase = view?.phase;
  useEffect(() => {
    if (!['countdown', 'playing'].includes(phase)) return undefined;
    const id = setInterval(() => force((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [phase]);
  if (!view) return { elapsedMs: 0, remainingMs: 0, countdownMs: 0 };
  const t = view.timer; const drift = performance.now() - stamp.current;
  if (phase === 'countdown') return { elapsedMs: 0, remainingMs: t.limitMs, countdownMs: Math.max(0, t.countdownMs - drift) };
  if (phase === 'playing') { const el = t.elapsedMs + drift; return { elapsedMs: el, remainingMs: Math.max(0, t.limitMs - el), countdownMs: 0 }; }
  return { elapsedMs: t.elapsedMs, remainingMs: t.remainingMs, countdownMs: 0 };
}

import { useEffect, useState } from 'react';
import { Bell, Power } from 'lucide-react';
import { useGame, useTimer } from './hooks/useGame.js';
import { TopBar, useA11y } from './components/Chrome.jsx';
import Home from './pages/Home.jsx';
import Host from './pages/Host.jsx';
import Player from './pages/Player.jsx';

const pinFromHash = () => (window.location.hash.match(/\/(?:entrar|sala)\/(\d{6})/) || [])[1] || '';

export default function App() {
  const game = useGame();
  const { view, sess, ended } = game;
  const timer = useTimer(view, game.stamp);
  const [a11y, setA11y] = useA11y();
  const [preset, setPreset] = useState(pinFromHash());
  const [err, setErr] = useState('');
  useEffect(() => { const h = () => setPreset(pinFromHash()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  useEffect(() => { document.title = view ? `Drive Hunt GED — ${view.code}` : 'Drive Hunt GED'; }, [view]);

  const join = async (code, nick) => {
    setErr(''); const r = await game.join(code, nick);
    if (!r.ok) setErr(r.error); else window.history.replaceState(null, '', window.location.pathname);
  };
  const cls = ['dh-app', a11y.contrast && 'contrast', a11y.calm && 'calm', a11y.big && 'big'].filter(Boolean).join(' ');

  let body;
  if (ended) {
    body = (
      <main className="dh-stage center"><div className="dh-wait"><Power size={36} /><h1>{ended === 'kicked' ? 'Você foi removido da sala' : 'Sessão encerrada'}</h1>
        <p>{ended === 'kicked' ? 'O professor removeu seu apelido desta partida.' : 'O professor encerrou a sessão. Obrigado por jogar o Drive Hunt GED!'}</p>
        <button type="button" className="dh-btn primary" onClick={game.leave}>Voltar ao início</button></div></main>
    );
  } else if (sess && view) {
    body = sess.role === 'host' ? <Host game={game} timer={timer} /> : <Player game={game} timer={timer} />;
  } else if (sess && !view) {
    body = <main className="dh-stage center"><p className="dh-muted">Restaurando sua sessão…</p></main>;
  } else {
    body = <Home connected={game.connected} presetCode={preset} error={err} onCreate={game.createRoom} onJoin={join} />;
  }

  return (
    <div className={cls} style={{ '--fs': a11y.scale }}>
      <a className="dh-skip" href="#conteudo">Ir para o conteúdo</a>
      <TopBar connected={game.connected} attempts={game.attempts} code={sess ? view?.code || sess.code : ''} a11y={a11y} setA11y={setA11y} onHome={() => { if (!sess) window.location.hash = ''; }} />
      <div id="conteudo" tabIndex={-1}>{body}</div>
      {game.notice && <div className="dh-toast" role="status"><Bell size={15} /> {game.notice}</div>}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Check, Clock, Info, LogOut, Search, Trophy } from 'lucide-react';
import Explorer from '../components/Explorer.jsx';
import DocViewer from '../components/DocViewer.jsx';
import { Podium, RoundResults, Standings } from '../components/Ranking.jsx';
import { Countdown } from './Host.jsx';
import { fmtClock, fmtSeconds, ordinal } from '../lib/format.js';

function Wait({ icon, title, children }) {
  return <main className="dh-stage center"><div className="dh-wait">{icon}<h1>{title}</h1>{children}</div></main>;
}

function Result({ v }) {
  const r = v.me.result;
  return (
    <section className="dh-resultcard" aria-live="polite">
      <span className="dh-check"><Check size={30} /></span>
      <h1>Documento encontrado!</h1>
      <p className="lead">Você concluiu o desafio em <b>{fmtSeconds(r.elapsedMs)}</b> e conquistou a <b>{r.place}ª colocação</b> nesta rodada.</p>
      <dl className="dh-stats">
        <div><dt>Tempo</dt><dd>{fmtSeconds(r.elapsedMs)}</dd></div>
        <div><dt>Colocação</dt><dd>{ordinal(r.place)}</dd></div>
        <div><dt>Pontos</dt><dd>+{r.points}</dd></div>
        <div><dt>Acumulado</dt><dd>{v.me.total}</dd></div>
      </dl>
    </section>
  );
}

export default function Player({ game, timer }) {
  const v = game.view;
  const [doc, setDoc] = useState(null); // { file, path, verdict }
  const guard = useRef(false);
  useEffect(() => { setDoc(null); guard.current = false; }, [v?.level, v?.phase === 'lobby']);
  if (!v) return <Wait icon={<Clock size={36} />} title="Conectando à partida…" />;
  const me = v.me;

  const openFile = async (file, path) => {
    setDoc({ file, path, verdict: 'checking' });
    if (guard.current) return;
    const res = await game.openDoc(file.id);
    if (!res.ok) { setDoc((d) => d && { ...d, verdict: 'error' }); game.toast(res.error); return; }
    if (res.correct) { guard.current = true; setDoc(null); } else setDoc((d) => d && { ...d, verdict: 'wrong' });
  };

  if (v.phase === 'lobby') {
    return (
      <Wait icon={<Check size={36} />} title={`Você está na partida, ${me.nick}!`}>
        <p>Aguardando o professor iniciar. A partida ainda não começou.</p>
        <p className="dh-count-line">{v.count.total} participante{v.count.total === 1 ? '' : 's'} na sala</p>
        <ul className="dh-chips">{(v.names || []).map((n) => <li key={n.id} className={n.id === me.id ? 'self' : ''}>{n.nick}</li>)}</ul>
      </Wait>
    );
  }
  if (v.phase === 'countdown') return me.eligible ? <Countdown v={v} timer={timer} /> : <Wait icon={<Clock size={36} />} title="Próxima rodada"><p>Você entrou com a partida em andamento e jogará a partir do próximo nível. Seus pontos começam do zero, sem retroativos.</p></Wait>;
  if (v.phase === 'finished') {
    return (
      <main className="dh-stage final">
        <h1 className="dh-final-title">Fim de jogo!</h1>
        <Podium rows={v.standings.slice(0, 3)} />
        <section className="dh-resultcard compact"><h2>Você ficou em {me.pos ? ordinal(me.pos) : '—'} lugar</h2>
          <dl className="dh-stats"><div><dt>Pontuação total</dt><dd>{me.total}</dd></div><div><dt>Tempo total</dt><dd>{fmtSeconds(me.totalMs)}</dd></div><div><dt>Níveis concluídos</dt><dd>{me.levelsDone}/{v.totalLevels}</dd></div><div><dt>Colocação</dt><dd>{me.pos ? ordinal(me.pos) : '—'}</dd></div></dl></section>
        <section className="dh-panel wide"><h2>Classificação completa</h2><Standings rows={v.standings} meId={me.id} /></section>
        <button type="button" className="dh-btn ghost" onClick={game.leave}><LogOut size={16} /> Sair</button>
      </main>
    );
  }
  if (v.phase === 'roundEnd') {
    return (
      <main className="dh-stage">
        <header className="dh-hostbar"><div><span className="dh-tag">Nível {v.level} encerrado</span><h1>Resultado da rodada</h1></div></header>
        {me.result ? <Result v={v} /> : <section className="dh-resultcard miss"><h1>{me.eligible ? 'Você não encontrou a tempo' : 'Você aguarda a próxima rodada'}</h1><p>{me.eligible ? 'Sem pontos neste nível. O documento era:' : 'Entrada tardia: sem pontos retroativos.'}</p>{v.challenge?.fileName && <code>{v.challenge.fileName}</code>}</section>}
        <section className="dh-panel"><h2><Trophy size={18} /> Classificação da rodada</h2><RoundResults rows={v.roundResults} meId={me.id} /></section>
        {v.showRanking && <section className="dh-panel"><h2>Ranking parcial</h2><Standings rows={v.standings} meId={me.id} limit={10} /></section>}
        <p className="dh-tip"><strong>Para fixar:</strong> {v.tip}</p>
        <p className="dh-muted center">Aguardando o professor avançar para o próximo nível…</p>
      </main>
    );
  }

  // playing | paused
  if (!me.eligible) return <Wait icon={<Clock size={36} />} title="Aguarde a próxima rodada"><p>Você entrou com a rodada em andamento. Poderá jogar a partir do próximo nível, sem pontos retroativos.</p></Wait>;
  if (me.result) return (
    <main className="dh-stage"><Result v={v} />
      <p className="dh-muted center">Aguardando os demais jogadores ou o professor… ({v.progress.found}/{v.progress.of} já encontraram)</p>
      <p className="dh-tip"><Info size={15} /> Compare o que você abriu com os rótulos do nome: tipo, setor, ano e versão ajudam a eliminar as cópias.</p></main>
  );
  const c = v.challenge;
  return (
    <main className="dh-stage play">
      {v.phase === 'paused' && <div className="dh-pause" role="alert"><h1>Partida pausada</h1><p>O professor pausou o jogo. O cronômetro está parado.</p></div>}
      <header className="dh-playbar">
        <div className="dh-targetmini"><span><Search size={14} aria-hidden="true" /> Nível {v.level}/{v.totalLevels} — {c.title}</span><strong>{c.description}</strong>{c.fileName && <code>{c.fileName}</code>}</div>
        <div className="dh-clocks"><div role="timer" aria-label="Tempo restante" className={timer.remainingMs < 15000 ? 'low' : ''}>{fmtClock(timer.remainingMs)}<small>restante</small></div><div>{fmtSeconds(timer.elapsedMs)}<small>seu tempo</small></div></div>
      </header>
      {game.tree?.level === v.level ? <Explorer root={game.tree.root} onOpenFile={openFile} disabled={v.phase === 'paused'} /> : <p className="dh-muted center">Carregando o arquivo da empresa…</p>}
      {doc && <DocViewer file={doc.file} path={doc.path} verdict={doc.verdict} onClose={() => setDoc(null)} />}
    </main>
  );
}

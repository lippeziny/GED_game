import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ChevronRight, Copy, Eye, EyeOff, Lock, LockOpen, Monitor, Pause, Play, Power, Square, Trophy, UserX, Users, X } from 'lucide-react';
import { Podium, RoundResults, Standings } from '../components/Ranking.jsx';
import { fmtClock, fmtSeconds } from '../lib/format.js';
import Avatar from '../components/Avatar.jsx';

const STATUS = { searching: 'Procurando', found: 'Encontrou', waiting: 'Próxima rodada', lobby: 'No lobby' };

function inviteUrl(code) { return `${window.location.origin}${window.location.pathname}#/entrar/${code}`; }

function QrFull({ code, count, onClose }) {
  return (
    <div className="dh-qrfull" role="dialog" aria-modal="true" aria-label="QR Code para entrar">
      <button type="button" className="dh-btn ghost" onClick={onClose}><X size={18} /> Fechar</button>
      <div className="dh-qrfull-body">
        <div><h1>Entre pelo celular</h1><p>Aponte a câmera para o QR Code ou acesse o endereço e digite o PIN.</p><div className="dh-bigpin">{code}</div><p>{count} participante{count === 1 ? '' : 's'}</p></div>
        <div className="dh-qrbox"><QRCodeSVG value={inviteUrl(code)} size={420} level="M" marginSize={2} /></div>
      </div>
    </div>
  );
}

function HostLobby({ v, game }) {
  const [qr, setQr] = useState(false);
  const link = inviteUrl(v.code);
  const copy = async () => { try { await navigator.clipboard.writeText(link); game.toast('Link copiado.'); } catch { game.toast(link); } };
  return (
    <main className="dh-stage lobby">
      {qr && <QrFull code={v.code} count={v.count.total} onClose={() => setQr(false)} />}
      <div className="dh-lobby-grid">
        <section className="dh-join">
          <span className="dh-tag">Ainda não começou</span>
          <h1>Entre em <em>{window.location.host}</em></h1>
          <div className="dh-bigpin" aria-label={`PIN ${v.code}`}>{v.code}</div>
          <div className="dh-qrbox"><QRCodeSVG value={link} size={220} level="M" marginSize={2} /></div>
          <div className="dh-row">
            <button type="button" className="dh-btn ghost" onClick={copy}><Copy size={16} /> Copiar link</button>
            <button type="button" className="dh-btn ghost" onClick={() => setQr(true)}><Monitor size={16} /> QR em tela cheia</button>
          </div>
          <code className="dh-link">{link}</code>
        </section>
        <section className="dh-panel">
          <div className="dh-panel-head"><h2><Users size={19} /> {v.count.total} participante{v.count.total === 1 ? '' : 's'} <small>({v.count.online} conectado{v.count.online === 1 ? '' : 's'})</small></h2></div>
          <ul className="dh-chips">{v.players.map((p) => (
            <li key={p.id} className={p.online ? '' : 'off'}><Avatar id={p.id} nick={p.nick} av={p.av} size={22} /><span className={`dot ${p.online ? 'on' : ''}`} aria-label={p.online ? 'conectado' : 'desconectado'} />{p.nick}
              <button type="button" aria-label={`Remover ${p.nick}`} onClick={() => game.hostAction('kick', p.id)}><UserX size={13} /></button></li>))}
            {!v.players.length && <li className="empty">Aguardando participantes…</li>}</ul>
          <div className="dh-switches">
            <button type="button" className={`dh-toggle ${v.locked ? 'on' : ''}`} aria-pressed={v.locked} onClick={() => game.hostAction('lock', !v.locked)}>{v.locked ? <Lock size={16} /> : <LockOpen size={16} />} Bloquear novas entradas<span>{v.locked ? 'Bloqueado' : 'Liberado'}</span></button>
            <button type="button" className={`dh-toggle ${v.lateJoin ? 'on' : ''}`} aria-pressed={v.lateJoin} onClick={() => game.hostAction('lateJoin', !v.lateJoin)}><Check size={16} /> Entrada tardia (próxima rodada)<span>{v.lateJoin ? 'Permitida' : 'Desativada'}</span></button>
          </div>
          <button type="button" className="dh-btn primary big" disabled={!v.count.total} onClick={() => game.hostAction('start')}>Iniciar partida <ChevronRight size={20} /></button>
          <small className="dh-muted">Você é o apresentador: não aparece no ranking. 10 níveis na mesma sessão.</small>
        </section>
      </div>
    </main>
  );
}

function Controls({ v, game }) {
  const paused = v.phase === 'paused';
  return (
    <div className="dh-controls" role="group" aria-label="Controles do professor">
      {paused ? <button type="button" className="dh-btn primary" onClick={() => game.hostAction('resume')}><Play size={16} /> Retomar</button>
        : <button type="button" className="dh-btn ghost" disabled={v.phase !== 'playing'} onClick={() => game.hostAction('pause')}><Pause size={16} /> Pausar</button>}
      <button type="button" className="dh-btn danger" disabled={!['playing', 'paused'].includes(v.phase)} onClick={() => game.hostAction('endRound')}><Square size={16} /> Encerrar rodada</button>
      <button type="button" className={`dh-btn ghost ${v.locked ? 'on' : ''}`} onClick={() => game.hostAction('lock', !v.locked)}>{v.locked ? <Lock size={16} /> : <LockOpen size={16} />} {v.locked ? 'Entradas bloqueadas' : 'Bloquear entradas'}</button>
      <button type="button" className="dh-btn ghost" onClick={() => { if (window.confirm('Encerrar a sessão para todos?')) game.hostAction('close'); }}><Power size={16} /> Encerrar sessão</button>
    </div>
  );
}

function Round({ v, game, timer }) {
  const c = v.challenge;
  const sorted = [...v.players].sort((a, b) => (a.result ? a.result.place : 999) - (b.result ? b.result.place : 999) || a.nick.localeCompare(b.nick, 'pt-BR'));
  return (
    <main className="dh-stage host">
      <header className="dh-hostbar">
        <div><span className="dh-tag">Nível {v.level}/{v.totalLevels} · {c.difficulty}</span><h1>{c.title}</h1></div>
        <div className={`dh-clock ${v.phase === 'paused' ? 'paused' : ''}`} role="timer" aria-label="Tempo restante">{v.phase === 'paused' ? 'PAUSADO' : fmtClock(timer.remainingMs)}<small>restante</small></div>
      </header>
      <section className="dh-target"><span>Documento-alvo</span><strong>{c.description}</strong><code>{c.fileName}</code></section>
      <div className="dh-progress" role="progressbar" aria-valuemin={0} aria-valuemax={v.progress.of} aria-valuenow={v.progress.found} aria-label="Participantes que encontraram"><i style={{ width: `${v.progress.of ? (v.progress.found / v.progress.of) * 100 : 0}%` }} /><span>{v.progress.found} de {v.progress.of} encontraram</span></div>
      <Controls v={v} game={game} />
      <div className="dh-two">
        <section className="dh-panel"><h2>Participantes</h2>
          <ul className="dh-live">{sorted.map((p) => (
            <li key={p.id} className={`${p.status} ${p.online ? '' : 'off'}`}><Avatar id={p.id} nick={p.nick} av={p.av} size={30} /><strong>{p.nick}</strong>
              <em>{!p.online ? 'Desconectado' : STATUS[p.status]}{p.status === 'searching' && p.wrong ? ` · ${p.wrong} erro${p.wrong > 1 ? 's' : ''}` : ''}</em>
              <span>{p.result ? `${p.result.place}º · ${fmtSeconds(p.result.elapsedMs)} · +${p.result.points}` : '—'}</span><b>{p.total}</b></li>))}</ul></section>
        <section className="dh-panel"><h2>Classificação da rodada</h2><RoundResults rows={v.roundResults} /></section>
      </div>
    </main>
  );
}

function RoundEnd({ v, game }) {
  const last = v.level >= v.totalLevels;
  return (
    <main className="dh-stage host">
      <header className="dh-hostbar"><div><span className="dh-tag">Nível {v.level} encerrado · {v.endReason === 'tempo' ? 'tempo esgotado' : v.endReason === 'todos' ? 'todos encontraram' : 'encerrado pelo professor'}</span><h1>Resultado da rodada</h1></div></header>
      <section className="dh-target"><span>Documento-alvo</span><strong>{v.challenge.description}</strong><code>{v.challenge.fileName}</code></section>
      <div className="dh-two">
        <section className="dh-panel"><h2><Trophy size={18} /> Nesta rodada</h2><RoundResults rows={v.roundResults} /></section>
        <section className="dh-panel"><h2>Ranking parcial</h2>
          {v.showRanking ? <Standings rows={v.standings} limit={10} /> : <p className="dh-muted">O ranking parcial está oculto para os participantes.</p>}
          <button type="button" className="dh-btn ghost" onClick={() => game.hostAction('showRanking', !v.showRanking)}>{v.showRanking ? <EyeOff size={16} /> : <Eye size={16} />} {v.showRanking ? 'Ocultar ranking parcial' : 'Exibir ranking parcial'}</button></section>
      </div>
      <p className="dh-tip"><strong>Para fixar:</strong> {v.tip}</p>
      <div className="dh-controls">
        <button type="button" className="dh-btn primary big" onClick={() => game.hostAction('next')}>{last ? 'Ver pódio final' : `Avançar para o nível ${v.level + 1}`} <ChevronRight size={20} /></button>
        <button type="button" className={`dh-btn ghost ${v.locked ? 'on' : ''}`} onClick={() => game.hostAction('lock', !v.locked)}>{v.locked ? <Lock size={16} /> : <LockOpen size={16} />} {v.locked ? 'Entradas bloqueadas' : 'Bloquear entradas'}</button>
        <button type="button" className="dh-btn ghost" onClick={() => { if (window.confirm('Encerrar a sessão para todos?')) game.hostAction('close'); }}><Power size={16} /> Encerrar sessão</button>
      </div>
    </main>
  );
}

function Finished({ v, game }) {
  return (
    <main className="dh-stage final">
      <h1 className="dh-final-title">Pódio</h1>
      <Podium rows={v.standings.slice(0, 3)} />
      <section className="dh-panel wide"><h2>Classificação completa</h2><Standings rows={v.standings} /></section>
      <div className="dh-controls"><button type="button" className="dh-btn danger" onClick={() => game.hostAction('close')}><Power size={16} /> Encerrar sessão</button></div>
    </main>
  );
}

export default function Host({ game, timer }) {
  const v = game.view;
  if (!v) return <main className="dh-stage"><p className="dh-muted">Carregando sessão…</p></main>;
  if (v.phase === 'lobby') return <HostLobby v={v} game={game} />;
  if (v.phase === 'countdown') return <Countdown v={v} timer={timer} host />;
  if (v.phase === 'playing' || v.phase === 'paused') return <Round v={v} game={game} timer={timer} />;
  if (v.phase === 'roundEnd') return <RoundEnd v={v} game={game} />;
  if (v.phase === 'finished') return <Finished v={v} game={game} />;
  return null;
}

export function Countdown({ v, timer, host }) {
  const n = Math.max(1, Math.ceil(timer.countdownMs / 1000));
  const c = v.challenge;
  return (
    <main className="dh-stage countdown" aria-live="assertive">
      <span className="dh-tag">Nível {v.level} de {v.totalLevels} · {c.difficulty}</span>
      <h1>{c.title}</h1>
      <div className="dh-count" key={n}>{n}</div>
      <section className="dh-target big"><span>Seu documento-alvo</span><strong>{c.description}</strong>{c.fileName && <code>{c.fileName}</code>}</section>
      <p className="dh-muted">{host ? 'Todos os participantes recebem o mesmo documento.' : 'Prepare-se: o cronômetro começa para todos ao mesmo tempo.'}</p>
    </main>
  );
}

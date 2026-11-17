import { Crown, Medal } from 'lucide-react';
import { fmtSeconds } from '../lib/format.js';

const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

// Pódio no estilo Kahoot: blocos roxos, selos pentagonais e plaquinha com o apelido.
export function Podium({ rows, totalLevels = 10 }) {
  const [a, b, c] = rows;
  const slot = (r, place) => r && (
    <div className={`dh-pod p${place}`} role="listitem" key={place}>
      <div className="dh-pod-tag">{place === 1 && <Crown size={20} aria-hidden="true" />}{r.nick}</div>
      <div className="dh-pod-block">
        <span className={`dh-badge b${place}`} aria-label={`${place}º lugar`}>{place}</span>
        <b>{r.total} pts</b>
        <span>{r.levelsDone} de {totalLevels} níveis</span>
        <span>{plural(r.errors ?? 0, 'erro', 'erros')} · {fmtSeconds(r.totalMs)}</span>
      </div>
    </div>
  );
  return <div className="dh-podium" role="list" aria-label="Pódio">{slot(b, 2)}{slot(a, 1)}{slot(c, 3)}</div>;
}

// Classificação acumulada: pontos da última rodada, tempo, erros e total.
export function Standings({ rows, meId, limit }) {
  const list = limit ? rows.slice(0, limit) : rows;
  return (
    <ol className="dh-rank" aria-label="Classificação">
      {list.map((r) => (
        <li key={r.id} className={r.id === meId ? 'me' : ''}>
          <span className="dh-pos">{r.pos <= 3 ? <Medal size={16} aria-label={`${r.pos}º lugar`} /> : null}{r.pos}º</span>
          <span className="dh-who">{r.nick}{r.id === meId && <em> (você)</em>}{r.online === false && <small> · offline</small>}</span>
          <span className="dh-last">{r.last ? `+${r.last.points}` : '—'}</span>
          <span className="dh-time">{r.last ? fmtSeconds(r.last.elapsedMs) : '—'}</span>
          <span className="dh-err" title="Erros acumulados">{plural(r.errors ?? 0, 'erro', 'erros')}</span>
          <strong className="dh-pts">{r.total}</strong>
        </li>
      ))}
    </ol>
  );
}

export function RoundResults({ rows, meId }) {
  if (!rows.length) return <p className="dh-muted">Ninguém encontrou o documento nesta rodada.</p>;
  return (
    <ol className="dh-rank">
      {rows.map((r) => (
        <li key={r.playerId} className={r.playerId === meId ? 'me' : ''}>
          <span className="dh-pos">{r.place}º</span><span className="dh-who">{r.nick}{r.playerId === meId && <em> (você)</em>}</span>
          <span className="dh-last">+{r.points}</span><span className="dh-time">{fmtSeconds(r.elapsedMs)}</span><span className="dh-err">{plural(r.errors ?? 0, 'erro', 'erros')}</span><span />
        </li>
      ))}
    </ol>
  );
}

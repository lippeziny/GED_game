import { Crown, Medal } from 'lucide-react';
import { fmtSeconds } from '../lib/format.js';

export function Podium({ rows }) {
  const [a, b, c] = rows;
  const slot = (r, place, cls) => r && (
    <div className={`dh-pod ${cls}`} key={place}>
      <div className="dh-pod-name">{place === 1 && <Crown size={22} aria-hidden="true" />}<strong>{r.nick}</strong></div>
      <div className="dh-pod-block"><span className="dh-pod-place">{place}º</span><span>{r.total} pts</span><small>{fmtSeconds(r.totalMs)}</small></div>
    </div>
  );
  return <div className="dh-podium" role="list" aria-label="Pódio">{slot(b, 2, 'p2')}{slot(a, 1, 'p1')}{slot(c, 3, 'p3')}</div>;
}

// Classificação acumulada (com pontos da última rodada e tempo).
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
          <span className="dh-last">+{r.points}</span><span className="dh-time">{fmtSeconds(r.elapsedMs)}</span><span />
        </li>
      ))}
    </ol>
  );
}

import { createContext, useContext } from 'react';

export const RoomCtx = createContext('');
const HUES = [262, 200, 160, 340, 28, 220, 120, 300];
const hue = (s = '') => HUES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % HUES.length];

// Foto do jogador (servida por /api/avatar) ou inicial colorida quando não há foto.
export default function Avatar({ id, nick = '?', av, src, size = 32 }) {
  const code = useContext(RoomCtx);
  const url = src || (av && code && id ? `/api/avatar/${code}/${id}?v=${av}` : '');
  const style = { width: size, height: size, fontSize: size * 0.45 };
  if (url) return <img className="dh-av" style={style} src={url} alt="" loading="lazy" draggable="false" />;
  return <span className="dh-av" style={{ ...style, background: `hsl(${hue(nick)} 60% 52%)` }} aria-hidden="true">{nick.trim().charAt(0).toUpperCase()}</span>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

const OUT = 256; const MAX_ZOOM = 5;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Recorte quadrado: arraste para posicionar, pince/role/deslize para ampliar, gire se precisar.
export default function Cropper({ src, onBack, onDone }) {
  const [img, setImg] = useState(null);
  const [err, setErr] = useState('');
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const box = useRef(null); const ptrs = useRef(new Map()); const pinch = useRef(0);
  const V = Math.min(300, Math.max(220, (typeof window !== 'undefined' ? window.innerWidth : 360) - 64));
  const minS = img ? V / Math.min(img.naturalWidth, img.naturalHeight) : 1;

  const fit = useCallback((im) => {
    const s = V / Math.min(im.naturalWidth, im.naturalHeight);
    setView({ s, x: (V - im.naturalWidth * s) / 2, y: (V - im.naturalHeight * s) / 2 });
  }, [V]);
  const load = useCallback((url) => {
    const im = new Image(); im.onload = () => { setImg(im); fit(im); setErr(''); }; im.onerror = () => setErr('Não foi possível abrir esta imagem. Tente outra.'); im.src = url;
  }, [fit]);
  useEffect(() => { load(src); }, [src, load]);

  const place = useCallback((s, x, y, im = img) => {
    if (!im) return;
    const ms = V / Math.min(im.naturalWidth, im.naturalHeight); const s2 = clamp(s, ms, ms * MAX_ZOOM);
    setView({ s: s2, x: clamp(x, V - im.naturalWidth * s2, 0), y: clamp(y, V - im.naturalHeight * s2, 0) });
  }, [img, V]);
  const zoomAt = useCallback((factor, cx = V / 2, cy = V / 2) => setView((v) => {
    if (!img) return v;
    const ms = V / Math.min(img.naturalWidth, img.naturalHeight); const s2 = clamp(v.s * factor, ms, ms * MAX_ZOOM); const k = s2 / v.s;
    return { s: s2, x: clamp(cx - (cx - v.x) * k, V - img.naturalWidth * s2, 0), y: clamp(cy - (cy - v.y) * k, V - img.naturalHeight * s2, 0) };
  }), [img, V]);

  useEffect(() => { // rolagem do mouse (precisa de listener não passivo)
    const el = box.current; if (!el) return undefined;
    const h = (e) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 0.91, e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener('wheel', h, { passive: false }); return () => el.removeEventListener('wheel', h);
  }, [zoomAt, img]);

  const down = (e) => { e.currentTarget.setPointerCapture?.(e.pointerId); ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinch.current = 0; };
  const move = (e) => {
    const p = ptrs.current.get(e.pointerId); if (!p || !img) return;
    const cur = { x: e.clientX, y: e.clientY }; ptrs.current.set(e.pointerId, cur);
    if (ptrs.current.size === 1) place(view.s, view.x + cur.x - p.x, view.y + cur.y - p.y);
    else if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = box.current.getBoundingClientRect();
      if (pinch.current) zoomAt(d / pinch.current, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinch.current = d;
    }
  };
  const up = (e) => { ptrs.current.delete(e.pointerId); pinch.current = 0; };
  const key = (e) => {
    const st = 14; const m = { ArrowLeft: [st, 0], ArrowRight: [-st, 0], ArrowUp: [0, st], ArrowDown: [0, -st] }[e.key];
    if (m) { e.preventDefault(); place(view.s, view.x + m[0], view.y + m[1]); }
    else if (e.key === '+' || e.key === '=') zoomAt(1.1); else if (e.key === '-') zoomAt(0.91);
  };

  const rotate = () => {
    if (!img) return; const c = document.createElement('canvas'); c.width = img.naturalHeight; c.height = img.naturalWidth;
    const x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(img, 0, 0);
    load(c.toDataURL('image/jpeg', 0.92));
  };
  const finish = () => {
    const c = document.createElement('canvas'); c.width = OUT; c.height = OUT; const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, OUT, OUT);
    x.drawImage(img, -view.x / view.s, -view.y / view.s, V / view.s, V / view.s, 0, 0, OUT, OUT);
    let q = 0.88; let url = c.toDataURL('image/jpeg', q);
    while (url.length > 52000 && q > 0.4) { q -= 0.1; url = c.toDataURL('image/jpeg', q); }
    onDone(url);
  };

  return (
    <div className="dh-crop">
      {err ? <p className="dh-error" role="alert">{err}</p> : (
        <div ref={box} className="dh-cropbox" style={{ width: V, height: V }} tabIndex={0} role="application" aria-label="Área de recorte. Use as setas para mover e + ou - para ampliar."
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
          {img && <img src={img.src} alt="" draggable="false" style={{ width: img.naturalWidth * view.s, height: img.naturalHeight * view.s, left: view.x, top: view.y }} />}
          <div className="dh-cropgrid" />
        </div>
      )}
      <p className="dh-muted center">Arraste para enquadrar · pince ou use o controle para ampliar</p>
      <div className="dh-zoomrow">
        <button type="button" className="dh-x" aria-label="Diminuir zoom" onClick={() => zoomAt(0.9)}><ZoomOut size={16} /></button>
        <input type="range" min="1" max={MAX_ZOOM} step="0.01" value={img ? view.s / minS : 1} aria-label="Zoom" onChange={(e) => zoomAt((Number(e.target.value) * minS) / view.s)} />
        <button type="button" className="dh-x" aria-label="Aumentar zoom" onClick={() => zoomAt(1.1)}><ZoomIn size={16} /></button>
        <button type="button" className="dh-x" aria-label="Girar 90 graus" onClick={rotate}><RotateCw size={16} /></button>
      </div>
      <div className="dh-cropbtns"><button type="button" className="dh-btn ghost" onClick={onBack}>Voltar</button><button type="button" className="dh-btn primary" disabled={!img} onClick={finish}>Usar esta foto</button></div>
    </div>
  );
}

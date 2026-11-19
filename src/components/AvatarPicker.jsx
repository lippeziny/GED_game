import { useEffect, useRef, useState } from 'react';
import { Camera, Search, Upload, X } from 'lucide-react';
import Cropper from './Cropper.jsx';

const SUGGESTIONS = ['gato', 'astronauta', 'robô', 'pizza', 'paisagem', 'cachorro'];

async function searchWeb(q) {
  try {
    const r = await fetch(`/api/imagens?q=${encodeURIComponent(q)}`); const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) return { ok: false, error: d.error || 'Não foi possível buscar agora. Envie uma foto do aparelho.' };
    return d;
  } catch { return { ok: false, error: 'Sem conexão para buscar imagens. Envie uma foto do aparelho.' }; }
}

// Escolha da foto: busca em provedores gratuitos (via servidor) ou arquivo/câmera, seguida do recorte.
export default function AvatarPicker({ onClose, onPick }) {
  const [tab, setTab] = useState('web');
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: false, results: null, error: '' });
  const [cropSrc, setCropSrc] = useState('');
  const blob = useRef('');
  useEffect(() => () => { if (blob.current) URL.revokeObjectURL(blob.current); }, []);
  useEffect(() => { const esc = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);

  const run = async (term) => {
    const t = (term ?? q).trim(); if (t.length < 2) return setState({ loading: false, results: null, error: 'Digite pelo menos 2 letras.' });
    setQ(t); setState({ loading: true, results: null, error: '' });
    const r = await searchWeb(t);
    setState(r.ok ? { loading: false, results: r.results, error: r.results.length ? '' : 'Nada encontrado. Tente outra palavra.' } : { loading: false, results: null, error: r.error });
  };
  const file = (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    if (!f.type.startsWith('image/')) return setState((s) => ({ ...s, error: 'Escolha um arquivo de imagem.' }));
    if (blob.current) URL.revokeObjectURL(blob.current); blob.current = URL.createObjectURL(f); setCropSrc(blob.current);
  };

  return (
    <div className="dh-sheet-bg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="dh-sheet" role="dialog" aria-modal="true" aria-label="Escolher foto de perfil">
        <div className="dh-sheet-head"><h2>{cropSrc ? 'Ajuste sua foto' : 'Sua foto no pódio'}</h2><button type="button" className="dh-x" onClick={onClose} aria-label="Fechar"><X size={18} /></button></div>
        {cropSrc ? <Cropper src={cropSrc} onBack={() => setCropSrc('')} onDone={onPick} /> : (
          <>
            <div className="dh-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'web'} className={tab === 'web' ? 'on' : ''} onClick={() => setTab('web')}><Search size={15} /> Buscar na web</button>
              <button type="button" role="tab" aria-selected={tab === 'device'} className={tab === 'device' ? 'on' : ''} onClick={() => setTab('device')}><Upload size={15} /> Do aparelho</button>
            </div>
            {tab === 'web' ? (
              <>
                <form className="dh-searchrow" onSubmit={(e) => { e.preventDefault(); run(); }}>
                  <input className="dh-input" type="search" enterKeyHint="search" placeholder="Ex.: gato, astronauta, robô…" value={q} onChange={(e) => setQ(e.target.value)} maxLength={60} aria-label="Buscar imagem" autoFocus />
                  <button type="submit" className="dh-btn primary" disabled={state.loading}><Search size={17} aria-hidden="true" /><span className="sr">Buscar</span></button>
                </form>
                {!state.results && !state.loading && <div className="dh-sugs">{SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => run(s)}>{s}</button>)}</div>}
                {state.loading && <p className="dh-muted center">Buscando…</p>}
                {state.error && <p className="dh-error" role="alert">{state.error}</p>}
                {state.results?.length > 0 && <div className="dh-results">{state.results.map((r) => <button type="button" key={r.id} onClick={() => setCropSrc(r.src)} title={`${r.title} — ${r.credit}`}><img src={r.src} alt={r.title} loading="lazy" onError={(e) => { e.currentTarget.parentElement.hidden = true; }} /></button>)}</div>}
                <p className="dh-credit">Fotos do Openverse (licenças Creative Commons). Escolha uma e ajuste o recorte no próximo passo.</p>
              </>
            ) : (
              <div className="dh-drop">
                <p>Use uma foto do seu aparelho ou tire uma agora.</p>
                <label className="dh-btn primary"><Upload size={17} /> Escolher arquivo<input type="file" accept="image/*" hidden onChange={file} /></label>
                <label className="dh-btn ghost"><Camera size={17} /> Tirar foto<input type="file" accept="image/*" capture="user" hidden onChange={file} /></label>
                {state.error && <p className="dh-error" role="alert">{state.error}</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

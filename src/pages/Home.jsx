import { useEffect, useRef, useState } from 'react';
import { Camera, ChevronRight, FolderOpen, Monitor } from 'lucide-react';
import AvatarPicker from '../components/AvatarPicker.jsx';

const PIN_ERRORS = ['not_found', 'full', 'locked', 'started', 'finished'];
const NICK_ERRORS = ['nick', 'duplicate'];

export default function Home({ connected, presetCode, onClearPreset, onCreate, onJoin, error }) {
  const [code, setCode] = useState(presetCode || '');
  const [nick, setNick] = useState(() => { try { return localStorage.getItem('drive-hunt-ged.nick') || ''; } catch { return ''; } });
  const [avatar, setAvatar] = useState(() => { try { return localStorage.getItem('drive-hunt-ged.avatar') || ''; } catch { return ''; } });
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const pinRef = useRef(null); const nickRef = useRef(null);
  const fromLink = Boolean(presetCode) && code === presetCode;

  useEffect(() => { setCode(presetCode || ''); }, [presetCode]);
  useEffect(() => { (fromLink || code.length === 6 ? nickRef : pinRef).current?.focus(); }, [fromLink]); // eslint-disable-line react-hooks/exhaustive-deps

  const pinErr = error && PIN_ERRORS.includes(error.code) ? error.msg : '';
  const nickErr = error && NICK_ERRORS.includes(error.code) ? error.msg : '';
  const otherErr = error && !pinErr && !nickErr ? error.msg : '';
  const ready = code.length === 6 && nick.trim().length >= 2;
  const hint = !connected ? 'Conectando ao servidor…' : code.length !== 6 ? 'Digite o PIN de 6 dígitos' : nick.trim().length < 2 ? 'Escolha um apelido' : '';

  const submit = async (e) => {
    e.preventDefault(); if (!ready || !connected || busy) return; setBusy(true);
    try { localStorage.setItem('drive-hunt-ged.nick', nick.trim()); } catch { /* ignore */ }
    await onJoin(code, nick.trim(), avatar || undefined); setBusy(false);
  };
  const create = async () => { setCreating(true); await onCreate(); setCreating(false); };

  return (
    <main className="dh-entry">
      <div className="dh-entry-brand"><span className="dh-hero-ico"><FolderOpen size={30} /></span><h1>Drive Hunt GED</h1><p>Ache o documento certo antes de todo mundo.</p></div>

      <form className="dh-entry-card" onSubmit={submit} noValidate>
        {fromLink ? (
          <div className="dh-roomchip"><span>Sala <b>{code}</b></span><button type="button" onClick={() => { onClearPreset(); setCode(''); setTimeout(() => pinRef.current?.focus(), 0); }}>Trocar</button></div>
        ) : (
          <div className="dh-field">
            <label htmlFor="pin">PIN da sala</label>
            <input id="pin" ref={pinRef} className={`dh-input pin ${pinErr ? 'bad' : ''}`} inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" value={code} aria-invalid={Boolean(pinErr)} aria-describedby={pinErr ? 'pin-err' : undefined}
              onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(v); if (v.length === 6) nickRef.current?.focus(); }} />
            {pinErr && <p id="pin-err" className="dh-error" role="alert">{pinErr}</p>}
          </div>
        )}
        {fromLink && pinErr && <p className="dh-error" role="alert">{pinErr}</p>}
        <div className="dh-nickrow">
          <div className="dh-field">
            <span className="sr" id="foto-lbl">Foto de perfil (opcional)</span>
            <button type="button" className={`dh-avbtn ${avatar ? 'has' : ''}`} onClick={() => setPicking(true)} aria-labelledby="foto-lbl" aria-haspopup="dialog" title="Escolher foto (opcional)">
              {avatar ? <img src={avatar} alt="Sua foto" /> : <Camera size={26} aria-hidden="true" />}<span className="cam"><Camera size={13} aria-hidden="true" /></span>
            </button>
          </div>
        <div className="dh-field">
          <label htmlFor="nick">Seu apelido</label>
          <input id="nick" ref={nickRef} className={`dh-input ${nickErr ? 'bad' : ''}`} maxLength={20} autoComplete="nickname" placeholder="Ex.: Maria" value={nick} aria-invalid={Boolean(nickErr)} aria-describedby={nickErr ? 'nick-err' : undefined} onChange={(e) => setNick(e.target.value)} />
          {nickErr && <p id="nick-err" className="dh-error" role="alert">{nickErr}</p>}
        </div>
        </div>
        {avatar ? <p className="dh-hint left">Sua foto aparecerá no pódio. <button type="button" className="dh-linkbtn" onClick={() => { setAvatar(''); try { localStorage.removeItem('drive-hunt-ged.avatar'); } catch { /* ignore */ } }}>Remover</button></p> : <p className="dh-hint left">Foto opcional: apareça no pódio com a imagem que quiser.</p>}
        {otherErr && <p className="dh-error" role="alert">{otherErr}</p>}
        <button className="dh-btn primary big full" type="submit" disabled={!ready || !connected || busy}>{busy ? 'Entrando…' : 'Entrar no jogo'} <ChevronRight size={20} /></button>
        <p className="dh-hint" aria-live="polite">{hint}</p>
      </form>

      <div className="dh-or"><span>é professor?</span></div>
      <button type="button" className="dh-btn ghost full" onClick={create} disabled={!connected || creating}><Monitor size={18} aria-hidden="true" /> {creating ? 'Criando…' : 'Criar partida'}</button>
      {picking && <AvatarPicker onClose={() => setPicking(false)} onPick={(url) => { setAvatar(url); try { localStorage.setItem('drive-hunt-ged.avatar', url); } catch { /* ignore */ } setPicking(false); }} />}
    </main>
  );
}

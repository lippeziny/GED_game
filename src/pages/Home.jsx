import { useState } from 'react';
import { ChevronRight, FolderOpen, Monitor, Smartphone } from 'lucide-react';

export default function Home({ connected, presetCode, onCreate, onJoin, error }) {
  const [code, setCode] = useState(presetCode || '');
  const [nick, setNick] = useState(() => { try { return localStorage.getItem('drive-hunt-ged.nick') || ''; } catch { return ''; } });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { localStorage.setItem('drive-hunt-ged.nick', nick); } catch { /* ignore */ }
    await onJoin(code, nick); setBusy(false);
  };
  return (
    <main className="dh-home">
      <section className="dh-hero">
        <span className="dh-hero-ico"><FolderOpen size={34} /></span>
        <h1>Encontre o documento.<br /><em>Domine a gestão documental.</em></h1>
        <p>Jogo multiplayer de Gestão Eletrônica de Documentos: explore as pastas de uma empresa fictícia, sem busca, e seja o mais rápido a localizar o arquivo certo. 10 níveis, um só placar.</p>
      </section>
      <section className="dh-cards">
        <form className="dh-card" onSubmit={submit} noValidate>
          <h2><Smartphone size={20} aria-hidden="true" /> Entrar na partida</h2>
          <label htmlFor="pin">PIN da partida</label>
          <input id="pin" className="dh-input pin" inputMode="numeric" autoComplete="off" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
          <label htmlFor="nick">Seu apelido</label>
          <input id="nick" className="dh-input" maxLength={20} autoComplete="nickname" placeholder="Como o grupo vai te chamar?" value={nick} onChange={(e) => setNick(e.target.value)} />
          {error && <p className="dh-error" role="alert">{error}</p>}
          <button className="dh-btn primary" type="submit" disabled={busy || !connected || code.length !== 6 || nick.trim().length < 2}>{busy ? 'Entrando…' : 'Entrar'} <ChevronRight size={18} /></button>
          <small className="dh-muted">Use apenas um apelido. Não informe dados pessoais.</small>
        </form>
        <div className="dh-card">
          <h2><Monitor size={20} aria-hidden="true" /> Sou o professor</h2>
          <p>Crie uma partida para projetar o PIN e o QR Code, acompanhar os participantes em tempo real e controlar os dez níveis.</p>
          <button type="button" className="dh-btn accent" onClick={onCreate} disabled={!connected}>Criar partida <ChevronRight size={18} /></button>
          <small className="dh-muted">O professor apresenta e administra; não compete nem pontua.</small>
        </div>
      </section>
    </main>
  );
}

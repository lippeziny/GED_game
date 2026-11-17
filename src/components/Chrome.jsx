import { useEffect, useState } from 'react';
import { Contrast, HardDrive, Maximize2, Minus, Plus, SlidersHorizontal, Wifi, WifiOff, X, Zap } from 'lucide-react';

const KEY = 'drive-hunt-ged.a11y';
export function useA11y() {
  const [s, setS] = useState(() => { try { return { scale: 1, contrast: false, calm: false, big: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { scale: 1, contrast: false, calm: false, big: false }; } });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ } }, [s]);
  return [s, setS];
}

export function TopBar({ connected, attempts, code, a11y, setA11y, onHome }) {
  const [open, setOpen] = useState(false);
  const Row = ({ on, set, icon, label }) => <button type="button" className={`dh-toggle ${on ? 'on' : ''}`} aria-pressed={on} onClick={set}>{icon}{label}<span>{on ? 'Ativado' : 'Desativado'}</span></button>;
  return (
    <header className="dh-top">
      <button type="button" className="dh-brand" onClick={onHome} aria-label="Drive Hunt GED — início"><span className="dh-logo"><HardDrive size={20} /></span><span><strong>Drive Hunt</strong><small>GED Challenge</small></span></button>
      <div className={`dh-conn ${connected ? 'on' : ''}`} role="status" aria-live="polite">{connected ? <Wifi size={15} /> : <WifiOff size={15} />}{connected ? 'Conectado' : attempts ? `Reconectando… (tentativa ${attempts})` : 'Conectando…'}</div>
      <div className="dh-top-right">
        {code && <span className="dh-pin" aria-label={`PIN ${code}`}>PIN {code}</span>}
        <button type="button" className="dh-iconbtn" onClick={() => setOpen((v) => !v)} aria-label="Acessibilidade" aria-expanded={open}><SlidersHorizontal size={18} /></button>
      </div>
      {open && (
        <div className="dh-a11y" role="dialog" aria-label="Opções de acessibilidade">
          <div className="dh-a11y-head"><strong>Acessibilidade</strong><button type="button" className="dh-x" onClick={() => setOpen(false)} aria-label="Fechar"><X size={16} /></button></div>
          <div className="dh-size"><span>Tamanho do texto</span>
            <button type="button" onClick={() => setA11y((v) => ({ ...v, scale: Math.max(0.9, +(v.scale - 0.1).toFixed(2)) }))} aria-label="Diminuir texto"><Minus size={15} /></button>
            <b>{Math.round(a11y.scale * 100)}%</b>
            <button type="button" onClick={() => setA11y((v) => ({ ...v, scale: Math.min(1.5, +(v.scale + 0.1).toFixed(2)) }))} aria-label="Aumentar texto"><Plus size={15} /></button></div>
          <Row on={a11y.contrast} set={() => setA11y((v) => ({ ...v, contrast: !v.contrast }))} icon={<Contrast size={16} />} label="Alto contraste" />
          <Row on={a11y.calm} set={() => setA11y((v) => ({ ...v, calm: !v.calm }))} icon={<Zap size={16} />} label="Reduzir animações" />
          <Row on={a11y.big} set={() => setA11y((v) => ({ ...v, big: !v.big }))} icon={<Maximize2 size={16} />} label="Botões ampliados" />
        </div>
      )}
    </header>
  );
}

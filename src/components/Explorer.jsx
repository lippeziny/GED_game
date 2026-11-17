import { memo, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Check, ChevronDown, ChevronRight, LayoutGrid, List, PanelLeft } from 'lucide-react';
import { FileGlyph, FolderIcon, sortItems, TYPE_NAME } from '../lib/files.jsx';
import { fmtBytes, fmtDate } from '../lib/format.js';

const SORTS = [['name', 'Nome'], ['size', 'Tamanho'], ['ext', 'Extensão']];

// Painel de navegação: abre/fecha diretórios sem redesenhar o restante.
const TreeNav = memo(function TreeNav({ node, path, depth, onGo, activeSet, current }) {
  const [open, setOpen] = useState(depth === 0);
  const folders = useMemo(() => (node.c || []).filter((c) => !c.id), [node]);
  const onPath = activeSet.has(node);
  useEffect(() => { if (onPath) setOpen(true); }, [onPath]);
  return (
    <li role="none">
      <div className={`dh-tn ${current === node ? 'on' : ''}`} style={{ paddingLeft: 4 + depth * 14 }}>
        {folders.length ? (
          <button type="button" className="dh-tn-tog" aria-label={`${open ? 'Recolher' : 'Expandir'} ${node.n}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</button>
        ) : <span className="dh-tn-tog" />}
        <button type="button" className="dh-tn-name" onClick={() => onGo([...path, node])} aria-current={current === node ? 'true' : undefined}>
          <FolderIcon size={18} open={onPath} /><span>{node.n}</span>
        </button>
      </div>
      {open && folders.length > 0 && <ul role="group" className="dh-tn-list">{folders.map((f) => <TreeNav key={f.n} node={f} path={[...path, node]} depth={depth + 1} onGo={onGo} activeSet={activeSet} current={current} />)}</ul>}
    </li>
  );
});

export default function Explorer({ root, onOpenFile, disabled, side, selectedId }) {
  const [stack, setStack] = useState([root]);
  const [hist, setHist] = useState([]);
  const [view, setView] = useState('list');
  const [sortKey, setSortKey] = useState('name');
  const [dir, setDir] = useState('asc');
  const [navOpen, setNavOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => { setStack([root]); setHist([]); }, [root]);
  const current = stack[stack.length - 1];
  const items = useMemo(() => sortItems(current.c || [], sortKey, dir), [current, sortKey, dir]);
  const activeSet = useMemo(() => new Set(stack), [stack]);
  const goto = (next) => { setHist((h) => [...h.slice(-30), stack]); setStack(next.length ? next : [root]); setNavOpen(false); };
  const open = (it) => { if (disabled) return; if (it.id) onOpenFile(it, stack); else goto([...stack, it]); };
  const toggleSort = (k) => { if (k === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setDir('asc'); } };
  const nFolders = items.filter((i) => !i.id).length;
  const Head = ({ k, children, cls }) => (
    <button type="button" className={`dh-col ${cls} ${sortKey === k ? 'on' : ''}`} onClick={() => toggleSort(k)} aria-label={`Ordenar por ${children}${sortKey === k ? (dir === 'asc' ? ', crescente' : ', decrescente') : ''}`}>
      {children}{sortKey === k && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
    </button>
  );

  return (
    <div className={`dh-explorer ${side ? 'has-side' : ''}`}>
      <div className="dh-cmd">
        <button type="button" className="dh-cbtn dh-navbtn" onClick={() => setNavOpen(true)} aria-label="Abrir painel de pastas"><PanelLeft size={18} /></button>
        <button type="button" className="dh-cbtn" disabled={!hist.length} onClick={() => { const h = hist[hist.length - 1]; setHist(hist.slice(0, -1)); setStack(h); }} aria-label="Voltar"><ArrowLeft size={18} /></button>
        <button type="button" className="dh-cbtn" disabled={stack.length < 2} onClick={() => goto(stack.slice(0, -1))} aria-label="Subir um nível"><ArrowUp size={18} /></button>
        <nav className="dh-addr" aria-label="Caminho atual">
          <FolderIcon size={18} />
          {stack.map((n, i) => (
            <span key={i} className="dh-crumb">
              {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
              <button type="button" aria-current={i === stack.length - 1 ? 'page' : undefined} onClick={() => i < stack.length - 1 && goto(stack.slice(0, i + 1))}>{n.n}</button>
            </span>
          ))}
        </nav>
        <div className="dh-menu-wrap">
          <button type="button" className="dh-cbtn wide" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu"><ArrowUpDown size={16} /><span>Classificar</span></button>
          {menu && (
            <div className="dh-menu" role="menu">
              {SORTS.map(([k, l]) => <button key={k} role="menuitemradio" aria-checked={sortKey === k} type="button" onClick={() => setSortKey(k)}>{sortKey === k ? <Check size={14} /> : <i />}{l}</button>)}
              <hr />
              {[['asc', 'Crescente'], ['desc', 'Decrescente']].map(([k, l]) => <button key={k} role="menuitemradio" aria-checked={dir === k} type="button" onClick={() => { setDir(k); setMenu(false); }}>{dir === k ? <Check size={14} /> : <i />}{l}</button>)}
            </div>
          )}
        </div>
        <div className="dh-viewsw" role="group" aria-label="Modo de visualização">
          <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="Detalhes"><List size={17} /></button>
          <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Ícones grandes"><LayoutGrid size={17} /></button>
        </div>
      </div>
      <div className="dh-wbody">
        {navOpen && <button type="button" className="dh-scrim" aria-label="Fechar painel de pastas" onClick={() => setNavOpen(false)} />}
        <aside className={`dh-nav ${navOpen ? 'open' : ''}`} aria-label="Estrutura de pastas">
          <ul role="tree"><TreeNav node={root} path={[]} depth={0} activeSet={activeSet} current={current} onGo={goto} /></ul>
        </aside>
        <section className="dh-files">
          {view === 'list' && <div className="dh-heads" role="row"><Head k="name" cls="c-nm">Nome</Head><span className="dh-col c-dt">Data de modificação</span><Head k="ext" cls="c-ex">Tipo</Head><Head k="size" cls="c-sz">Tamanho</Head></div>}
          <div className={`dh-items ${view}`} role="list" aria-live="polite">
            {items.map((it) => (
              <button type="button" role="listitem" key={it.id || `d-${it.n}`} className={`dh-item ${it.id ? '' : 'folder'} ${selectedId && selectedId === it.id ? 'sel' : ''}`} onClick={() => open(it)} disabled={disabled} title={it.n}>
                <span className="dh-ico">{it.id ? <FileGlyph ext={it.e} size={view === 'grid' ? 40 : 26} /> : <FolderIcon size={view === 'grid' ? 52 : 28} />}</span>
                <span className="dh-nm"><strong>{it.n}</strong><small>{it.id ? `${TYPE_NAME[it.e] || it.e} · ${fmtBytes(it.s)} · ${fmtDate(it.md)}` : `Pasta de arquivos · ${(it.c || []).length} itens`}</small></span>
                <span className="dh-meta c-dt">{it.id ? fmtDate(it.md) : ''}</span>
                <span className="dh-meta c-ex">{it.id ? (TYPE_NAME[it.e] || it.e) : 'Pasta de arquivos'}</span>
                <span className="dh-meta c-sz">{it.id ? fmtBytes(it.s) : ''}</span>
              </button>
            ))}
            {!items.length && <p className="dh-empty">Esta pasta está vazia.</p>}
          </div>
        </section>
        {side}
      </div>
      <footer className="dh-status">{items.length} {items.length === 1 ? 'item' : 'itens'} <span>·</span> {nFolders} pastas, {items.length - nFolders} arquivos</footer>
    </div>
  );
}

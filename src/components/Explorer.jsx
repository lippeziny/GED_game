import { memo, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Folder, FolderOpen, HardDrive, LayoutGrid, List } from 'lucide-react';
import { fileIcon, fileTone, sortItems } from '../lib/files.jsx';
import { fmtBytes, fmtDate } from '../lib/format.js';

// Barra lateral em árvore: abre/fecha diretórios sem redesenhar o restante da tela.
const TreeNav = memo(function TreeNav({ node, path, depth, onGo, activeSet }) {
  const [open, setOpen] = useState(depth === 0);
  const folders = useMemo(() => (node.c || []).filter((c) => !c.id), [node]);
  const isActive = activeSet.has(node);
  return (
    <li role="none">
      <div className={`dh-tn ${isActive ? 'on' : ''}`} style={{ paddingLeft: 6 + depth * 12 }}>
        {folders.length ? (
          <button type="button" className="dh-tn-tog" aria-label={`${open ? 'Fechar' : 'Abrir'} ${node.n}`} aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
        ) : <span className="dh-tn-tog" />}
        <button type="button" className="dh-tn-name" onClick={() => { onGo([...path, node]); setOpen(true); }}>
          {isActive ? <FolderOpen size={15} /> : <Folder size={15} />}<span>{node.n}</span>
        </button>
      </div>
      {open && folders.length > 0 && <ul role="group" className="dh-tn-list">{folders.map((f) => <TreeNav key={f.n} node={f} path={[...path, node]} depth={depth + 1} onGo={onGo} activeSet={activeSet} />)}</ul>}
    </li>
  );
});

export default function Explorer({ root, onOpenFile, disabled }) {
  const [stack, setStack] = useState([root]);
  const [view, setView] = useState('list');
  const [sortKey, setSortKey] = useState('name');
  const [dir, setDir] = useState('asc');
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setStack([root]); }, [root]);
  const current = stack[stack.length - 1];
  const items = useMemo(() => sortItems(current.c || [], sortKey, dir), [current, sortKey, dir]);
  const activeSet = useMemo(() => new Set(stack), [stack]);
  const open = (it) => { if (disabled) return; if (it.id) onOpenFile(it, stack); else setStack((s) => [...s, it]); };
  const toggleSort = (k) => { if (k === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(k); setDir('asc'); } };
  const SortBtn = ({ k, children }) => (
    <button type="button" className={`dh-sort ${sortKey === k ? 'on' : ''}`} onClick={() => toggleSort(k)} aria-label={`Ordenar por ${children}${sortKey === k ? (dir === 'asc' ? ', crescente' : ', decrescente') : ''}`}>
      {children}{sortKey === k && (dir === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
    </button>
  );
  const folders = items.filter((i) => !i.id).length;

  return (
    <div className="dh-explorer">
      <aside className={`dh-nav ${navOpen ? 'open' : ''}`} aria-label="Estrutura de pastas">
        <ul role="tree"><TreeNav node={root} path={[]} depth={0} activeSet={activeSet} onGo={(p) => { setStack(p.length ? p : [root]); setNavOpen(false); }} /></ul>
      </aside>
      <section className="dh-files">
        <div className="dh-bar">
          <button type="button" className="dh-ghost dh-navbtn" onClick={() => setNavOpen((v) => !v)} aria-expanded={navOpen}><HardDrive size={16} /> Pastas</button>
          <nav className="dh-crumbs" aria-label="Caminho atual">
            {stack.map((n, i) => (
              <span key={i} className="dh-crumb">
                {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
                <button type="button" aria-current={i === stack.length - 1 ? 'page' : undefined} onClick={() => setStack(stack.slice(0, i + 1))}>{n.n}</button>
              </span>
            ))}
          </nav>
          <div className="dh-viewsw" role="group" aria-label="Modo de visualização">
            <button type="button" className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-pressed={view === 'list'} aria-label="Lista"><List size={17} /></button>
            <button type="button" className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-pressed={view === 'grid'} aria-label="Grade"><LayoutGrid size={17} /></button>
          </div>
        </div>
        <div className="dh-sortbar" role="group" aria-label="Ordenação">
          <span>Ordenar:</span><SortBtn k="name">Nome</SortBtn><SortBtn k="size">Tamanho</SortBtn><SortBtn k="ext">Extensão</SortBtn>
        </div>
        <div className={`dh-items ${view}`} role="list" aria-live="polite">
          {items.map((it) => (
            <button type="button" role="listitem" key={it.id || `d-${it.n}`} className={`dh-item ${it.id ? '' : 'folder'}`} onClick={() => open(it)} disabled={disabled} title={it.n}>
              <span className={`dh-ico ${it.id ? `tone-${fileTone(it.e)}` : 'tone-folder'}`}>{it.id ? fileIcon(it.e, 22) : <Folder size={22} fill="currentColor" aria-hidden="true" />}</span>
              <span className="dh-nm"><strong>{it.n}</strong><small>{it.id ? `${it.e.toUpperCase()} · v${it.v}` : `${(it.c || []).length} itens`}</small></span>
              <span className="dh-meta dh-sz">{it.id ? fmtBytes(it.s) : '—'}</span>
              <span className="dh-meta dh-dt">{it.id ? fmtDate(it.md) : '—'}</span>
              <span className="dh-meta dh-ex">{it.id ? it.e.toUpperCase() : 'Pasta'}</span>
            </button>
          ))}
          {!items.length && <p className="dh-empty">Esta pasta está vazia.</p>}
        </div>
        <footer className="dh-foot">{folders} pastas · {items.length - folders} arquivos</footer>
      </section>
    </div>
  );
}

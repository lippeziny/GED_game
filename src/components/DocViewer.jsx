import { useEffect, useRef } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { docContent, fmtBytes, fmtDate, STATUS_TEXT } from '../lib/format.js';
import { fileIcon } from '../lib/files.jsx';

export default function DocViewer({ file, path, verdict, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="dh-modal-bg" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="dh-doc" role="dialog" aria-modal="true" aria-label={`Visualização de ${file.n}`}>
        <header><span className="dh-doc-ico">{fileIcon(file.e, 22)}</span><div><strong>{file.n}</strong><small>{path.map((p) => p.n).join(' › ')}</small></div>
          <button type="button" ref={ref} className="dh-x" onClick={onClose} aria-label="Fechar visualização"><X size={18} /></button></header>
        <dl className="dh-docmeta">
          <div><dt>Tipo</dt><dd>{file.tp.replace(/_/g, ' ')}</dd></div><div><dt>Setor</dt><dd>{file.d}</dd></div>
          <div><dt>Versão</dt><dd>{file.v} · {STATUS_TEXT[file.st]}</dd></div><div><dt>Tamanho</dt><dd>{fmtBytes(file.s)}</dd></div>
          <div><dt>Criado</dt><dd>{fmtDate(file.cr)}</dd></div><div><dt>Modificado</dt><dd>{fmtDate(file.md)}</dd></div>
        </dl>
        <pre className="dh-docbody">{docContent(file)}</pre>
        <footer>
          {verdict === 'checking' && <span className="dh-verdict">Verificando…</span>}
          {verdict === 'wrong' && <span className="dh-verdict wrong" role="status"><Info size={15} /> Este não é o documento solicitado. Continue procurando.</span>}
          {verdict === 'correct' && <span className="dh-verdict ok" role="status"><CheckCircle2 size={15} /> Documento correto!</span>}
          {verdict === 'error' && <span className="dh-verdict wrong" role="status"><Info size={15} /> Não foi possível validar agora.</span>}
          <button type="button" className="dh-btn ghost" onClick={onClose}>Fechar</button>
        </footer>
      </section>
    </div>
  );
}

import { useEffect } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { docContent, fmtBytes, fmtDate, STATUS_TEXT } from '../lib/format.js';
import { FileGlyph, TYPE_NAME } from '../lib/files.jsx';

// Painel de visualização (como no Windows 11): não bloqueia a lista; no celular vira uma folha inferior.
export default function PreviewPane({ file, path, verdict, onClose }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <aside className="dh-preview" aria-label={`Visualização de ${file.n}`}>
      <span className="dh-grab" aria-hidden="true" />
      <header>
        <FileGlyph ext={file.e} size={30} />
        <div><strong>{file.n}</strong><small>{path.map((p) => p.n).join(' › ')}</small></div>
        <button type="button" className="dh-x" onClick={onClose} aria-label="Fechar visualização"><X size={18} /></button>
      </header>
      <div className="dh-pv-verdict" role="status" aria-live="polite">
        {verdict === 'checking' && <span className="dh-verdict">Verificando…</span>}
        {verdict === 'wrong' && <span className="dh-verdict wrong"><Info size={15} /> Este não é o documento solicitado. Continue procurando.</span>}
        {verdict === 'correct' && <span className="dh-verdict ok"><CheckCircle2 size={15} /> Documento correto!</span>}
        {verdict === 'error' && <span className="dh-verdict wrong"><Info size={15} /> Não foi possível validar agora.</span>}
      </div>
      <div className="dh-pv-scroll">
        <dl className="dh-docmeta">
          <div><dt>Tipo</dt><dd>{TYPE_NAME[file.e]}</dd></div><div><dt>Classificação</dt><dd>{file.cl || '—'} · {file.d}</dd></div>
          <div><dt>Versão</dt><dd>{file.v} · {STATUS_TEXT[file.st]}</dd></div><div><dt>Tamanho</dt><dd>{fmtBytes(file.s)}</dd></div>
          <div><dt>Criado</dt><dd>{fmtDate(file.cr)}</dd></div><div><dt>Modificado</dt><dd>{fmtDate(file.md)}</dd></div>
        </dl>
        <pre className="dh-docbody">{docContent(file)}</pre>
      </div>
    </aside>
  );
}

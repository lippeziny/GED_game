// Ícones no estilo "Office/Windows 11": pasta amarela e arquivos com selo colorido da extensão.
export function FolderIcon({ size = 24, open = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h6.2c.7 0 1.3.3 1.8.8l1.4 1.4c.4.4 1 .6 1.6.6H26.5A2.5 2.5 0 0 1 29 11.3V24.5A2.5 2.5 0 0 1 26.5 27h-21A2.5 2.5 0 0 1 3 24.5z" fill="#e6a417" />
      <path d={open ? 'M3 13.5A2.5 2.5 0 0 1 5.5 11H27a2 2 0 0 1 1.9 2.6l-2.6 10.1A2.5 2.5 0 0 1 23.900 25.500H5.500A2.5 2.500 0 0 1 3 23z' : 'M3 12.500A2.500 2.500 0 0 1 5.500 10H26.500A2.500 2.500 0 0 1 29 12.500V24.500A2.500 2.500 0 0 1 26.500 27H5.500A2.500 2.500 0 0 1 3 24.500z'} fill="#ffcf4a" />
    </svg>
  );
}

const EXT_LABEL = { pdf: 'PDF', docx: 'W', xlsx: 'X', pptx: 'P', txt: 'TXT', csv: 'CSV' };
export function FileGlyph({ ext, size = 28 }) {
  return <span className={`dh-fi ${ext}`} style={{ width: size, height: size * 1.2, fontSize: size * (EXT_LABEL[ext]?.length > 1 ? 0.3 : 0.5) }} aria-hidden="true">{EXT_LABEL[ext] || ext.slice(0, 3).toUpperCase()}</span>;
}
export const TYPE_NAME = { pdf: 'Documento PDF', docx: 'Documento do Word', xlsx: 'Planilha do Excel', pptx: 'Apresentação do PowerPoint', txt: 'Documento de texto', csv: 'Arquivo CSV' };

export function sortItems(items, key, dir) {
  const sign = dir === 'asc' ? 1 : -1;
  const folders = items.filter((i) => !i.id); const files = items.filter((i) => i.id);
  const byName = (a, b) => a.n.localeCompare(b.n, 'pt-BR', { numeric: true, sensitivity: 'base' });
  const cmp = (a, b) => {
    if (key === 'size') return ((a.s || 0) - (b.s || 0)) || byName(a, b);
    if (key === 'ext') return (a.e || '').localeCompare(b.e || '') || byName(a, b);
    return byName(a, b);
  };
  folders.sort((a, b) => (key === 'name' ? cmp(a, b) * sign : byName(a, b)));
  files.sort((a, b) => cmp(a, b) * sign);
  return [...folders, ...files];
}

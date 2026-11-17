import { File, FileSpreadsheet, FileText, FileType } from 'lucide-react';

export function fileIcon(ext, size = 20) {
  if (['xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={size} aria-hidden="true" />;
  if (ext === 'pptx') return <FileType size={size} aria-hidden="true" />;
  if (['pdf', 'docx', 'txt'].includes(ext)) return <FileText size={size} aria-hidden="true" />;
  return <File size={size} aria-hidden="true" />;
}
export const fileTone = (ext) => (['xlsx', 'csv'].includes(ext) ? 'green' : ext === 'pptx' ? 'orange' : ext === 'pdf' ? 'red' : 'blue');

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

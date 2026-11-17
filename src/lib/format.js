export const fmtSeconds = (ms = 0) => `${(Math.max(0, ms) / 1000).toFixed(2).replace('.', ',')} s`;
export function fmtClock(ms = 0) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
export function fmtStopwatch(ms = 0) {
  const t = Math.max(0, ms); const m = Math.floor(t / 60000); const s = Math.floor((t % 60000) / 1000); const c = Math.floor((t % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}
export const ordinal = (n) => `${n}º`;
export function fmtBytes(b) { if (b < 1024) return `${b} B`; if (b < 1048576) return `${Math.round(b / 1024)} KB`; return `${(b / 1048576).toFixed(1)} MB`; }
export const fmtDate = (iso = '') => iso.split('-').reverse().join('/');
export const STATUS_TEXT = { '': 'Versão final', RASCUNHO: 'Rascunho', REVISAO: 'Em revisão' };

// Conteúdo textual demonstrativo de um documento simulado.
export function docContent(f) {
  const tipo = f.tp.toLowerCase().replace(/_/g, ' '); const assunto = f.as.toLowerCase().replace(/_/g, ' ');
  return [
    `NEXA SOLUÇÕES INTEGRADAS — ${f.d}`,
    `${tipo.toUpperCase()} · ${assunto.toUpperCase()}`,
    '',
    `Este é um documento fictício, criado apenas para fins educacionais. Ele representa um(a) ${tipo} sobre ${assunto} do setor ${f.d}, em sua versão ${f.v} (${STATUS_TEXT[f.st].toLowerCase()}).`,
    '',
    '1. Objetivo — registrar formalmente a informação do processo, com identificação do responsável e da vigência.',
    '2. Escopo — aplica-se às áreas envolvidas, conforme a política de gestão documental da empresa.',
    '3. Controle — alterações geram nova versão; versões anteriores são mantidas para consulta e auditoria.',
    '',
    `Criado em ${fmtDate(f.cr)} · Modificado em ${fmtDate(f.md)}`,
  ].join('\n');
}

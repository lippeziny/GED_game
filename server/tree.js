// Gerador determinístico da árvore documental de cada nível.
// O alvo é conhecido apenas pelo servidor (a árvore enviada ao cliente não o marca).
import { TOTAL_LEVELS } from '../shared/constants.js';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEPTS = [
  { code: 'RH', folder: 'Recursos Humanos', areas: ['Admissões', 'Contratos', 'Treinamentos'], docs: [['CONTRATO', 'TRABALHO'], ['FICHA', 'CADASTRAL'], ['FOLHA', 'PAGAMENTO'], ['CERTIFICADO', 'TREINAMENTO'], ['ASO', 'ADMISSIONAL']] },
  { code: 'FIN', folder: 'Financeiro', areas: ['Contas a pagar', 'Contas a receber', 'Relatórios'], docs: [['RELATORIO', 'FINANCEIRO'], ['NOTA', 'FISCAL'], ['BALANCETE', 'MENSAL'], ['ORCAMENTO', 'ANUAL'], ['CONCILIACAO', 'BANCARIA']] },
  { code: 'JUR', folder: 'Jurídico', areas: ['Contratos', 'Processos', 'Pareceres'], docs: [['CONTRATO', 'PRESTACAO_SERVICOS'], ['PARECER', 'JURIDICO'], ['PROCURACAO', 'GERAL'], ['NOTIFICACAO', 'EXTRAJUDICIAL'], ['ACORDO', 'CONFIDENCIALIDADE']] },
  { code: 'TI', folder: 'Tecnologia da Informação', areas: ['Infraestrutura', 'Segurança da Informação', 'Sistemas'], docs: [['PROCEDIMENTO', 'BACKUP'], ['POLITICA', 'SENHAS'], ['RELATORIO', 'INCIDENTE'], ['INVENTARIO', 'ATIVOS'], ['PLANO', 'CONTINUIDADE']] },
  { code: 'COM', folder: 'Comercial', areas: ['Clientes', 'Propostas', 'Vendas'], docs: [['PROPOSTA', 'COMERCIAL'], ['CONTRATO', 'VENDA'], ['RELATORIO', 'VENDAS'], ['TABELA', 'PRECOS'], ['ATA', 'NEGOCIACAO']] },
  { code: 'OPS', folder: 'Operações', areas: ['Procedimentos', 'Relatórios operacionais', 'Auditorias'], docs: [['POP', 'EXPEDICAO'], ['RELATORIO', 'PRODUCAO'], ['CHECKLIST', 'AUDITORIA'], ['INSTRUCAO', 'TRABALHO'], ['LAUDO', 'INSPECAO']] },
  { code: 'DIR', folder: 'Diretoria', areas: ['Reuniões', 'Atas', 'Comunicados'], docs: [['ATA', 'REUNIAO'], ['COMUNICADO', 'INTERNO'], ['PAUTA', 'REUNIAO'], ['RESOLUCAO', 'DIRETORIA'], ['PLANO', 'ESTRATEGICO']] },
  { code: 'SUP', folder: 'Suprimentos', areas: ['Compras', 'Fornecedores', 'Estoque'], docs: [['PEDIDO', 'COMPRA'], ['COTACAO', 'FORNECEDOR'], ['INVENTARIO', 'ESTOQUE'], ['CONTRATO', 'FORNECIMENTO'], ['AVALIACAO', 'FORNECEDOR']] },
  { code: 'MKT', folder: 'Marketing', areas: ['Campanhas', 'Identidade visual', 'Redes sociais'], docs: [['BRIEFING', 'CAMPANHA'], ['RELATORIO', 'MIDIA'], ['MANUAL', 'MARCA'], ['CALENDARIO', 'EDITORIAL'], ['PROPOSTA', 'AGENCIA']] },
  { code: 'GOV', folder: 'Governança e Compliance', areas: ['Políticas', 'Auditorias', 'Comitês'], docs: [['POLITICA', 'COMPLIANCE'], ['RELATORIO', 'AUDITORIA'], ['ATA', 'COMITE'], ['CODIGO', 'CONDUTA'], ['MATRIZ', 'RISCOS']] },
];

const EXTS = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv'];
const KB = { pdf: [180, 980], docx: [90, 620], xlsx: [120, 1450], pptx: [350, 2600], txt: [8, 85], csv: [25, 340] };
// Níveis intermediários inspirados no ciclo de vida documental (arquivo corrente, intermediário e permanente).
const TIERS = [['Fase Corrente', 'Fase Intermediária', 'Fase Permanente'], ['Originais', 'Cópias', 'Anexos'], ['Interno', 'Externo']];
// Áreas comuns a todos os setores (plano de classificação).
const COMMON = [
  { name: 'Correspondências', docs: [['OFICIO', 'EXPEDIDO'], ['CIRCULAR', 'INTERNA'], ['MEMORANDO', 'INTERNO']] },
  { name: 'Relatórios e Atas', docs: [['RELATORIO', 'GERENCIAL'], ['ATA', 'REUNIAO'], ['LISTA', 'PRESENCA']] },
  { name: 'Modelos e Formulários', docs: [['FORMULARIO', 'PADRAO'], ['MODELO', 'DOCUMENTO'], ['CHECKLIST', 'PADRAO']] },
  { name: 'Controle e Registros', docs: [['REGISTRO', 'CONTROLE'], ['PROTOCOLO', 'RECEBIMENTO'], ['TERMO', 'RESPONSABILIDADE']] },
];

// d: setores; a: áreas próprias (até 3); c: áreas comuns (até 4); t: níveis intermediários; b: ramificação;
// y: anos; f: arquivos por pasta final; x: armadilhas
const PARAMS = [
  { d: 2, a: 2, c: 0, t: 0, b: 2, y: 2, f: 4, x: 3 },
  { d: 3, a: 3, c: 0, t: 1, b: 2, y: 2, f: 3, x: 4 },
  { d: 4, a: 3, c: 1, t: 1, b: 2, y: 3, f: 3, x: 6 },
  { d: 5, a: 3, c: 1, t: 1, b: 3, y: 3, f: 3, x: 8 },
  { d: 6, a: 3, c: 2, t: 1, b: 3, y: 3, f: 3, x: 10 },
  { d: 6, a: 3, c: 2, t: 2, b: 2, y: 3, f: 3, x: 12 },
  { d: 7, a: 3, c: 3, t: 2, b: 2, y: 3, f: 3, x: 14 },
  { d: 8, a: 3, c: 3, t: 2, b: 2, y: 3, f: 3, x: 16 },
  { d: 9, a: 3, c: 4, t: 2, b: 2, y: 3, f: 3, x: 18 },
  { d: 10, a: 3, c: 4, t: 2, b: 2, y: 3, f: 3, x: 22 },
];

// Alvos: departamento, índice do tipo documental, ano, versão, status ('' = final), extensão
const TARGETS = [
  { dept: 'RH', doc: 0, year: 2026, ver: 1, status: '', ext: 'pdf' },
  { dept: 'FIN', doc: 0, year: 2025, ver: 2, status: '', ext: 'docx' },
  { dept: 'TI', doc: 0, year: 2026, ver: 1, status: '', ext: 'docx' },
  { dept: 'DIR', doc: 0, year: 2026, ver: 1, status: '', ext: 'pdf' },
  { dept: 'JUR', doc: 0, year: 2025, ver: 3, status: '', ext: 'pdf' },
  { dept: 'COM', doc: 0, year: 2025, ver: 4, status: 'REVISAO', ext: 'pdf' },
  { dept: 'OPS', doc: 2, year: 2024, ver: 2, status: '', ext: 'xlsx' },
  { dept: 'SUP', doc: 3, year: 2025, ver: 2, status: '', ext: 'pdf' },
  { dept: 'GOV', doc: 1, year: 2025, ver: 3, status: '', ext: 'docx' },
  { dept: 'RH', doc: 0, year: 2024, ver: 5, status: '', ext: 'pdf' },
];

const pad = (n) => String(n).padStart(2, '0');
export function docName(d) {
  return `${d.tipo}_${d.assunto}_${d.dept}_${d.year}_V${pad(d.ver)}${d.status ? `_${d.status}` : ''}.${d.ext}`;
}
const STATUS_LABEL = { '': 'versão final', RASCUNHO: 'rascunho', REVISAO: 'em revisão' };
const human = (s) => s.toLowerCase().replace(/_/g, ' ');

export function describeTarget(t) {
  return `${human(t.tipo)} — ${human(t.assunto)}, setor ${t.dept}, ano ${t.year}, versão ${pad(t.ver)} (${STATUS_LABEL[t.status]}), formato ${t.ext.toUpperCase()}.`;
}

export function levelParams(level) { return PARAMS[level - 1]; }

export function buildLevel(level, seed = 1) {
  if (level < 1 || level > TOTAL_LEVELS) throw new Error('Nível inválido');
  const P = PARAMS[level - 1];
  const T = TARGETS[level - 1];
  const rand = rng(seed * 7919 + level * 104729);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  let nextId = 1;
  const newId = () => `f${(nextId++).toString(36)}${Math.floor(rand() * 1296).toString(36)}`;

  const targetDept = DEPTS.find((x) => x.code === T.dept);
  const deptList = [targetDept, ...DEPTS.filter((x) => x !== targetDept)].slice(0, P.d);
  const years = Array.from({ length: P.y }, (_, i) => 2026 - i);
  if (!years.includes(T.year)) years[years.length - 1] = T.year;
  years.sort((a, b) => b - a);

  const root = { n: 'Empresa', c: [] };
  const leaves = []; // { dept, areaIdx, year, folder, tiers }
  const tgtTypes = targetDept.docs[T.doc];
  const target = { tipo: tgtTypes[0], assunto: tgtTypes[1], dept: T.dept, year: T.year, ver: T.ver, status: T.status, ext: T.ext };
  const targetName = docName(target);
  const targetTiers = TIERS.slice(0, P.t).map((tier) => Math.floor(rand() * Math.min(P.b, tier.length)));
  const targetAreaIdx = Math.floor(rand() * P.a);
  const pad2 = (n) => String(n).padStart(2, '0');

  deptList.forEach((dept) => {
    const di = DEPTS.indexOf(dept);
    const dNode = { n: `${pad2(di + 1)} - ${dept.folder}`, c: [] };
    root.c.push(dNode);
    const areaList = [...dept.areas.slice(0, P.a).map((name) => ({ name, docs: dept.docs })), ...COMMON.slice(0, P.c)];
    areaList.forEach((area, areaIdx) => {
      const aNode = { n: `${pad2(di + 1)}.${areaIdx + 1} - ${area.name}`, c: [] };
      dNode.c.push(aNode);
      let level0 = [{ node: aNode, tiers: [] }];
      for (let ti = 0; ti < P.t; ti += 1) {
        const next = [];
        level0.forEach(({ node, tiers }) => {
          TIERS[ti].slice(0, P.b).forEach((label, idx) => {
            const child = { n: label, c: [] };
            node.c.push(child);
            next.push({ node: child, tiers: [...tiers, idx] });
          });
        });
        level0 = next;
      }
      level0.forEach(({ node, tiers }) => {
        years.forEach((year) => {
          const yNode = { n: String(year), c: [] };
          node.c.push(yNode);
          leaves.push({ dept, areaIdx, year, folder: yNode, tiers, docs: area.docs, cl: `${pad2(di + 1)}.${areaIdx + 1}` });
        });
      });
    });
  });

  const used = new Map(); // folder -> Set de nomes
  const addFile = (folder, d, forcedName, cl = '') => {
    const name = forcedName || docName(d);
    const set = used.get(folder) || new Set();
    if (set.has(name)) return false;
    set.add(name); used.set(folder, set);
    const [lo, hi] = KB[d.ext];
    const kb = lo + Math.floor(rand() * (hi - lo + 1));
    const created = `${d.year}-${pad(1 + Math.floor(rand() * 12))}-${pad(1 + Math.floor(rand() * 28))}`;
    folder.c.push({
      id: newId(), n: name, e: d.ext, s: kb * 1024, tp: d.tipo, as: d.assunto, d: d.dept,
      v: pad(d.ver), st: d.status, cl, cr: created, md: `${d.year + (d.ver > 2 ? 1 : 0) > 2026 ? 2026 : d.year + (d.ver > 2 ? 1 : 0)}-${pad(1 + Math.floor(rand() * 12))}-${pad(1 + Math.floor(rand() * 28))}`,
    });
    return true;
  };

  // Localização válida única do alvo
  const targetLeaf = leaves.find((l) => l.dept.code === T.dept && l.areaIdx === targetAreaIdx && l.year === T.year && l.tiers.every((v, i) => v === targetTiers[i]));
  let targetId = null;
  addFile(targetLeaf.folder, target, undefined, targetLeaf.cl);
  targetId = targetLeaf.folder.c[targetLeaf.folder.c.length - 1].id;

  // Enchimento regular: documentos plausíveis em todas as pastas finais
  leaves.forEach((leaf) => {
    let guard = 0; let added = 0;
    while (added < P.f && guard < 30) {
      guard += 1;
      const [tipo, assunto] = pick(leaf.docs);
      const d = { tipo, assunto, dept: leaf.dept.code, year: leaf.year, ver: 1 + Math.floor(rand() * 4), status: pick(['', '', 'RASCUNHO', 'REVISAO']), ext: pick(EXTS) };
      if (docName(d) === targetName) continue;
      if (addFile(leaf.folder, d, undefined, leaf.cl)) added += 1;
    }
  });

  // Armadilhas: variações de um único atributo do alvo
  const sameLeaf = (l) => l.dept.code === T.dept && l.areaIdx === targetAreaIdx;
  const siblingSubject = targetDept.docs[(T.doc + 1) % targetDept.docs.length];
  const otherDept = deptList.find((x) => x.code !== T.dept);
  const otherYears = years.filter((y) => y !== T.year);
  const otherExt = EXTS.filter((e) => e !== T.ext);
  const variants = [
    () => ({ d: { ...target, ver: target.ver === 1 ? 2 : target.ver - 1 }, at: targetLeaf }),
    () => ({ d: { ...target, status: 'RASCUNHO' }, at: targetLeaf }),
    () => ({ d: { ...target, ext: pick(otherExt) }, at: targetLeaf }),
    () => ({ d: { ...target, ver: target.ver + 1 }, at: targetLeaf }),
    () => {
      const y = pick(otherYears.length ? otherYears : [T.year - 1]);
      return { d: { ...target, year: y }, at: leaves.find((l) => sameLeaf(l) && l.year === y && l.tiers.every((v, i) => v === targetTiers[i])) };
    },
    () => ({ d: { ...target, tipo: siblingSubject[0], assunto: siblingSubject[1] }, at: targetLeaf }),
    () => (otherDept ? { d: { ...target, dept: otherDept.code }, at: leaves.find((l) => l.dept.code === otherDept.code && l.year === T.year) } : null),
    () => ({ d: { ...target }, name: `${targetName.replace(/_/g, '-')}`, at: targetLeaf }), // nomenclatura fora do padrão
    () => ({ d: { ...target }, name: targetName.replace(/_V0?(\d)/, '_v$1'), at: targetLeaf }),
    () => ({ d: { ...target }, name: targetName.replace(/\.(\w+)$/, ' (cópia).$1'), at: targetLeaf }),
    () => ({ d: { ...target, ver: target.ver + 2, status: 'REVISAO' }, at: leaves.find((l) => sameLeaf(l) && l.year === T.year && l.tiers.some((v, i) => v !== targetTiers[i])) || targetLeaf }),
    () => ({ d: { ...target, ext: pick(otherExt), ver: Math.max(1, target.ver - 1) }, at: leaves.find((l) => sameLeaf(l) && l.year === T.year) || targetLeaf }),
  ];
  const sameAreaLeaves = leaves.filter((l) => sameLeaf(l) && l.year === T.year);
  for (let i = 0; i < P.x; i += 1) {
    const v = variants[i % variants.length]();
    if (!v || !v.at) continue;
    const at = i >= variants.length ? pick(sameAreaLeaves) : v.at;
    const name = v.name || docName(v.d);
    if (name === targetName) continue;
    addFile(at.folder, v.d, name, at.cl);
  }

  root.c.sort((a, b) => a.n.localeCompare(b.n));
  const fase = P.t >= 1 ? ` Arquivado na ${TIERS[0][targetTiers[0]]}.` : '';
  return { root, targetId, targetName, target, description: describeTarget(target) + fase, level };
}

export function countNodes(node) {
  let files = 0; let folders = 0; let depth = 0;
  const walk = (n, dpt) => {
    depth = Math.max(depth, dpt);
    (n.c || []).forEach((ch) => { if (ch.id) files += 1; else { folders += 1; walk(ch, dpt + 1); } });
  };
  walk(node, 0);
  return { files, folders, depth };
}

export function findById(node, id) {
  for (const ch of node.c || []) {
    if (ch.id === id) return ch;
    if (!ch.id) { const r = findById(ch, id); if (r) return r; }
  }
  return null;
}

const extSizes = {
  pdf: [180, 980], docx: [90, 620], xlsx: [120, 1450], pptx: [350, 2600], csv: [25, 340], txt: [8, 85], png: [240, 1900], jpg: [180, 1300],
};

const departments = [
  { folder: '01_GOVERNANCA_E_COMPLIANCE', code: 'GOV', labels: ['POLITICAS', 'AUDITORIAS', 'COMITES'] },
  { folder: '02_FINANCEIRO_E_CONTABIL', code: 'FIN', labels: ['CONTAS_A_PAGAR', 'CONTAS_A_RECEBER', 'FECHAMENTO_CONTABIL'] },
  { folder: '03_RECURSOS_HUMANOS', code: 'RH', labels: ['CADASTRO_E_MOVIMENTACOES', 'FOLHA_DE_PAGAMENTO', 'TREINAMENTO_E_DESENVOLVIMENTO'] },
  { folder: '04_COMERCIAL_E_CLIENTES', code: 'COM', labels: ['CLIENTES', 'PROPOSTAS', 'PEDIDOS_E_VENDAS'] },
  { folder: '05_OPERACOES_E_PROJETOS', code: 'OPS', labels: ['PROJETOS', 'PROCESSOS', 'RELATORIOS_OPERACIONAIS'] },
  { folder: '06_JURIDICO_E_CONTRATOS', code: 'JUR', labels: ['CONTRATOS', 'PARECERES', 'PROCESSOS'] },
  { folder: '07_TI_E_SEGURANCA_DA_INFORMACAO', code: 'TI', labels: ['ATIVOS_E_INFRAESTRUTURA', 'ACESSOS', 'GESTAO_DE_INCIDENTES'] },
  { folder: '08_MARKETING_E_COMUNICACAO', code: 'MKT', labels: ['IDENTIDADE_VISUAL', 'CAMPANHAS', 'REDES_SOCIAIS'] },
  { folder: '09_SUPRIMENTOS_E_FORNECEDORES', code: 'SUP', labels: ['FORNECEDORES', 'COMPRAS', 'ESTOQUE'] },
  { folder: '10_ARQUIVO_HISTORICO', code: 'ARQ', labels: ['DOCUMENTOS_PERMANENTES', 'DOCUMENTOS_INTERMEDIARIOS', 'ELIMINACAO_DOCUMENTAL'] },
];

export const LEVELS = [
  {
    level: 1, title: 'Primeiros passos', difficulty: 'Fácil', color: 'easy',
    targetFileId: 'target-01',
    targetFileName: '2025-02-14_RH_FICHA-CADASTRAL_COLABORADOR-018_v01_ATIVO.pdf',
    clue: 'Localize a ficha cadastral ativa do colaborador 018, criada em 14 de fevereiro de 2025.',
    path: ['03_RECURSOS_HUMANOS', '2025', '01_CADASTRO_E_MOVIMENTACOES', 'FICHAS_CADASTRAIS'],
  },
  {
    level: 2, title: 'Rotina financeira', difficulty: 'Fácil +', color: 'easy',
    targetFileId: 'target-02',
    targetFileName: '2025-06-30_FIN_RELATORIO-FECHAMENTO-MENSAL_2025-06_v02_APROVADO.xlsx',
    clue: 'Encontre o fechamento financeiro de junho de 2025 na versão 02, com status aprovado.',
    path: ['02_FINANCEIRO_E_CONTABIL', '2025', '04_FECHAMENTO_CONTABIL', 'RELATORIOS_MENSAIS'],
  },
  {
    level: 3, title: 'Contratos e versões', difficulty: 'Intermediário', color: 'mid',
    targetFileId: 'target-03',
    targetFileName: '2025-03-12_JUR_CONTRATO-PRESTACAO-SERVICOS_FORNECEDOR-042_v03_ASSINADO.pdf',
    clue: 'Procure o contrato de prestação de serviços do fornecedor 042. Atenção à versão assinada.',
    path: ['06_JURIDICO_E_CONTRATOS', '2025', '02_CONTRATOS', '03_PRESTACAO_DE_SERVICOS'],
  },
  {
    level: 4, title: 'Propostas comerciais', difficulty: 'Intermediário', color: 'mid',
    targetFileId: 'target-04',
    targetFileName: '2025-08-05_COM_PROPOSTA-COMERCIAL_CLIENTE-117_v04_ENVIADA.pdf',
    clue: 'Encontre a proposta comercial do cliente 117, versão 04, já enviada.',
    path: ['04_COMERCIAL_E_CLIENTES', '2025', '03_PROPOSTAS', 'PROPOSTAS_ENVIADAS'],
  },
  {
    level: 5, title: 'Segurança da informação', difficulty: 'Intermediário +', color: 'hard',
    targetFileId: 'target-05',
    targetFileName: '2025-05-21_TI_RELATORIO-INCIDENTE-SEGURANCA_INC-2025-014_v02_RESTRITO.pdf',
    clue: 'Localize o relatório restrito do incidente de segurança INC-2025-014, versão 02.',
    path: ['07_TI_E_SEGURANCA_DA_INFORMACAO', '2025', '04_GESTAO_DE_INCIDENTES', 'RELATORIOS_DE_INCIDENTES'],
  },
  {
    level: 6, title: 'Projetos e cronogramas', difficulty: 'Difícil', color: 'hard',
    targetFileId: 'target-06',
    targetFileName: '2025-09-30_OPS_CRONOGRAMA-PROJETO-ATLAS_v06_APROVADO.xlsx',
    clue: 'Ache o cronograma do Projeto Atlas, versão 06. Há versões anteriores e arquivos de acompanhamento.',
    path: ['05_OPERACOES_E_PROJETOS', '2025', '02_PROJETOS', 'PROJETO_ATLAS', 'CRONOGRAMAS'],
  },
  {
    level: 7, title: 'Compras e suprimentos', difficulty: 'Difícil', color: 'hard',
    targetFileId: 'target-07',
    targetFileName: '2025-07-17_SUP_PEDIDO-COMPRA_PC-2025-088_v03_APROVADO.pdf',
    clue: 'Encontre o pedido de compra PC-2025-088, versão 03, aprovado em julho.',
    path: ['09_SUPRIMENTOS_E_FORNECEDORES', '2025', '03_COMPRAS', 'PEDIDOS_DE_COMPRA'],
  },
  {
    level: 8, title: 'Governança e memória', difficulty: 'Muito difícil', color: 'expert',
    targetFileId: 'target-08',
    targetFileName: '2024-12-19_GOV_ATA-COMITE-RISCOS_REUNIAO-04_v01_ASSINADA.pdf',
    clue: 'Localize a ata assinada da quarta reunião do Comitê de Riscos, de dezembro de 2024.',
    path: ['01_GOVERNANCA_E_COMPLIANCE', '2024', '03_COMITES', 'COMITE_DE_RISCOS', 'ATAS'],
  },
  {
    level: 9, title: 'Campanhas e comunicação', difficulty: 'Muito difícil', color: 'expert',
    targetFileId: 'target-09',
    targetFileName: '2025-10-03_MKT_PLANO-CAMPANHA-ORBITA_v05_APROVADO.pptx',
    clue: 'Ache o plano da campanha Órbita, versão 05, aprovado. Confirme também a extensão correta.',
    path: ['08_MARKETING_E_COMUNICACAO', '2025', '02_CAMPANHAS', 'CAMPANHA_ORBITA', 'PLANOS'],
  },
  {
    level: 10, title: 'Arquivo jurídico histórico', difficulty: 'Especialista', color: 'expert',
    targetFileId: 'target-10',
    targetFileName: '2023-11-28_JUR_PARECER-REGULATORIO_PROCESSO-019_v07_FINAL.pdf',
    clue: 'Encontre o parecer regulatório final do processo 019, versão 07, no acervo histórico correto.',
    path: ['06_JURIDICO_E_CONTRATOS', '2023', '04_PARECERES', 'REGULATORIO', 'PARECERES_FINAIS'],
  },
];

function makeFolder(id, name) {
  return { id, name, type: 'folder', children: [] };
}

function makeFile(id, name, extension, size, modifiedAt, description = '') {
  return {
    id, name, type: 'file', extension, size, modifiedAt, description,
    content: `${name}\n\nNEXA Soluções Integradas Ltda.\nDocumento de demonstração — conteúdo fictício para atividade educativa.\n\nClassificação: Uso interno\nResponsável: Núcleo de Gestão Documental\n\nEste arquivo é apenas uma representação textual. Não contém dados pessoais reais nem deve ser utilizado como documento empresarial.`,
  };
}

function ensureFolder(parent, name) {
  let found = parent.children.find((item) => item.type === 'folder' && item.name === name);
  if (!found) {
    found = makeFolder(`${parent.id}/${name}`, name);
    parent.children.push(found);
  }
  return found;
}

function findFolder(root, path) {
  return path.reduce((node, part) => node.children.find((item) => item.type === 'folder' && item.name === part), root);
}

function addPath(root, parts) {
  return parts.reduce((node, part) => ensureFolder(node, part), root);
}

const extensions = ['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'txt'];
const datePool = ['2025-01-08', '2025-02-11', '2025-03-04', '2025-04-16', '2025-05-09', '2025-06-18', '2025-07-02', '2025-08-21', '2025-09-12', '2025-10-06', '2024-11-22', '2023-08-14'];
const statuses = ['APROVADO', 'EM-REVISAO', 'RASCUNHO', 'FINAL', 'ASSINADO', 'VIGENTE'];
const subjectPool = ['RELATORIO-MENSAL', 'PLANO-DE-ACAO', 'REGISTRO-DE-ATIVIDADE', 'SOLICITACAO-INTERNA', 'TERMO-DE-RESPONSABILIDADE', 'CONTROLE-DE-VERSOES', 'RESUMO-EXECUTIVO', 'MAPA-DE-PROCESSO', 'CHECKLIST-OPERACIONAL', 'MEMORANDO-INTERNO'];

export function buildCompanyDrive() {
  const root = makeFolder('root', 'Meu Drive');
  let serial = 1;

  departments.forEach((department, departmentIndex) => {
    const deptFolder = ensureFolder(root, department.folder);
    ['2023', '2024', '2025'].forEach((year, yearIndex) => {
      const yearFolder = ensureFolder(deptFolder, year);
      department.labels.forEach((label, labelIndex) => {
        const category = ensureFolder(yearFolder, `${String(labelIndex + 1).padStart(2, '0')}_${label}`);
        const variants = [
          ensureFolder(category, '01_DOCUMENTOS_VIGENTES'),
          ensureFolder(category, '02_EM_TRAMITACAO'),
        ];
        variants.forEach((destination, variantIndex) => {
          for (let index = 0; index < 4; index += 1) {
            const date = datePool[(serial + departmentIndex + yearIndex + index + labelIndex) % datePool.length];
            const subject = subjectPool[(serial + index * 2 + labelIndex) % subjectPool.length];
            const ext = extensions[(serial + index + yearIndex) % extensions.length];
            const number = String(serial).padStart(4, '0');
            const version = String(((serial + index) % 4) + 1).padStart(2, '0');
            const status = statuses[(serial + variantIndex + index) % statuses.length];
            const fileName = `${date}_${department.code}_${subject}_DOC-${number}_v${version}_${status}.${ext}`;
            const [min, max] = extSizes[ext];
            const size = min + ((serial * 137 + index * 59) % (max - min + 1));
            destination.children.push(makeFile(`doc-${serial}`, fileName, ext, size, date));
            serial += 1;
          }
        });
      });
    });
  });

  LEVELS.forEach((level, index) => {
    const destination = addPath(root, level.path);
    const ext = level.targetFileName.split('.').pop();
    const [min, max] = extSizes[ext] || [100, 900];
    const size = min + ((index * 177 + 43) % (max - min + 1));
    const date = level.targetFileName.slice(0, 10);

    // Decoys are deliberately similar: previous versions, drafts and nearby records.
    const base = level.targetFileName.replace(/_v\d{2}_/, '_v01_').replace(/\.[^.]+$/, '');
    const decoyNames = [
      `${base.replace(/_v01_/, '_v00_')}_ARQUIVADO.${ext}`,
      `${base.replace(/_v01_/, '_v02_')}_RASCUNHO.${ext}`,
      `${base.replace(/_v01_/, '_v03_')}_EM-REVISAO.${ext}`,
      `${date}_${['RH','FIN','JUR','COM','TI','OPS','SUP','GOV','MKT','JUR'][index]}_ANEXO-COMPROBATORIO_REF-${String(120 + index).padStart(3, '0')}_v01_VALIDADO.pdf`,
    ];
    decoyNames.forEach((name, decoyIndex) => {
      const decoyExt = name.split('.').pop();
      const [dMin, dMax] = extSizes[decoyExt] || [80, 500];
      destination.children.push(makeFile(`decoy-${index + 1}-${decoyIndex + 1}`, name, decoyExt, dMin + ((index * 211 + decoyIndex * 71) % (dMax - dMin + 1)), date));
    });

    destination.children.push(makeFile(level.targetFileId, level.targetFileName, ext, size, date, 'Documento-alvo do desafio.'));

    // Add additional files to increase the number of plausible choices in the final folder.
    for (let j = 0; j < 8 + index; j += 1) {
      const ext2 = extensions[(index + j + 2) % extensions.length];
      const [fMin, fMax] = extSizes[ext2];
      const d = datePool[(index * 3 + j) % datePool.length];
      const areaCode = level.targetFileName.split('_')[1];
      const name = `${d}_${areaCode}_${subjectPool[(j + index) % subjectPool.length]}_REF-${String(300 + index * 10 + j).padStart(3, '0')}_v${String((j % 5) + 1).padStart(2, '0')}_${statuses[(j + index) % statuses.length]}.${ext2}`;
      destination.children.push(makeFile(`extra-${index + 1}-${j + 1}`, name, ext2, fMin + ((j * 97 + index * 123) % (fMax - fMin + 1)), d));
    }
  });

  // Intentionally populate archive-like folders to make the navigation feel realistic.
  const archive = ensureFolder(root, '10_ARQUIVO_HISTORICO');
  const archiveIndex = ensureFolder(archive, '2022');
  ['01_DOCUMENTOS_CLASSIFICADOS', '02_CAIXAS_DIGITAIS', '03_INVENTARIO_DOCUMENTAL'].forEach((name, idx) => {
    const folder = ensureFolder(archiveIndex, name);
    for (let n = 0; n < 9; n += 1) {
      const ext = extensions[(idx + n) % extensions.length];
      const [min, max] = extSizes[ext];
      folder.children.push(makeFile(`archive-${idx}-${n}`, `2022-${String((n % 9) + 1).padStart(2, '0')}-15_ARQ_INVENTARIO-CAIXA-${String(idx * 10 + n + 1).padStart(3, '0')}_v01_HISTORICO.${ext}`, ext, min + ((n * 131) % (max - min + 1)), '2022-12-15'));
    }
  });

  return root;
}

export const ROOT_FOLDER = buildCompanyDrive();

export function findFileById(node, id) {
  if (!node) return null;
  if (node.type === 'file' && node.id === id) return node;
  for (const child of node.children || []) {
    const found = findFileById(child, id);
    if (found) return found;
  }
  return null;
}

export function getFolderByPath(path) {
  return findFolder(ROOT_FOLDER, path);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

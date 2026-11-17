// Constantes compartilhadas entre servidor e cliente.
export const TOTAL_LEVELS = 10;
export const COUNTDOWN_MS = 3000;
export const MAX_PLAYERS = 60;
export const NICK_MIN = 2;
export const NICK_MAX = 20;
// Pontuação por colocação (configurável: PONTOS_POR_COLOCACAO no ambiente, ex. "1000,900,800").
export const DEFAULT_POINTS = [1000, 900, 800, 700, 600];
export const MIN_POINTS = 100; // piso para colocações além da tabela
export const POINTS_STEP = 50; // decréscimo por colocação após a tabela

export const LEVEL_META = [
  { level: 1, title: 'Introdução', difficulty: 'Muito fácil', color: 'easy' },
  { level: 2, title: 'Organização básica', difficulty: 'Fácil', color: 'easy' },
  { level: 3, title: 'Classificação documental', difficulty: 'Fácil +', color: 'easy' },
  { level: 4, title: 'Estrutura intermediária', difficulty: 'Intermediário', color: 'mid' },
  { level: 5, title: 'Controle de versões', difficulty: 'Intermediário +', color: 'mid' },
  { level: 6, title: 'Busca por contexto', difficulty: 'Difícil', color: 'hard' },
  { level: 7, title: 'Complexidade avançada', difficulty: 'Difícil +', color: 'hard' },
  { level: 8, title: 'Gestão documental avançada', difficulty: 'Avançado', color: 'hard' },
  { level: 9, title: 'Desafio especializado', difficulty: 'Especialista', color: 'expert' },
  { level: 10, title: 'Desafio final', difficulty: 'Final', color: 'expert' },
];

export function pointsForPlace(place, table = DEFAULT_POINTS) {
  if (place < 1) return 0;
  if (place <= table.length) return table[place - 1];
  const last = table[table.length - 1];
  return Math.max(MIN_POINTS, last - (place - table.length) * POINTS_STEP);
}

export function formatMs(ms = 0) {
  const s = Math.max(0, ms) / 1000;
  return `${s.toFixed(2).replace('.', ',')} s`;
}

// Tempo limite por rodada (segundos), crescente com a dificuldade.
export const ROUND_SECONDS = [90, 120, 150, 180, 210, 240, 270, 300, 330, 360];

// Dicas educativas exibidas após cada rodada (feedback de GED).
export const TIPS = [
  'Hierarquia de pastas: o caminho (Setor › Área › Ano) já diz muito sobre o conteúdo antes de abrir o arquivo.',
  'Organização por departamento: cada documento pertence a um setor responsável, indicado na pasta e no nome.',
  'Classificação documental: o tipo (CONTRATO, ATA, RELATORIO…) e o assunto compõem o início do nome do arquivo.',
  'Padronização: TIPO_ASSUNTO_SETOR_ANO_VERSÃO. Seguir o padrão permite localizar e ordenar sem depender de busca.',
  'Controle de versões: V01, V02, V03… Quase sempre a versão mais alta e sem “RASCUNHO” é a vigente, mas confirme o que foi pedido.',
  'Rascunho não é versão final: sufixos como RASCUNHO e REVISAO indicam documentos ainda em elaboração.',
  'Nomes fora do padrão (hífens, “v1”, “(cópia)”) são sinais de duplicatas e dificultam a gestão documental.',
  'Mesmo assunto, setores diferentes: o código do setor no nome evita confundir documentos parecidos.',
  'Extensão importa: o mesmo documento pode existir em PDF (leitura/assinatura) e DOCX (edição) com finalidades distintas.',
  'Boas práticas: padronizar nomes, versionar, separar vigente de arquivo e definir responsáveis reduz erros e retrabalho.',
];

/**
 * Problema encontrado ao ler um arquivo do cofre. A leitura nunca lança por conteúdo inválido: o
 * que não se encaixa vira um `Problema` (onde e o quê) e o resto do arquivo continua sendo lido.
 * O `vault/` reexporta este tipo; o `doctor` lista os problemas.
 */

/** Lista fechada dos códigos de problema. */
export const CODIGOS_PROBLEMA = [
  'manifesto_invalido',
  'arquivo_ausente',
  'yaml_invalido',
  'cabecalho_invalido',
  'secao_ausente',
  'linha_invalida',
  'faixa_obrigatoria',
  'id_invalido',
  'id_duplicado',
  'bom',
  'cr_solto',
] as const;

export type CodigoProblema = (typeof CODIGOS_PROBLEMA)[number];

/**
 * `arquivo` é o caminho como quem leu o informou; `linha` (a partir de 1) aponta a linha do arquivo
 * quando o problema tem uma. A `mensagem` é em pt-BR e diz a posição e a parte a conferir (coluna,
 * campo, seção canônica), **nunca** o conteúdo lido: dado de saúde pode ir parar em log.
 */
export type Problema = {
  arquivo: string;
  linha?: number;
  codigo: CodigoProblema;
  mensagem: string;
};

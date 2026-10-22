/**
 * Utilidades de texto do formato v2: BOM, fim de linha, normalização de cabeçalhos, escape de
 * células e divisão em linhas. Tudo puro e sem perda: nada aqui reescreve o arquivo, só lê ou
 * prepara pedaços para o *splice* (ADR-0003).
 */

const BOM = '\uFEFF';

/** Remove o BOM (U+FEFF) do início, se houver, e diz se havia. Um U+FEFF no meio do texto fica. */
export function removerBom(s: string): { texto: string; tinhaBom: boolean } {
  return s.startsWith(BOM) ? { texto: s.slice(1), tinhaBom: true } : { texto: s, tinhaBom: false };
}

/**
 * Fim de linha dominante: `CRLF` só quando há mais `\r\n` que `\n` solto; empate (inclusive texto
 * sem quebra) dá `LF`, o padrão de arquivos novos. `\r` solto não é fim de linha.
 */
export function detectarEol(s: string): 'LF' | 'CRLF' {
  let crlf = 0;
  let lf = 0;
  for (let i = s.indexOf('\n'); i !== -1; i = s.indexOf('\n', i + 1)) {
    if (i > 0 && s[i - 1] === '\r') crlf++;
    else lf++;
  }
  return crlf > lf ? 'CRLF' : 'LF';
}

/**
 * Forma de comparação de cabeçalhos (FORMATO.md, "Cabeçalhos"): apara as pontas, normaliza o
 * Unicode para NFC, ignora maiúsculas e minúsculas (`pt-BR`) e colapsa qualquer sequência de
 * espaço em branco (tabulação, espaço inseparável, quebra de linha) num espaço só.
 */
export function normalizarCabecalho(s: string): string {
  return s.trim().normalize('NFC').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
}

/** Linha (a partir de 1) do offset: quantos `\n` há antes dele, mais 1. */
export function linhaDoOffset(fonte: string, offset: number): number {
  let linha = 1;
  for (let i = fonte.indexOf('\n'); i !== -1 && i < offset; i = fonte.indexOf('\n', i + 1)) linha++;
  return linha;
}

/** Ordem de nomes à moda do Explorer: sem distinguir acento nem caixa à primeira vista, e números por valor. */
const COLADOR = new Intl.Collator('pt-BR', { numeric: true });

/**
 * Ordem de dois textos para listas e pastas (`Ana 2` antes de `Ana 10`): pelo colador `pt-BR` com
 * números por valor; empate pelo texto, para a ordem ser a mesma em qualquer SO.
 */
export function compararTexto(a: string, b: string): number {
  return COLADOR.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Escreve o conteúdo de uma célula de tabela: todo `|` vira `\|` (nunca divide a célula). */
export function escaparCelula(s: string): string {
  return s.replaceAll('|', '\\|');
}

/** Lê o conteúdo de uma célula: `\|` volta a ser `|`. Inverso exato de `escaparCelula`. */
export function desescaparCelula(s: string): string {
  return s.replaceAll('\\|', '|');
}

/**
 * Divide o texto em linhas guardando o terminador original de cada uma (`'\n'`, `'\r\n'`, ou `''`
 * na última linha sem terminador). `linhas.length === eols.length` e
 * `linhas.map((l, i) => l + eols[i]).join('') === s`. Texto terminado em quebra não ganha uma
 * linha vazia extra; texto vazio não tem linhas. `\r` solto fica dentro da linha.
 */
export function dividirLinhas(s: string): { linhas: string[]; eols: string[] } {
  const linhas: string[] = [];
  const eols: string[] = [];
  let inicio = 0;
  for (let i = s.indexOf('\n'); i !== -1; i = s.indexOf('\n', inicio)) {
    const crlf = i > inicio && s[i - 1] === '\r';
    linhas.push(s.slice(inicio, crlf ? i - 1 : i));
    eols.push(crlf ? '\r\n' : '\n');
    inicio = i + 1;
  }
  if (inicio < s.length) {
    linhas.push(s.slice(inicio));
    eols.push('');
  }
  return { linhas, eols };
}

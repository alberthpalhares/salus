/** Normalização e ordem de texto das consultas: a busca e o nome de marcador não distinguem acento nem caixa. */

/** Ordem de nomes à moda do Explorer: sem distinguir acento nem caixa à primeira vista, e números por valor. */
const COLADOR = new Intl.Collator('pt-BR', { numeric: true });

/**
 * Forma de comparação de texto livre: minúsculas (`pt-BR`), sem acento (decompõe em NFD e tira as marcas
 * `\p{M}`; o texto que já vem decomposto dá o mesmo resultado) e qualquer sequência de espaço em branco
 * num espaço só, sem espaço nas pontas.
 */
export function normalizarParaBusca(s: string): string {
  return s
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ordem de dois textos para listas: pelo colador `pt-BR` com números por valor; empate pelo texto, igual em qualquer SO. */
export function compararTexto(a: string, b: string): number {
  return COLADOR.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/** Normalização e ordem de texto das consultas: a busca e o nome de marcador não distinguem acento nem caixa. */

/** A ordem de texto é uma só no núcleo (a mesma das pastas do cofre): vem de `format/texto.ts`. */
export { compararTexto } from '../format/texto.js';

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

/**
 * Problemas de leitura do cofre. O tipo e a lista fechada de códigos nascem no `format/` (os codecs
 * os emitem); o `vault/` os reexporta, e acrescenta os que só ele enxerga (`arquivo_ausente` e
 * `arquivo_ilegivel`, `id_duplicado`, `manifesto_invalido` por falta do arquivo).
 */
export { CODIGOS_PROBLEMA } from '../format/problema.js';
export type { CodigoProblema, Problema } from '../format/problema.js';

/**
 * Codecs dos arquivos do cofre v2 (FORMATO.md). Cada codec de arquivo de verdade exporta
 * `ler(fonte, {arquivo})` → `{dados, problemas, opacas, estado}` e `escrever(estado, dados)` → a nova
 * fonte, gravada por *splice* sobre o texto lido (ADR-0003): sem mudança, a saída é a fonte byte a
 * byte (menos o BOM, que nunca é regravado). O `manifesto` (`salus.yaml`) tem estado próprio.
 */
import * as doses from './doses.js';
import * as exames from './exames.js';
import * as ficha from './ficha.js';
import * as genetica from './genetica.js';
import * as historico from './historico.js';
import * as manifesto from './manifesto.js';
import * as medicamentos from './medicamentos.js';
import * as pendencias from './pendencias.js';
import * as vacinas from './vacinas.js';

export const ARQUIVOS_DE_VERDADE = [
  'Ficha.md',
  'Medicamentos.md',
  'Vacinas.md',
  'Exames.md',
  'Historico.md',
  'Pendencias.md',
  'Doses.md',
  'Genetica.md',
] as const;

export type ArquivoDeVerdade = (typeof ARQUIVOS_DE_VERDADE)[number];

/** Os codecs dos oito arquivos de verdade de cada perfil. */
export const codecs = { ficha, medicamentos, vacinas, exames, historico, pendencias, doses, genetica };

/** Qual codec lê cada arquivo de verdade. */
export const CODEC_DO_ARQUIVO = {
  'Ficha.md': 'ficha',
  'Medicamentos.md': 'medicamentos',
  'Vacinas.md': 'vacinas',
  'Exames.md': 'exames',
  'Historico.md': 'historico',
  'Pendencias.md': 'pendencias',
  'Doses.md': 'doses',
  'Genetica.md': 'genetica',
} as const satisfies Record<ArquivoDeVerdade, keyof typeof codecs>;

export { manifesto };
export { linhaDaChaveNoFrontmatter } from './leitura.js';
export type { EstadoManifesto } from './manifesto.js';
export type { DadosDoses } from './doses.js';
export type { DadosExames } from './exames.js';
export type { DadosFicha } from './ficha.js';
export type { DadosGenetica } from './genetica.js';
export type { DadosHistorico } from './historico.js';
export type { DadosMedicamentos } from './medicamentos.js';
export type { DadosPendencias } from './pendencias.js';
export type { DadosVacinas } from './vacinas.js';
export type {
  Codec,
  ContextoLeitura,
  EstadoArquivo,
  FrontmatterLido,
  Opaca,
  Regiao,
  RegiaoLista,
  RegiaoTabela,
  RegistroLido,
  ResultadoLeitura,
} from './estado.js';
export type { CodigoProblema, Problema } from '../problema.js';

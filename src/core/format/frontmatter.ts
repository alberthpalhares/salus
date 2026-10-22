/**
 * Frontmatter YAML: leitura com `yaml.parseDocument` (preserva comentários, ordem das chaves e
 * estilo) e escrita como uma `Edicao` que troca só o bloco `---` … `---` (ADR-0003).
 */
import { type Document, parseDocument } from 'yaml';
import type { Documento, Faixa } from './documento.js';
import type { Edicao } from './splice.js';
import { detectarEol, linhaDoOffset } from './texto.js';

/** YAML inválido no frontmatter; `linha` é a linha do arquivo (1 = o `---` de abertura). */
export class ErroFrontmatter extends Error {
  readonly linha: number;

  constructor(mensagem: string, linha: number) {
    super(mensagem);
    this.name = 'ErroFrontmatter';
    this.linha = linha;
  }
}

/**
 * Opções de `toString` que reproduzem byte a byte o estilo dos arquivos do Salus: listas em fluxo
 * sem espaço dentro dos colchetes (`["Dipirona"]`, não `[ "Dipirona" ]`) e sem dobrar textos
 * longos em várias linhas. Com elas, regravar um frontmatter sem alteração devolve o mesmo bloco.
 */
const OPCOES_ESCRITA = { flowCollectionPadding: false, lineWidth: 0 } as const;

/** Offset, em `fonte`, onde começa o YAML do frontmatter que abre em `inicio` (a linha depois do `---`). */
export function inicioDoYaml(fonte: string, inicio: number): number {
  return fonte.indexOf('\n', inicio) + 1;
}

/**
 * Lê o frontmatter do documento como `YAML.Document` (esquema `core`: datas sem aspas continuam
 * texto). Sem frontmatter → `undefined`. YAML inválido → `ErroFrontmatter` com a linha do arquivo
 * onde está o primeiro erro.
 */
export function lerFrontmatter(
  doc: Documento,
  fonte: string,
): { documento: Document; faixa: Faixa } | undefined {
  const frontmatter = doc.frontmatter;
  if (frontmatter === undefined) return undefined;
  const documento = parseDocument(frontmatter.texto, { prettyErrors: false, schema: 'core' });
  const erro = documento.errors.at(0);
  if (erro !== undefined) {
    // O YAML começa na linha seguinte ao `---` de abertura.
    const linha = linhaDoOffset(fonte, inicioDoYaml(fonte, frontmatter.inicio) + erro.pos[0]);
    throw new ErroFrontmatter(`frontmatter com YAML inválido na linha ${linha}: ${erro.message}`, linha);
  }
  return { documento, faixa: { inicio: frontmatter.inicio, fim: frontmatter.fim } };
}

/**
 * Edição que regrava o bloco de frontmatter inteiro (`faixa` vem de `lerFrontmatter`). Sem
 * mudança (`mudou === false`) → `undefined`: o arquivo não é tocado. Com mudança, o bloco vira
 * `---`, o `docYaml.toString()` (comentários e ordem preservados) e `---`, com todas as quebras no
 * fim de linha dominante da fonte (o `yaml` só emite LF).
 */
export function escreverFrontmatter(
  fonte: string,
  faixa: Faixa,
  docYaml: Document,
  mudou: boolean,
): Edicao | undefined {
  if (!mudou) return undefined;
  const eol = detectarEol(fonte) === 'CRLF' ? '\r\n' : '\n';
  let corpo = docYaml.toString(OPCOES_ESCRITA);
  // O `yaml` termina o texto com exatamente uma quebra; só garantimos que ela exista. Quebras a
  // mais no fim seriam conteúdo (bloco `|+`) e não são removidas.
  if (!corpo.endsWith('\n')) corpo += '\n';
  return { inicio: faixa.inicio, fim: faixa.fim, texto: `---${eol}${corpo.replace(/\r?\n/g, eol)}---` };
}

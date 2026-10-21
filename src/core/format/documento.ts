/**
 * Localiza as regiões de um documento Markdown: frontmatter, seções (cabeçalhos) e a primeira
 * tabela e a primeira lista de cada seção. O `remark` é usado **só para achar offsets** (spec 3.1
 * §4, ADR-0003): nunca se re-serializa a árvore nem se usa o texto que ela reconstrói; quem lê e
 * grava recorta a string original por essas faixas e grava por *splice* (`splice.ts`).
 */
import type { Heading, RootContent } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { normalizarCabecalho } from './texto.js';

/**
 * `[inicio, fim)` em **unidades UTF-16 da string de origem** (índices de `String.prototype.slice`,
 * os mesmos de `position.start.offset`/`end.offset` do mdast).
 */
export type Faixa = { inicio: number; fim: number };

export type Secao = {
  nivel: 1 | 2 | 3 | 4 | 5 | 6;
  /** Conteúdo do cabeçalho como está escrito na fonte, sem os `#`/sublinhado e sem as pontas em branco. */
  titulo: string;
  /** `normalizarCabecalho(titulo)`: a forma usada para comparar com os cabeçalhos canônicos. */
  tituloNormalizado: string;
  /** Início do cabeçalho. */
  inicio: number;
  /** Início do próximo cabeçalho de nível ≤ `nivel`, ou o fim do texto. */
  fim: number;
  /**
   * Primeira tabela GFM depois do cabeçalho e antes de `fim`: do primeiro `|` ao fim da última
   * linha (com os espaços finais dela), sem a quebra.
   */
  tabela?: Faixa;
  /**
   * Primeira lista depois do cabeçalho e antes de `fim`, com as sublistas: do primeiro marcador ao
   * fim do último item, sem a quebra.
   */
  lista?: Faixa;
};

export type Documento = {
  /**
   * Bloco `---` … `---` no início do texto: a faixa cobre as duas linhas `---` (para trocar o bloco
   * inteiro); `texto` é só o YAML de dentro, com os fins de linha originais.
   */
  frontmatter?: Faixa & { texto: string };
  /** Uma seção por cabeçalho (de qualquer nível) fora de citações e listas, na ordem do texto. */
  secoes: Secao[];
};

const processador = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm);

type ComPosicao = {
  type: string;
  position?: { start: { offset?: number | undefined }; end: { offset?: number | undefined } } | undefined;
};

function faixaDe(no: ComPosicao): Faixa {
  const inicio = no.position?.start.offset;
  const fim = no.position?.end.offset;
  if (inicio === undefined || fim === undefined) {
    throw new Error(`o remark não informou a posição do nó '${no.type}'`);
  }
  return { inicio, fim };
}

/** Recorta o YAML de dentro do bloco: do fim da linha `---` de abertura ao início da de fechamento. */
function frontmatterDe(fonte: string, faixa: Faixa): Faixa & { texto: string } {
  const bloco = fonte.slice(faixa.inicio, faixa.fim);
  const aposAbertura = bloco.indexOf('\n') + 1;
  const quebraFinal = bloco.lastIndexOf('\n');
  const antesDoFechamento = bloco[quebraFinal - 1] === '\r' ? quebraFinal - 1 : quebraFinal;
  const texto = aposAbertura > antesDoFechamento ? '' : bloco.slice(aposAbertura, antesDoFechamento);
  return { inicio: faixa.inicio, fim: faixa.fim, texto };
}

function tituloDe(fonte: string, cabecalho: Heading): string {
  const primeiro = cabecalho.children.at(0);
  const ultimo = cabecalho.children.at(-1);
  if (primeiro === undefined || ultimo === undefined) return '';
  return fonte.slice(faixaDe(primeiro).inicio, faixaDe(ultimo).fim);
}

/** Primeiro bloco `tipo` que começa em `[de, ate)`; os blocos vêm na ordem do texto. */
function primeiraFaixa(
  blocos: readonly RootContent[],
  tipo: 'table' | 'list',
  de: number,
  ate: number,
): Faixa | undefined {
  for (const no of blocos) {
    if (no.type !== tipo) continue;
    const faixa = faixaDe(no);
    if (faixa.inicio >= ate) return undefined;
    if (faixa.inicio >= de) return faixa;
  }
  return undefined;
}

/**
 * Lê a estrutura do documento.
 *
 * `fonte` deve chegar **sem BOM** (quem lê o arquivo chama `removerBom` antes): com o U+FEFF no
 * início, o micromark o descarta e todos os offsets saem deslocados de 1 — por isso o BOM é
 * recusado com `Error` em vez de produzir faixas erradas. O fim de linha (LF ou CRLF) não é
 * convertido: os offsets valem para a string exatamente como ela é.
 *
 * Só os blocos do nível superior contam: cabeçalho, tabela ou lista dentro de citação (`>`) ou de
 * item de lista não abre seção nem vira região. Blocos de código (cercados ou indentados) são nós
 * próprios, então uma tabela ou um `##` dentro deles nunca é tabela nem seção. Cabeçalhos setext
 * (`===`/`---` sob o texto) são cabeçalhos de nível 1/2, como em qualquer leitor CommonMark. O
 * frontmatter só existe se o bloco `---` começar no offset 0 e fechar com outra linha `---`; um
 * `---` no meio do texto é linha horizontal (ou o sublinhado de um cabeçalho setext).
 */
export function parseDocumento(fonte: string): Documento {
  if (fonte.startsWith('﻿')) {
    throw new Error(
      'parseDocumento recebeu texto com BOM: chame removerBom antes ' +
        '(com o BOM, os offsets do remark ficam deslocados)',
    );
  }
  const blocos = processador.parse(fonte).children;
  const documento: Documento = { secoes: [] };

  const primeiro = blocos.at(0);
  if (primeiro?.type === 'yaml') documento.frontmatter = frontmatterDe(fonte, faixaDe(primeiro));

  const cabecalhos = blocos.filter((no): no is Heading => no.type === 'heading');
  cabecalhos.forEach((cabecalho, i) => {
    const { inicio, fim: fimDoCabecalho } = faixaDe(cabecalho);
    const proximo = cabecalhos.slice(i + 1).find((outro) => outro.depth <= cabecalho.depth);
    const fim = proximo === undefined ? fonte.length : faixaDe(proximo).inicio;
    const titulo = tituloDe(fonte, cabecalho);
    const secao: Secao = {
      nivel: cabecalho.depth,
      titulo,
      tituloNormalizado: normalizarCabecalho(titulo),
      inicio,
      fim,
    };
    const tabela = primeiraFaixa(blocos, 'table', fimDoCabecalho, fim);
    if (tabela !== undefined) secao.tabela = tabela;
    const lista = primeiraFaixa(blocos, 'list', fimDoCabecalho, fim);
    if (lista !== undefined) secao.lista = lista;
    documento.secoes.push(secao);
  });
  return documento;
}

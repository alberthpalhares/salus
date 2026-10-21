/**
 * Parser e emissor próprios da lista de eventos do `Historico.md` (região `## Eventos`), no mesmo
 * molde de `tabela.ts`: linhas cruas com o fim de linha original, opacas no lugar, regeneração só
 * dos itens modificados e eventos novos no fim. Sem mudanças, a emissão devolve o trecho byte a byte.
 */
import { acrescentarLinhas, contarLinhas, costurarLinhas, type LinhaOpaca } from './tabela.js';
import { detectarEol, dividirLinhas } from './texto.js';

/** `- **AAAA-MM-DD** [tipo] texto`, com `[tipo]` opcional (FORMATO.md, `Historico.md`). */
const GRAMATICA = /^- \*\*(\d{4}-\d{2}-\d{2})\*\*( \[([a-z]+)\])? (.*)$/;
/** Continuação de um item: linha indentada com dois ou mais espaços. */
const CONTINUACAO = /^ {2,}/;

export type ItemEvento = {
  /** Texto cru do item: a primeira linha e as continuações, com os fins de linha internos originais. */
  raw: string;
  /** Fim de linha da última linha do item (`''` se for a última do trecho). */
  eol: string;
  data: string;
  /** O `[tipo]` sem os colchetes, ou `null` sem `[tipo]`. */
  tipo: string | null;
  /** Texto do evento: cada linha aparada (a primeira e as continuações), juntas com `\n`. */
  texto: string;
  /** `true` faz `emitirListaEventos` regenerar o item a partir de `data`, `tipo` e `texto`. */
  modificada: boolean;
};

/** Evento a acrescentar no fim da lista. */
export type EventoNovo = Pick<ItemEvento, 'data' | 'tipo' | 'texto'>;

/**
 * Lê a lista de eventos. `trecho` é o texto da faixa da lista (do primeiro marcador ao fim do
 * último item, sem a quebra final). Nunca lança. Cada linha que segue a gramática abre um item; as
 * linhas seguintes indentadas com 2+ espaços continuam esse item (entram no `raw` e no `texto`).
 * Linha em branco (ou só de espaços) é opaca `vazia` e encerra o item; qualquer outra linha —
 * inclusive uma indentada depois de uma opaca — é opaca `fora-da-gramatica`. Nenhuma linha some: a
 * soma de `contarLinhas(item.raw)` dos itens mais `opacas.length` é `contarLinhas(trecho)`.
 */
export function parseListaEventos(trecho: string): { itens: ItemEvento[]; opacas: LinhaOpaca[] } {
  const { linhas, eols } = dividirLinhas(trecho);
  const itens: ItemEvento[] = [];
  const opacas: LinhaOpaca[] = [];
  let aberto: ItemEvento | undefined; // item que ainda pode receber continuação
  linhas.forEach((linha, indice) => {
    const eol = eols[indice] ?? '';
    const evento = GRAMATICA.exec(linha);
    if (evento !== null) {
      aberto = {
        raw: linha,
        eol,
        data: evento[1] ?? '',
        tipo: evento[3] ?? null,
        texto: (evento[4] ?? '').trim(),
        modificada: false,
      };
      itens.push(aberto);
      return;
    }
    const emBranco = linha.trim() === '';
    if (aberto !== undefined && !emBranco && CONTINUACAO.test(linha)) {
      aberto.raw += aberto.eol + linha;
      aberto.eol = eol;
      aberto.texto += `\n${linha.trim()}`;
      return;
    }
    aberto = undefined;
    opacas.push({ raw: linha, eol, indice, motivo: emBranco ? 'vazia' : 'fora-da-gramatica' });
  });
  return { itens, opacas };
}

/**
 * Escreve um evento (linhas do texto aparadas; continuações com dois espaços) e confere que ele se
 * relê igual; se não se relê (data ou tipo fora da gramática, texto que começaria com `[tipo]`,
 * linha em branco no meio do texto), lança em vez de gravar algo que viraria outro evento ou opaca.
 */
function formatarEvento(evento: EventoNovo, eol: string): string {
  const [primeira = '', ...resto] = evento.texto.split(/\r?\n/).map((l) => l.trim());
  const marca = evento.tipo === null ? '' : ` [${evento.tipo}]`;
  const saida = [`- **${evento.data}**${marca} ${primeira}`, ...resto.map((l) => `  ${l}`)].join(eol);
  const relida = parseListaEventos(saida);
  const item = relida.itens[0];
  const igual =
    relida.itens.length === 1 &&
    relida.opacas.length === 0 &&
    item?.data === evento.data &&
    item.tipo === evento.tipo &&
    item.texto === [primeira, ...resto].join('\n');
  if (!igual) {
    throw new Error(`evento fora da gramática '- **AAAA-MM-DD** [tipo] texto': ${JSON.stringify(evento)}`);
  }
  return saida;
}

/**
 * Escreve a lista. Itens não modificados e opacas voltam com `raw` e `eol` originais, na ordem
 * original; só os itens `modificada` são regenerados (mantendo o `eol` do item); `novos` vão para o
 * fim. O fim de linha das linhas regeneradas e novas é o dominante da lista lida (LF se não houver
 * nenhum). Lança se um evento a gravar não couber na gramática.
 */
export function emitirListaEventos(
  itens: readonly ItemEvento[],
  opacas: readonly LinhaOpaca[],
  novos: readonly EventoNovo[] = [],
): string {
  const lido = [...itens, ...opacas].map((l) => l.raw + l.eol).join('');
  const eol = detectarEol(lido) === 'CRLF' ? '\r\n' : '\n';
  const registros = itens.map((item) => ({
    texto: item.modificada ? formatarEvento(item, eol) : item.raw,
    eol: item.eol,
    linhas: contarLinhas(item.raw),
  }));
  const saida = costurarLinhas(registros, opacas, 0);
  return acrescentarLinhas(
    saida,
    novos.map((evento) => formatarEvento(evento, eol)),
    eol,
  );
}

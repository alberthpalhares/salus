/**
 * Parser e emissor próprios das tabelas gerenciadas (spec 3.1 §4, ADR-0003). Trabalham linha a
 * linha sobre o trecho exato da faixa da tabela (`documento.ts`), sem `remark`: cada linha guarda o
 * texto cru e o fim de linha originais, e o emissor só reescreve as linhas marcadas como
 * modificadas. **Nenhuma linha some**: o que o parser não entende vira linha opaca e volta intacto,
 * no mesmo lugar; sem mudanças, `emitirTabela(parseTabela(x).tabela) === x` byte a byte.
 */
import { desescaparCelula, detectarEol, dividirLinhas, escaparCelula, normalizarCabecalho } from './texto.js';

/** Linha de dados da tabela. */
export type LinhaTabela = {
  /** Texto cru da linha na fonte, sem o fim de linha (indentação e espaços finais inclusos). */
  raw: string;
  /** Fim de linha original: `'\n'`, `'\r\n'`, ou `''` na última linha do trecho. */
  eol: string;
  /**
   * Células das colunas esperadas, na ordem: aparadas e com `\|` lido como `|`. Uma linha com menos
   * células que o cabeçalho é completada com `''` (o GFM faz o mesmo).
   */
  celulas: string[];
  /** Células das colunas extras, pela chave do cabeçalho como está escrito (aparado). */
  extras: Record<string, string>;
  /** `true` faz `emitirTabela` regenerar a linha a partir de `celulas` e `extras`. */
  modificada: boolean;
};

/** Linha que o parser não entende: volta intacta e no mesmo lugar; o `doctor` a lista. */
export type LinhaOpaca = {
  /** Texto cru da linha, sem o fim de linha. */
  raw: string;
  /** Fim de linha original (`''` na última linha do trecho). */
  eol: string;
  /** Posição (a partir de 0) da linha no trecho: `dividirLinhas(trecho).linhas[indice] === raw`. */
  indice: number;
  /**
   * Por que a linha é opaca. Na tabela: `vazia` (só células vazias, como a linha de um modelo),
   * `sem-barra` (não começa com `|`, por exemplo uma frase solta) ou `celulas-a-mais` (mais células
   * que o cabeçalho). Na lista de eventos (`lista.ts`): `vazia` ou `fora-da-gramatica`.
   */
  motivo: string;
};

export type Tabela = {
  /** Nomes do cabeçalho nas posições esperadas, como estão escritos (aparados). */
  colunas: string[];
  /** Nomes do cabeçalho além das colunas esperadas (preservados e ignorados pelo Salus). */
  colunasExtras: string[];
  /** Linha do cabeçalho, crua; sempre reemitida assim. */
  cabecalhoRaw: string;
  /** Linha delimitadora (`|---|---|`), crua; sempre reemitida assim. */
  delimitadorRaw: string;
  eolCabecalho: string;
  eolDelimitador: string;
  /** Linhas de dados, na ordem da fonte. */
  linhas: LinhaTabela[];
  /** Linhas opacas, na ordem da fonte; o `indice` diz onde cada uma fica entre as `linhas`. */
  opacas: LinhaOpaca[];
  /**
   * Fim de linha das linhas acrescentadas: o dominante do trecho (`detectarEol`; LF sem quebra
   * nenhuma). Quem conhece o fim de linha do arquivo inteiro pode trocá-lo antes de emitir.
   */
  eolPadrao: string;
};

/** `|---|:--:|`: uma ou mais células de traços, com `:` opcional nas pontas e `|` opcionais. */
const DELIMITADOR = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

/** Quantas linhas o trecho tem, contadas como `dividirLinhas` conta. */
export function contarLinhas(trecho: string): number {
  return dividirLinhas(trecho).linhas.length;
}

/**
 * Células de uma linha de tabela: tira o `|` inicial e o final (se não escapado), corta em todo
 * `|` **não precedido de `\`** e lê cada célula aparada com `desescaparCelula` — o inverso exato
 * de como `emitirTabela` as escreve.
 */
function dividirCelulas(linha: string): string[] {
  let s = linha.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((celula) => desescaparCelula(celula.trim()));
}

/**
 * Problemas do cabeçalho. As mensagens dizem só a posição da coluna e o nome **esperado** (que vem do
 * FORMATO.md), nunca o texto achado: o cabeçalho de uma tabela larga é escrito por quem usa, e um
 * nome de marcador ou de exame iria parar no log do `doctor`.
 */
function problemasDoCabecalho(cabecalho: readonly string[], esperadas: readonly string[]): string[] {
  const problemas: string[] = [];
  esperadas.forEach((esperada, i) => {
    const achada = cabecalho[i];
    if (achada !== undefined && normalizarCabecalho(achada) !== normalizarCabecalho(esperada)) {
      problemas.push(`cabeçalho: a coluna ${i + 1} deveria ser '${esperada}'`);
    }
  });
  if (cabecalho.length < esperadas.length) {
    const faltam = esperadas.slice(cabecalho.length).map((c) => `'${c}'`);
    problemas.push(`cabeçalho: faltam colunas no fim: ${faltam.join(', ')}`);
  }
  const vistas = new Set<string>();
  cabecalho.slice(esperadas.length).forEach((extra, j) => {
    if (vistas.has(extra)) {
      const posicao = esperadas.length + j + 1;
      problemas.push(
        `cabeçalho: a coluna extra ${posicao} repete o nome de uma coluna extra anterior ` +
          '(uma linha regenerada repetiria a primeira)',
      );
    }
    vistas.add(extra);
  });
  return problemas;
}

function problemasDoDelimitador(linhas: readonly string[], colunasNoCabecalho: number): string[] {
  const delimitador = linhas[1];
  if (delimitador === undefined) return ['delimitador: falta a linha |---| depois do cabeçalho'];
  if (!DELIMITADOR.test(delimitador)) return ['delimitador: a segunda linha não é a linha |---| da tabela'];
  const n = dividirCelulas(delimitador).length;
  if (n !== colunasNoCabecalho) {
    return [`delimitador: tem ${n} colunas e o cabeçalho tem ${colunasNoCabecalho}`];
  }
  return [];
}

/**
 * Lê uma tabela. `trecho` é exatamente o texto da faixa da tabela (do primeiro `|` do cabeçalho ao
 * fim da última linha, sem a quebra final), já sem BOM. Nunca lança: o que não se encaixa vira
 * `problemas` (cabeçalho fora do esperado, delimitador ausente; quem chama decide o que fazer) ou
 * linha opaca. O cabeçalho é conferido por posição contra `colunasEsperadas`, com
 * `normalizarCabecalho`; as colunas além delas são extras.
 *
 * Cada linha do trecho cai em exatamente um lugar (cabeçalho, delimitador, `linhas` ou `opacas`):
 * com cabeçalho e delimitador presentes, `contarLinhas(trecho) === linhas.length + opacas.length + 2`.
 * Linhas depois do delimitador: espaços antes do `|` são tolerados (o `raw` não muda); a que não
 * começa com `|`, a que tem mais células que o cabeçalho e a que só tem células vazias são opacas.
 */
export function parseTabela(
  trecho: string,
  colunasEsperadas: readonly string[],
): { tabela: Tabela; problemas: string[] } {
  const { linhas, eols } = dividirLinhas(trecho);
  const cabecalhoRaw = linhas[0];
  if (cabecalhoRaw === undefined) {
    const tabela: Tabela = {
      colunas: [],
      colunasExtras: [],
      cabecalhoRaw: '',
      delimitadorRaw: '',
      eolCabecalho: '',
      eolDelimitador: '',
      linhas: [],
      opacas: [],
      eolPadrao: '\n',
    };
    return { tabela, problemas: ['tabela vazia: falta o cabeçalho'] };
  }

  const cabecalho = dividirCelulas(cabecalhoRaw);
  const colunas = cabecalho.slice(0, colunasEsperadas.length);
  const colunasExtras = cabecalho.slice(colunasEsperadas.length);
  const problemas = [
    ...problemasDoCabecalho(cabecalho, colunasEsperadas),
    ...problemasDoDelimitador(linhas, cabecalho.length),
  ];
  const tabela: Tabela = {
    colunas,
    colunasExtras,
    cabecalhoRaw,
    delimitadorRaw: linhas[1] ?? '',
    eolCabecalho: eols[0] ?? '',
    eolDelimitador: eols[1] ?? '',
    linhas: [],
    opacas: [],
    eolPadrao: detectarEol(trecho) === 'CRLF' ? '\r\n' : '\n',
  };

  for (let indice = 2; indice < linhas.length; indice++) {
    const raw = linhas[indice] ?? '';
    const eol = eols[indice] ?? '';
    const opaca = (motivo: string) => tabela.opacas.push({ raw, eol, indice, motivo });
    if (!raw.trimStart().startsWith('|')) {
      opaca('sem-barra');
      continue;
    }
    const celulas = dividirCelulas(raw);
    if (celulas.length > cabecalho.length) {
      opaca('celulas-a-mais');
      continue;
    }
    if (celulas.every((c) => c === '')) {
      opaca('vazia');
      continue;
    }
    while (celulas.length < cabecalho.length) celulas.push('');
    tabela.linhas.push({
      raw,
      eol,
      celulas: celulas.slice(0, colunas.length),
      extras: Object.fromEntries(colunasExtras.map((nome, j) => [nome, celulas[colunas.length + j] ?? ''])),
      modificada: false,
    });
  }
  return { tabela, problemas };
}

/** Escreve uma linha de tabela no formato `| a | b |`, com `|` escapado e célula vazia como `| |`. */
function formatarLinha(celulas: readonly string[], total: number): string {
  if (celulas.length > total) {
    throw new Error(`linha com ${celulas.length} células numa tabela de ${total} colunas`);
  }
  const completas = [...celulas, ...Array<string>(total - celulas.length).fill('')];
  // A mensagem diz só a posição, nunca o conteúdo (dado de saúde pode ir parar em log).
  const comQuebra = completas.findIndex((celula) => /[\r\n]/.test(celula));
  if (comQuebra !== -1) {
    throw new Error(`a célula ${comQuebra + 1} tem quebra de linha, que não cabe numa linha de tabela`);
  }
  return `|${completas.map((c) => (c === '' ? ' ' : ` ${escaparCelula(c)} `)).join('|')}|`;
}

/** Peça de `costurarLinhas`: o texto (sem o fim de linha final), o fim de linha e quantas linhas da fonte ocupava. */
export type PecaDeLinha = { texto: string; eol: string; linhas: number };

/**
 * Uso interno do `format/` (tabela e lista). Intercala os registros (na ordem em que foram lidos) e
 * as linhas opacas (pelo `indice`) na ordem original; `primeiraLinha` é o índice, no trecho, da
 * primeira linha depois do que vem antes dos registros (2 numa tabela, 0 numa lista). As opacas nunca
 * se perdem nem trocam de ordem entre si; os registros devem vir na ordem e na quantidade lidas.
 */
export function costurarLinhas(
  registros: readonly PecaDeLinha[],
  opacas: readonly LinhaOpaca[],
  primeiraLinha: number,
): string {
  const pendentes = [...opacas].sort((a, b) => a.indice - b.indice);
  const partes: string[] = [];
  let linha = primeiraLinha; // índice, na fonte, da próxima linha a emitir
  let k = 0;
  for (const registro of registros) {
    for (let opaca = pendentes[k]; opaca !== undefined && opaca.indice <= linha; opaca = pendentes[k]) {
      partes.push(opaca.raw + opaca.eol);
      k++;
      linha++;
    }
    partes.push(registro.texto + registro.eol);
    linha += registro.linhas;
  }
  for (const opaca of pendentes.slice(k)) partes.push(opaca.raw + opaca.eol);
  return partes.join('');
}

/**
 * Uso interno do `format/`. Acrescenta `novas` linhas ao fim de `saida` mantendo a convenção da
 * região: se ela termina sem fim de linha (o normal numa faixa), cada linha nova é precedida de
 * `eol` e o resultado continua sem fim de linha; se termina com um, cada linha nova termina com `eol`.
 */
export function acrescentarLinhas(saida: string, novas: readonly string[], eol: string): string {
  if (novas.length === 0) return saida;
  if (saida === '') return novas.join(eol);
  if (saida.endsWith('\n')) return saida + novas.map((linha) => linha + eol).join('');
  return saida + novas.map((linha) => eol + linha).join('');
}

/**
 * Escreve a tabela. Cabeçalho e delimitador voltam crus; as linhas não modificadas e as opacas
 * voltam com o `raw` e o `eol` originais, na ordem original; só as linhas `modificada` são
 * regeneradas (células com `escaparCelula`, formato `| a | b |`, o mesmo `eol` da linha). Cada item
 * de `novasLinhas` é uma linha nova, posicional (colunas e depois as extras, completada com `''`),
 * acrescentada no fim com `eolPadrao`. Lança se uma célula a gravar tiver quebra de linha, se uma
 * linha tiver mais células que a tabela tem colunas, ou se for preciso regenerar ou acrescentar
 * linhas numa tabela com colunas extras repetidas (as células delas se misturariam; reemitir cru vale).
 */
export function emitirTabela(tabela: Tabela, novasLinhas: readonly (readonly string[])[] = []): string {
  const total = tabela.colunas.length + tabela.colunasExtras.length;
  const repetida = tabela.colunasExtras.find((nome, i) => tabela.colunasExtras.indexOf(nome) !== i);
  if (repetida !== undefined && (novasLinhas.length > 0 || tabela.linhas.some((l) => l.modificada))) {
    throw new Error(
      `a coluna extra '${repetida}' se repete no cabeçalho: não dá para regenerar nem acrescentar linhas ` +
        'sem misturar as células dela; renomeie a coluna à mão',
    );
  }
  const regenerar = (linha: LinhaTabela): string => {
    if (linha.celulas.length > tabela.colunas.length) {
      throw new Error(`linha com ${linha.celulas.length} células para ${tabela.colunas.length} colunas esperadas`);
    }
    const celulas = [...linha.celulas, ...Array<string>(tabela.colunas.length - linha.celulas.length).fill('')];
    const extras = tabela.colunasExtras.map((nome) =>
      Object.hasOwn(linha.extras, nome) ? (linha.extras[nome] ?? '') : '',
    );
    return formatarLinha([...celulas, ...extras], total);
  };
  const registros = tabela.linhas.map((linha) => ({
    texto: linha.modificada ? regenerar(linha) : linha.raw,
    eol: linha.eol,
    linhas: 1,
  }));
  const saida =
    tabela.cabecalhoRaw +
    tabela.eolCabecalho +
    tabela.delimitadorRaw +
    tabela.eolDelimitador +
    costurarLinhas(registros, tabela.opacas, 2);
  const novas = novasLinhas.map((celulas) => formatarLinha(celulas, total));
  return acrescentarLinhas(saida, novas, tabela.eolPadrao);
}

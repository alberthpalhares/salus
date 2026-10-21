import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseDocumento } from '../../../src/core/format/documento.js';
import { emitirListaEventos, parseListaEventos } from '../../../src/core/format/lista.js';
import { aplicarEdicoes } from '../../../src/core/format/splice.js';
import { contarLinhas, emitirTabela, parseTabela, type Tabela } from '../../../src/core/format/tabela.js';
import { escaparCelula, removerBom } from '../../../src/core/format/texto.js';

const EXECUCOES = { numRuns: 200 };
const BOM = '\uFEFF';

// Células: `|` e `\` (escapes), acentos, espaço (célula vazia ou só de espaços), HTML, pontuação de Markdown.
const unidadeCelula = fc.constantFrom('|', '\\', 'a', 'Z', '0', ' ', 'ç', 'é', 'ã', 'Ü', '<', 'b>', '-', ':', '*');
const celula = fc.string({ unit: unidadeCelula, maxLength: 12 });
// Nomes de coluna: letras, acentos e espaços (os nomes canônicos são assim).
const nomeColuna = fc.string({ unit: fc.constantFrom('a', 'D', 'ç', 'ã', 'é', ' ', '(', ')'), minLength: 1, maxLength: 10 });
// Frase solta: começa com letra, nunca com `|` nem com marcador de bloco do Markdown.
const frase = fc
  .tuple(fc.constantFrom('O', 'a', 'É', 'ç'), fc.string({ unit: fc.constantFrom('a', 'b', 'ç', 'õ', ' ', ','), maxLength: 20 }))
  .map(([primeira, resto]) => primeira + resto);
const eol = fc.constantFrom('\n', '\r\n');

const formatar = (celulas: readonly string[]): string => `|${celulas.map((c) => ` ${escaparCelula(c)} `).join('|')}|`;
const delimitador = (n: number): string => `|${'---|'.repeat(n)}`;
const vazia = (celulas: readonly string[]): boolean => celulas.every((c) => c.trim() === '');

function invariante(trecho: string, tabela: Tabela): void {
  expect(tabela.linhas.length + tabela.opacas.length + 2).toBe(contarLinhas(trecho));
}

type TabelaGerada = { colunas: string[]; linhas: string[][]; eol: string };

const tabelaGerada: fc.Arbitrary<TabelaGerada> = fc.integer({ min: 3, max: 6 }).chain((n) =>
  fc.record({
    colunas: fc.array(nomeColuna, { minLength: n, maxLength: n }),
    linhas: fc.array(fc.array(celula, { minLength: n, maxLength: n }), { maxLength: 20 }),
    eol,
  }),
);

const montar = (g: TabelaGerada): string =>
  [formatar(g.colunas), delimitador(g.colunas.length), ...g.linhas.map(formatar)].join(g.eol);

describe('propriedades — tabelas geradas (3–6 colunas, 0–20 linhas, LF ou CRLF)', () => {
  it('parse não lança, sem problemas, invariante, no-op e células lidas como escritas', () => {
    fc.assert(
      fc.property(tabelaGerada, (g) => {
        const trecho = montar(g);
        const { tabela, problemas } = parseTabela(trecho, g.colunas);
        expect(problemas).toEqual([]);
        invariante(trecho, tabela);
        expect(emitirTabela(tabela)).toBe(trecho);
        expect(tabela.eolPadrao).toBe(g.eol);
        const cheias = g.linhas.filter((l) => !vazia(l));
        expect(tabela.linhas.map((l) => l.celulas)).toEqual(cheias.map((l) => l.map((c) => c.trim())));
        expect(tabela.opacas.map((o) => o.motivo)).toEqual(g.linhas.filter(vazia).map(() => 'vazia'));
      }),
      EXECUCOES,
    );
  });

  it('regenerar todas as linhas devolve as mesmas células; linhas novas vão para o fim', () => {
    fc.assert(
      fc.property(tabelaGerada, fc.array(fc.array(celula, { maxLength: 3 }), { maxLength: 3 }), (g, novas) => {
        const trecho = montar(g);
        const { tabela } = parseTabela(trecho, g.colunas);
        const lidas = tabela.linhas.map((l) => [...l.celulas]);
        for (const linha of tabela.linhas) linha.modificada = true;
        const regenerado = emitirTabela(tabela);
        const relida = parseTabela(regenerado, g.colunas).tabela;
        expect(relida.linhas.map((l) => l.celulas)).toEqual(lidas);
        expect(relida.opacas).toEqual(tabela.opacas);
        invariante(regenerado, relida);

        const comNovas = emitirTabela(parseTabela(trecho, g.colunas).tabela, novas);
        expect(comNovas.startsWith(trecho)).toBe(true);
        if (novas.length > 0) expect(comNovas.slice(trecho.length).startsWith(g.eol)).toBe(true);
        const depois = parseTabela(comNovas, g.colunas).tabela;
        invariante(comNovas, depois);
        const completas = novas.map((l) => [...l, ...Array<string>(g.colunas.length - l.length).fill('')]);
        expect(depois.linhas.map((l) => l.celulas)).toEqual([
          ...lidas,
          ...completas.filter((l) => !vazia(l)).map((l) => l.map((c) => c.trim())),
        ]);
      }),
      EXECUCOES,
    );
  });
});

const perturbacao = fc.record({
  bom: fc.boolean(),
  espacosFinais: fc.array(fc.nat(), { maxLength: 5 }),
  indentacoes: fc.array(fc.nat(), { maxLength: 4 }),
  colunaExtra: fc.option(fc.record({ nome: nomeColuna, valores: fc.array(celula, { maxLength: 20 }) }), { nil: null }),
  celulaAMais: fc.option(fc.nat(), { nil: null }),
  celulasAMenos: fc.option(fc.record({ linha: fc.nat(), quantas: fc.integer({ min: 1, max: 2 }) }), { nil: null }),
  frases: fc.array(fc.record({ posicao: fc.nat(), texto: frase }), { maxLength: 3 }),
});
type Perturbacao = typeof perturbacao extends fc.Arbitrary<infer T> ? T : never;

function perturbar(g: TabelaGerada, p: Perturbacao): string {
  const cabecalho = p.colunaExtra === null ? g.colunas : [...g.colunas, p.colunaExtra.nome];
  const extra = p.colunaExtra;
  const linhas = g.linhas.map((l, i) => (extra === null ? [...l] : [...l, extra.valores[i] ?? '']));
  if (linhas.length > 0 && p.celulaAMais !== null) linhas[p.celulaAMais % linhas.length]?.push('a mais');
  if (linhas.length > 0 && p.celulasAMenos !== null) {
    const i = p.celulasAMenos.linha % linhas.length;
    const linha = linhas[i] ?? [];
    linhas[i] = linha.slice(0, Math.max(1, linha.length - p.celulasAMenos.quantas));
  }
  const texto = [formatar(cabecalho), delimitador(cabecalho.length), ...linhas.map(formatar)];
  for (const k of p.indentacoes) {
    if (linhas.length === 0) break;
    const i = 2 + (k % linhas.length);
    texto[i] = ' '.repeat(1 + (k % 3)) + texto[i];
  }
  for (const k of p.espacosFinais) texto[k % texto.length] += ' '.repeat(1 + (k % 3));
  for (const f of p.frases) texto.splice(2 + (f.posicao % (texto.length - 1)), 0, f.texto);
  return texto.join(g.eol);
}

describe('propriedades — perturbações (BOM, espaço final, indentação, coluna extra, células a mais/menos, frase solta)', () => {
  it('parseTabela direto no trecho: não lança, invariante, no-op; frases viram opacas', () => {
    fc.assert(
      fc.property(tabelaGerada, perturbacao, (g, p) => {
        const trecho = perturbar(g, p);
        const { tabela, problemas } = parseTabela(trecho, g.colunas);
        expect(problemas).toEqual([]);
        invariante(trecho, tabela);
        expect(emitirTabela(tabela)).toBe(trecho);
        expect(tabela.opacas.filter((o) => o.motivo === 'sem-barra')).toHaveLength(p.frases.length);
        if (p.colunaExtra !== null) {
          expect(tabela.colunasExtras).toEqual([p.colunaExtra.nome.trim()]);
          for (const linha of tabela.linhas) expect(Object.keys(linha.extras)).toHaveLength(1);
        }
      }),
      EXECUCOES,
    );
  });

  it('pelo documento inteiro (BOM removido antes): faixa do remark, invariante, no-op e splice idêntico', () => {
    fc.assert(
      fc.property(tabelaGerada, perturbacao, (g, p) => {
        const corpo = ['# Documento', '', '## Seção', '', perturbar(g, p), '', 'Texto depois.', ''].join(g.eol);
        const { texto: fonte, tinhaBom } = removerBom(p.bom ? BOM + corpo : corpo);
        expect(tinhaBom).toBe(p.bom);
        const faixa = parseDocumento(fonte).secoes.find((s) => s.titulo === 'Seção')?.tabela;
        expect(faixa).toBeDefined();
        if (faixa === undefined) return;
        const trecho = fonte.slice(faixa.inicio, faixa.fim);
        const { tabela } = parseTabela(trecho, g.colunas);
        invariante(trecho, tabela);
        const emitido = emitirTabela(tabela);
        expect(emitido).toBe(trecho);
        expect(aplicarEdicoes(fonte, [{ ...faixa, texto: emitido }])).toBe(fonte);
      }),
      EXECUCOES,
    );
  });
});

const dois = (n: number): string => String(n).padStart(2, '0');
const data = fc
  .tuple(fc.integer({ min: 1900, max: 2100 }), fc.integer({ min: 1, max: 12 }), fc.integer({ min: 1, max: 28 }))
  .map(([a, m, d]) => `${a}-${dois(m)}-${dois(d)}`);
const tipo = fc.option(fc.constantFrom('consulta', 'sintoma', 'procedimento', 'observacao', 'outro'), { nil: null });
const linhaDeTexto = fc
  .string({ unit: fc.constantFrom('a', 'Z', 'ç', 'é', ' ', '|', '*', '[', ']', '-', '0'), minLength: 1, maxLength: 15 })
  .filter((s) => s.trim() !== '');
type Elemento =
  | { tipo: 'evento'; data: string; tipoEvento: string | null; linhas: string[]; indentacao: number }
  | { tipo: 'opaca'; linha: string };
const elemento: fc.Arbitrary<Elemento> = fc.oneof(
  fc
    .record({
      data,
      tipoEvento: tipo,
      linhas: fc.array(linhaDeTexto, { minLength: 1, maxLength: 3 }),
      indentacao: fc.integer({ min: 2, max: 4 }),
    })
    // Sem [tipo], o texto não pode começar com algo que se leria como [tipo].
    .filter((e) => e.tipoEvento !== null || !/^\[[a-z]+\] /.test(e.linhas[0]?.trim() ?? ''))
    .map((e) => ({ tipo: 'evento' as const, ...e })),
  fc
    .oneof(
      linhaDeTexto.filter((s) => !s.startsWith('*')).map((s) => `- ${s}`),
      // Linha só de espaços (a linha totalmente vazia é coberta em lista.test.ts: no fim do
      // trecho ela não existe, porque `dividirLinhas` não conta a linha vazia final).
      fc.constantFrom(' ', '   '),
    )
    .map((linha) => ({ tipo: 'opaca' as const, linha })),
);

describe('propriedades — listas de eventos geradas (com continuações, opacas, LF ou CRLF)', () => {
  it('parse não lança, invariante, no-op, eventos lidos como escritos e regenerados iguais', () => {
    fc.assert(
      fc.property(fc.array(elemento, { maxLength: 12 }), eol, (elementos, fimDeLinha) => {
        const trecho = elementos
          .flatMap((e) =>
            e.tipo === 'opaca'
              ? [e.linha]
              : [
                  `- **${e.data}**${e.tipoEvento === null ? '' : ` [${e.tipoEvento}]`} ${e.linhas[0]}`,
                  ...e.linhas.slice(1).map((l) => ' '.repeat(e.indentacao) + l),
                ],
          )
          .join(fimDeLinha);
        const lista = parseListaEventos(trecho);
        const linhasDosItens = lista.itens.reduce((n, item) => n + contarLinhas(item.raw), 0);
        expect(linhasDosItens + lista.opacas.length).toBe(contarLinhas(trecho));
        expect(emitirListaEventos(lista.itens, lista.opacas)).toBe(trecho);
        const eventos = elementos.flatMap((e) =>
          e.tipo === 'evento' ? [[e.data, e.tipoEvento, e.linhas.map((l) => l.trim()).join('\n')]] : [],
        );
        expect(lista.itens.map((i) => [i.data, i.tipo, i.texto])).toEqual(eventos);
        expect(lista.opacas).toHaveLength(elementos.filter((e) => e.tipo === 'opaca').length);

        for (const item of lista.itens) item.modificada = true;
        const regenerado = emitirListaEventos(lista.itens, lista.opacas);
        const relida = parseListaEventos(regenerado);
        expect(relida.itens.map((i) => [i.data, i.tipo, i.texto])).toEqual(eventos);
        expect(relida.opacas.map((o) => [o.raw, o.indice])).toEqual(lista.opacas.map((o) => [o.raw, o.indice]));
      }),
      EXECUCOES,
    );
  });
});

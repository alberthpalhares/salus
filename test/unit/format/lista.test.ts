import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Faixa, parseDocumento } from '../../../src/core/format/documento.js';
import { emitirListaEventos, type ItemEvento, parseListaEventos } from '../../../src/core/format/lista.js';
import { aplicarEdicoes, type Edicao } from '../../../src/core/format/splice.js';
import { contarLinhas, type LinhaOpaca } from '../../../src/core/format/tabela.js';
import { removerBom } from '../../../src/core/format/texto.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const lerFixture = (relativo: string): string => removerBom(readFileSync(FIXTURES + relativo, 'utf8')).texto;
const linhas = (...l: string[]): string => l.join('\n');

function listaDaSecao(fonte: string, titulo: string): string {
  const faixa = parseDocumento(fonte).secoes.find((s) => s.titulo === titulo)?.lista;
  if (faixa === undefined) throw new Error(`seção sem lista: ${titulo}`);
  return fonte.slice(faixa.inicio, faixa.fim);
}

/** Nenhuma linha some: as linhas dos itens (com as continuações) mais as opacas são todas as do trecho. */
function invariante(trecho: string, lista: { itens: ItemEvento[]; opacas: LinhaOpaca[] }): void {
  const dosItens = lista.itens.reduce((n, item) => n + contarLinhas(item.raw), 0);
  expect(dosItens + lista.opacas.length).toBe(contarLinhas(trecho));
}

describe('parseListaEventos', () => {
  it('item com [tipo] e sem [tipo]', () => {
    const trecho = linhas('- **2026-03-10** [consulta] Consulta de rotina.', '- **2026-03-09** Coleta de sangue.');
    const { itens, opacas } = parseListaEventos(trecho);
    expect(opacas).toEqual([]);
    expect(itens).toEqual([
      {
        raw: '- **2026-03-10** [consulta] Consulta de rotina.',
        eol: '\n',
        data: '2026-03-10',
        tipo: 'consulta',
        texto: 'Consulta de rotina.',
        modificada: false,
      },
      {
        raw: '- **2026-03-09** Coleta de sangue.',
        eol: '',
        data: '2026-03-09',
        tipo: null,
        texto: 'Coleta de sangue.',
        modificada: false,
      },
    ]);
  });

  it('Historico.md da Ana: 5 eventos, um sem tipo (a coleta, antes dos resultados)', () => {
    const trecho = listaDaSecao(lerFixture('vaults/v2-exemplo/Perfis/Ana/Historico.md'), 'Eventos');
    const { itens, opacas } = parseListaEventos(trecho);
    expect(opacas).toEqual([]);
    expect(itens.map((i) => [i.data, i.tipo])).toEqual([
      ['2026-03-10', 'consulta'],
      ['2026-03-09', null],
      ['2026-06-05', 'sintoma'],
      ['2026-09-15', 'procedimento'],
      ['2026-10-10', 'observacao'],
    ]);
  });

  it('"- Primeira consulta em março" → opaca (Historico.md do Bruno)', () => {
    const trecho = listaDaSecao(lerFixture('vaults/v2-exemplo/Perfis/Bruno/Historico.md'), 'Eventos');
    const lista = parseListaEventos(trecho);
    expect(lista.opacas).toEqual([
      { raw: '- Primeira consulta em março', eol: '\n', indice: 1, motivo: 'fora-da-gramatica' },
    ]);
    expect(lista.itens.map((i) => i.texto)).toEqual([
      'Check-up anual com o clínico geral.',
      'Coleta de sangue para hemograma.',
    ]);
    invariante(trecho, lista);
  });

  it('continuação indentada (2+ espaços) entra no texto e no raw do item', () => {
    const trecho = linhas(
      '- **2026-01-02** [sintoma] Febre à noite.',
      '  Melhorou com antitérmico.',
      '    - medido 38,5 °C',
      '- **2026-01-03** Retorno.',
    );
    const lista = parseListaEventos(trecho);
    expect(lista.opacas).toEqual([]);
    expect(lista.itens[0]).toEqual({
      raw: linhas('- **2026-01-02** [sintoma] Febre à noite.', '  Melhorou com antitérmico.', '    - medido 38,5 °C'),
      eol: '\n',
      data: '2026-01-02',
      tipo: 'sintoma',
      texto: 'Febre à noite.\nMelhorou com antitérmico.\n- medido 38,5 °C',
      modificada: false,
    });
    expect(lista.itens[1]?.texto).toBe('Retorno.');
    invariante(trecho, lista);
    expect(emitirListaEventos(lista.itens, lista.opacas)).toBe(trecho);
  });

  it('CRLF: o raw guarda os CRLF internos; o texto junta com \\n', () => {
    const trecho = '- **2026-01-02** Febre.\r\n  Melhorou.\r\n- **2026-01-03** Retorno.';
    const lista = parseListaEventos(trecho);
    expect(lista.itens[0]?.raw).toBe('- **2026-01-02** Febre.\r\n  Melhorou.');
    expect(lista.itens[0]?.eol).toBe('\r\n');
    expect(lista.itens[0]?.texto).toBe('Febre.\nMelhorou.');
    invariante(trecho, lista);
    expect(emitirListaEventos(lista.itens, lista.opacas)).toBe(trecho);
  });

  it('linha indentada depois de uma opaca (ou no início) também é opaca', () => {
    const trecho = linhas('  solta no início', '- Primeira consulta em março', '  continuação dela', '- **2026-01-03** Ok.');
    const lista = parseListaEventos(trecho);
    expect(lista.opacas.map((o) => [o.indice, o.motivo])).toEqual([
      [0, 'fora-da-gramatica'],
      [1, 'fora-da-gramatica'],
      [2, 'fora-da-gramatica'],
    ]);
    expect(lista.itens).toHaveLength(1);
    invariante(trecho, lista);
  });

  it('linha em branco (lista frouxa) é opaca "vazia" e encerra a continuação', () => {
    const trecho = linhas('- **2026-01-01** a', '', '  depois da linha em branco', '- **2026-01-02** b');
    const lista = parseListaEventos(trecho);
    expect(lista.opacas).toEqual([
      { raw: '', eol: '\n', indice: 1, motivo: 'vazia' },
      { raw: '  depois da linha em branco', eol: '\n', indice: 2, motivo: 'fora-da-gramatica' },
    ]);
    expect(lista.itens.map((i) => i.texto)).toEqual(['a', 'b']);
    invariante(trecho, lista);
    expect(emitirListaEventos(lista.itens, lista.opacas)).toBe(trecho);
  });

  it('fora da gramática: outro marcador, data sem negrito, data incompleta', () => {
    const trecho = linhas('* **2026-01-01** a', '- 2026-01-01 a', '- **2026-1-01** a', '- **2026-01-01**a');
    const lista = parseListaEventos(trecho);
    expect(lista.itens).toEqual([]);
    expect(lista.opacas).toHaveLength(4);
    expect(emitirListaEventos(lista.itens, lista.opacas)).toBe(trecho);
  });
});

describe('emitirListaEventos', () => {
  it('no-op byte a byte no Historico.md do Bruno (a opaca fica no lugar)', () => {
    const fonte = lerFixture('vaults/v2-exemplo/Perfis/Bruno/Historico.md');
    const faixa = parseDocumento(fonte).secoes.find((s) => s.titulo === 'Eventos')?.lista;
    if (faixa === undefined) throw new Error('sem lista');
    const lista = parseListaEventos(fonte.slice(faixa.inicio, faixa.fim));
    const texto = emitirListaEventos(lista.itens, lista.opacas);
    expect(aplicarEdicoes(fonte, [{ ...faixa, texto }])).toBe(fonte);
  });

  it('eventos novos vão para o fim; a região sem fim de linha ganha um antes do primeiro', () => {
    const trecho = listaDaSecao(lerFixture('vaults/v2-exemplo/Perfis/Bruno/Historico.md'), 'Eventos');
    const lista = parseListaEventos(trecho);
    const saida = emitirListaEventos(lista.itens, lista.opacas, [
      { data: '2026-10-21', tipo: 'consulta', texto: 'Retorno com o clínico.' },
      { data: '2026-10-22', tipo: null, texto: 'Resultado entregue.\nSem alterações.' },
    ]);
    expect(saida).toBe(
      `${trecho}\n- **2026-10-21** [consulta] Retorno com o clínico.\n- **2026-10-22** Resultado entregue.\n  Sem alterações.`,
    );
    const relida = parseListaEventos(saida);
    expect(relida.opacas).toEqual(lista.opacas);
    expect(relida.itens.map((i) => i.texto).slice(2)).toEqual(['Retorno com o clínico.', 'Resultado entregue.\nSem alterações.']);
  });

  it('CRLF: evento novo e continuação com CRLF', () => {
    const trecho = '- **2026-01-01** a\r\n- **2026-01-02** b';
    const lista = parseListaEventos(trecho);
    expect(emitirListaEventos(lista.itens, lista.opacas, [{ data: '2026-01-03', tipo: 'sintoma', texto: 'c\nd' }])).toBe(
      `${trecho}\r\n- **2026-01-03** [sintoma] c\r\n  d`,
    );
  });

  it('regenera só o item modificado; os outros e as opacas voltam crus', () => {
    const trecho = linhas('- **2026-02-12**   [consulta] Check-up.  ', '- Primeira consulta em março', '- **2026-08-20** Coleta.');
    const lista = parseListaEventos(trecho);
    const coleta = lista.itens[1];
    if (coleta === undefined) throw new Error('sem item');
    coleta.tipo = 'procedimento';
    coleta.texto = 'Coleta de sangue.\nEm jejum.';
    coleta.modificada = true;
    expect(emitirListaEventos(lista.itens, lista.opacas)).toBe(
      linhas(
        '- **2026-02-12**   [consulta] Check-up.  ',
        '- Primeira consulta em março',
        '- **2026-08-20** [procedimento] Coleta de sangue.',
        '  Em jejum.',
      ),
    );
  });

  it('recusa evento que não cabe na gramática (não grava o que não relê igual)', () => {
    const emitir = (data: string, tipo: string | null, texto: string) => () =>
      emitirListaEventos([], [], [{ data, tipo, texto }]);
    expect(emitir('21/10/2026', null, 'x')).toThrow(/gramática/);
    expect(emitir('2026-10-21', 'Consulta', 'x')).toThrow(/gramática/);
    expect(emitir('2026-10-21', null, '[consulta] parece tipo')).toThrow(/gramática/);
    expect(emitir('2026-10-21', null, 'a\n\nb')).toThrow(/gramática/);
    expect(emitir('2026-10-21', null, 'ok')).not.toThrow();
  });

  it('lista vazia com evento novo: só o evento, sem fim de linha', () => {
    expect(emitirListaEventos([], [], [{ data: '2026-10-21', tipo: null, texto: 'a' }])).toBe('- **2026-10-21** a');
  });
});

describe('no-op byte a byte e invariante em todas as listas do cofre de exemplo e do corpus sujo', () => {
  const arquivos = [
    ...readdirSync(FIXTURES + 'vaults/v2-exemplo', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.md'))
      .map((f) => `vaults/v2-exemplo/${f.replaceAll('\\', '/')}`),
    ...readdirSync(FIXTURES + 'dirty', { encoding: 'utf8' }).map((f) => `dirty/${f}`),
  ];

  it('acha as listas (os 3 históricos e a das notas da família)', () => {
    const comLista = arquivos.filter((a) => parseDocumento(lerFixture(a)).secoes.some((s) => s.lista));
    expect(comLista).toHaveLength(4);
  });

  it.each(arquivos)('%s', (arquivo) => {
    const fonte = lerFixture(arquivo);
    const faixas = new Map<number, Faixa>();
    for (const s of parseDocumento(fonte).secoes) if (s.lista !== undefined) faixas.set(s.lista.inicio, s.lista);
    const edicoes: Edicao[] = [];
    for (const faixa of faixas.values()) {
      const trecho = fonte.slice(faixa.inicio, faixa.fim);
      const lista = parseListaEventos(trecho);
      invariante(trecho, lista);
      const texto = emitirListaEventos(lista.itens, lista.opacas);
      expect(texto).toBe(trecho);
      edicoes.push({ ...faixa, texto });
      // Regenerar todos os itens lidos devolve os mesmos eventos.
      for (const item of lista.itens) item.modificada = true;
      const relida = parseListaEventos(emitirListaEventos(lista.itens, lista.opacas));
      expect(relida.itens.map((i) => [i.data, i.tipo, i.texto])).toEqual(lista.itens.map((i) => [i.data, i.tipo, i.texto]));
      expect(relida.opacas).toEqual(lista.opacas);
    }
    expect(aplicarEdicoes(fonte, edicoes)).toBe(fonte);
  });
});

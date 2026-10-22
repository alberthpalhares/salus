import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Faixa, parseDocumento } from '../../../src/core/format/documento.js';
import { aplicarEdicoes, type Edicao } from '../../../src/core/format/splice.js';
import { contarLinhas, emitirTabela, parseTabela, type Tabela } from '../../../src/core/format/tabela.js';
import { removerBom } from '../../../src/core/format/texto.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const lerFixture = (relativo: string): string => removerBom(readFileSync(FIXTURES + relativo, 'utf8')).texto;
const linhas = (...l: string[]): string => l.join('\n');

const EM_USO = ['Medicamento', 'Dose', 'Frequência', 'Via', 'Desde', 'Prescrito por', 'Renova em', 'Término em', 'Obs'];
const MARCADORES = ['Data', 'Marcador', 'Valor', 'Unidade', 'Faixa do laudo', 'Flag', 'Obs'];
const PESO = ['Data', 'Peso (kg)', 'Obs'];

/** Trecho da tabela da seção `titulo` (fonte já sem BOM). */
function tabelaDaSecao(fonte: string, titulo: string): string {
  const faixa = parseDocumento(fonte).secoes.find((s) => s.titulo === titulo)?.tabela;
  if (faixa === undefined) throw new Error(`seção sem tabela: ${titulo}`);
  return fonte.slice(faixa.inicio, faixa.fim);
}

function invariante(trecho: string, tabela: Tabela): void {
  expect(tabela.linhas.length + tabela.opacas.length + 2).toBe(contarLinhas(trecho));
}

describe('parseTabela — cabeçalho', () => {
  it('cabeçalho conforme: sem problemas, colunas como estão escritas, delimitador cru', () => {
    const trecho = tabelaDaSecao(lerFixture('vaults/v2-exemplo/Perfis/Ana/Medicamentos.md'), 'Em uso');
    const { tabela, problemas } = parseTabela(trecho, EM_USO);
    expect(problemas).toEqual([]);
    expect(tabela.colunas).toEqual(EM_USO);
    expect(tabela.colunasExtras).toEqual([]);
    expect(tabela.cabecalhoRaw).toBe(
      '| Medicamento | Dose | Frequência | Via | Desde | Prescrito por | Renova em | Término em | Obs |',
    );
    expect(tabela.delimitadorRaw).toBe('|---|---|---|---|---|---|---|---|---|');
    expect([tabela.eolCabecalho, tabela.eolDelimitador, tabela.eolPadrao]).toEqual(['\n', '\n', '\n']);
    expect(tabela.linhas.map((l) => l.celulas[0])).toEqual(['Losartana', 'Amoxicilina']);
    expect(tabela.linhas[0]?.celulas).toEqual([
      'Losartana',
      '50 mg',
      '1x ao dia',
      'oral',
      '2024-08-20',
      'Dra. Helena Prado',
      '2026-11-05',
      '',
      'Uso contínuo',
    ]);
    expect(tabela.linhas.every((l) => !l.modificada)).toBe(true);
    invariante(trecho, tabela);
  });

  it('cabeçalho fora de ordem → problema de cabeçalho (a tabela é lida mesmo assim)', () => {
    const trecho = linhas('| Dose | Medicamento | Obs |', '|---|---|---|', '| 50 mg | Losartana | |');
    const { tabela, problemas } = parseTabela(trecho, ['Medicamento', 'Dose', 'Obs']);
    expect(problemas).toHaveLength(2);
    expect(problemas.every((p) => p.includes('cabeçalho'))).toBe(true);
    expect(problemas[0]).toContain('coluna 1');
    expect(problemas[0]).toContain("'Medicamento'");
    expect(tabela.colunas).toEqual(['Dose', 'Medicamento', 'Obs']);
    expect(tabela.linhas.map((l) => l.celulas)).toEqual([['50 mg', 'Losartana', '']]);
  });

  it('o problema de cabeçalho cita só a posição e o nome esperado, nunca o texto achado', () => {
    const trecho = linhas('| Glicose do Fulano | Dose | Obs |', '|---|---|---|', '| a | b | c |');
    const { problemas } = parseTabela(trecho, ['Medicamento', 'Dose', 'Obs']);
    expect(problemas).toEqual(["cabeçalho: a coluna 1 deveria ser 'Medicamento'"]);
    expect(problemas.join(' ')).not.toContain('Glicose');
  });

  it('compara normalizado: pontas, caixa, espaços repetidos e NFC', () => {
    const decomposto = 'Frequência'.normalize('NFD');
    const trecho = linhas(`|  medicamento | DOSE   DIÁRIA | ${decomposto} |`, '|:---|:-:|--:|', '| a | b | c |');
    const { tabela, problemas } = parseTabela(trecho, ['Medicamento', 'Dose diária', 'Frequência']);
    expect(problemas).toEqual([]);
    expect(tabela.colunas).toEqual(['medicamento', 'DOSE   DIÁRIA', decomposto]);
  });

  it('cabeçalho com colunas a menos → problema citando as que faltam', () => {
    const { tabela, problemas } = parseTabela(linhas('| Data | Peso (kg) |', '|---|---|', '| 2026-03-10 | 68,4 |'), PESO);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('cabeçalho');
    expect(problemas[0]).toContain('Obs');
    expect(tabela.colunas).toEqual(['Data', 'Peso (kg)']);
    expect(tabela.linhas[0]?.celulas).toEqual(['2026-03-10', '68,4']);
  });

  it('coluna extra Laboratório → colunasExtras, e as células dela vão para extras', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/coluna-extra.md'), 'Hemograma');
    const { tabela, problemas } = parseTabela(trecho, MARCADORES);
    expect(problemas).toEqual([]);
    expect(tabela.colunas).toEqual(MARCADORES);
    expect(tabela.colunasExtras).toEqual(['Laboratório']);
    expect(tabela.linhas).toHaveLength(2);
    for (const linha of tabela.linhas) {
      expect(linha.celulas).toHaveLength(MARCADORES.length);
      expect(linha.extras).toEqual({ Laboratório: 'Laboratório Exemplo' });
    }
    expect(emitirTabela(tabela)).toBe(trecho);
  });

  it('segunda linha que não é delimitador → problema (e nada se perde)', () => {
    const trecho = linhas('| A | B |', '| x | y |', '| 1 | 2 |');
    const { tabela, problemas } = parseTabela(trecho, ['A', 'B']);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('delimitador');
    expect(tabela.delimitadorRaw).toBe('| x | y |');
    expect(emitirTabela(tabela)).toBe(trecho);
    invariante(trecho, tabela);
  });

  it('delimitador com número de células diferente do cabeçalho → problema', () => {
    const { problemas } = parseTabela(linhas('| A | B |', '|---|', '| 1 | 2 |'), ['A', 'B']);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('delimitador');
  });

  it('coluna extra repetida → problema; reemitir cru vale, regenerar ou acrescentar lança', () => {
    const trecho = linhas('| A | X | X |', '|---|---|---|', '| 1 | 2 | 3 |');
    const { tabela, problemas } = parseTabela(trecho, ['A']);
    expect(tabela.colunasExtras).toEqual(['X', 'X']);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain('coluna extra 3');
    expect(problemas[0]).not.toContain("'X'"); // a posição, não o nome escrito no cabeçalho
    expect(emitirTabela(tabela)).toBe(trecho);
    expect(() => emitirTabela(tabela, [['4', '5', '6']])).toThrow(/coluna extra 'X' se repete/);
    const linha = tabela.linhas[0];
    if (linha === undefined) throw new Error('sem linha');
    linha.modificada = true;
    expect(() => emitirTabela(tabela)).toThrow(/coluna extra 'X' se repete/);
  });
});

describe('parseTabela — células', () => {
  it('a \\| b é lido como a | b e reemitido como a \\| b', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/pipe-escapado.md'), 'Em uso');
    const { tabela } = parseTabela(trecho, EM_USO);
    const losartana = tabela.linhas[0];
    expect(losartana?.celulas).toHaveLength(9);
    expect(losartana?.celulas[8]).toBe('tomar de manhã | ou à noite');
    expect(losartana?.raw).toContain('tomar de manhã \\| ou à noite');
    expect(emitirTabela(tabela)).toBe(trecho);
    if (losartana === undefined) throw new Error('sem linha');
    losartana.modificada = true;
    expect(emitirTabela(tabela)).toBe(trecho);
  });

  it('apara as células; HTML numa célula é só texto', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/html-na-celula.md'), 'Hemograma');
    const { tabela } = parseTabela(trecho, MARCADORES);
    expect(tabela.linhas[1]?.celulas[6]).toBe('<b>alto</b> segundo o paciente');
  });

  it('linha com menos células é completada com vazio (colunas e extras)', () => {
    const trecho = linhas('| A | B | Lab |', '|---|---|---|', '| 1 |', '| 1 | 2 |', '| 1 | 2 | x |');
    const { tabela, problemas } = parseTabela(trecho, ['A', 'B']);
    expect(problemas).toEqual([]);
    expect(tabela.opacas).toEqual([]);
    expect(tabela.linhas.map((l) => [l.celulas, l.extras])).toEqual([
      [['1', ''], { Lab: '' }],
      [['1', '2'], { Lab: '' }],
      [['1', '2'], { Lab: 'x' }],
    ]);
    expect(emitirTabela(tabela)).toBe(trecho);
  });

  it('linha sem | final também vale', () => {
    const { tabela } = parseTabela(linhas('| A | B |', '|---|---|', '| 1 | 2'), ['A', 'B']);
    expect(tabela.linhas[0]?.celulas).toEqual(['1', '2']);
  });

  it('linha indentada continua sendo linha da tabela; o raw fica intacto', () => {
    const trecho = linhas('| A | B |', '  |---|---|', '  | 1 | 2 |  ', '\t| 3 | 4 |');
    const { tabela, problemas } = parseTabela(trecho, ['A', 'B']);
    expect(problemas).toEqual([]);
    expect(tabela.linhas.map((l) => [l.raw, l.celulas])).toEqual([
      ['  | 1 | 2 |  ', ['1', '2']],
      ['\t| 3 | 4 |', ['3', '4']],
    ]);
    expect(emitirTabela(tabela)).toBe(trecho);
  });
});

describe('parseTabela — linhas opacas', () => {
  it('linha com célula a mais → opaca com motivo, na posição dela', () => {
    const trecho = linhas('| A | B |', '|---|---|', '| 1 | 2 | 3 |', '| 4 | 5 |');
    const { tabela, problemas } = parseTabela(trecho, ['A', 'B']);
    expect(problemas).toEqual([]);
    expect(tabela.opacas).toEqual([{ raw: '| 1 | 2 | 3 |', eol: '\n', indice: 2, motivo: 'celulas-a-mais' }]);
    expect(tabela.linhas.map((l) => l.celulas)).toEqual([['4', '5']]);
    expect(emitirTabela(tabela)).toBe(trecho);
    invariante(trecho, tabela);
  });

  it('frase solta no meio da tabela (linha que não começa com |) → opaca', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/linha-opaca.md'), 'Em uso');
    const { tabela, problemas } = parseTabela(trecho, EM_USO);
    expect(problemas).toEqual([]);
    expect(tabela.opacas).toEqual([
      { raw: 'Observação solta escrita à mão no meio da tabela', eol: '\n', indice: 3, motivo: 'sem-barra' },
    ]);
    expect(tabela.linhas.map((l) => l.celulas[0])).toEqual(['Losartana', 'Amoxicilina']);
    expect(emitirTabela(tabela)).toBe(trecho);
    invariante(trecho, tabela);
  });

  it('linha só com células vazias → opaca "vazia"', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/linha-vazia.md'), 'Peso');
    const { tabela } = parseTabela(trecho, PESO);
    expect(tabela.opacas).toEqual([{ raw: '| | | |', eol: '', indice: 4, motivo: 'vazia' }]);
    expect(tabela.linhas).toHaveLength(2);
    expect(emitirTabela(tabela)).toBe(trecho);
    invariante(trecho, tabela);
  });
});

describe('emitirTabela', () => {
  it('regenera só a linha modificada, com | escapado e célula vazia como "| |"', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/pipe-escapado.md'), 'Em uso');
    const { tabela } = parseTabela(trecho, EM_USO);
    const amoxicilina = tabela.linhas[1];
    if (amoxicilina === undefined) throw new Error('sem linha');
    amoxicilina.celulas[8] = 'Tomar com alimento | completar';
    amoxicilina.modificada = true;
    const antes = trecho.split('\n');
    const depois = emitirTabela(tabela).split('\n');
    expect(depois.slice(0, 3)).toEqual(antes.slice(0, 3));
    expect(depois[3]).toBe(
      '| Amoxicilina | 500 mg | a cada 8 h | oral | 2026-10-18 | Dr. Paulo Mendes | | 2026-10-25 | Tomar com alimento \\| completar |',
    );
    expect(depois).toHaveLength(4);
  });

  it('linha modificada leva as extras de volta, na ordem das colunas extras', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/coluna-extra.md'), 'Hemograma');
    const { tabela } = parseTabela(trecho, MARCADORES);
    const [hemoglobina, leucocitos] = tabela.linhas;
    if (hemoglobina === undefined || leucocitos === undefined) throw new Error('sem linha');
    hemoglobina.celulas[2] = '14,0';
    hemoglobina.modificada = true;
    leucocitos.extras['Laboratório'] = 'Outro | Lab';
    leucocitos.modificada = true;
    const saida = emitirTabela(tabela).split('\n');
    expect(saida[2]).toBe('| 2026-09-15 | Hemoglobina | 14,0 | g/dL | 12,0 a 15,5 | normal | | Laboratório Exemplo |');
    expect(saida[3]).toBe('| 2026-09-15 | Leucócitos | 7200 | /mm³ | 4000 a 11000 | normal | | Outro \\| Lab |');
    const relida = parseTabela(saida.join('\n'), MARCADORES).tabela;
    expect(relida.linhas.map((l) => l.extras['Laboratório'])).toEqual(['Laboratório Exemplo', 'Outro | Lab']);
  });

  it('linha modificada depois de uma opaca: a opaca fica no lugar', () => {
    const trecho = tabelaDaSecao(lerFixture('dirty/linha-opaca.md'), 'Em uso');
    const { tabela } = parseTabela(trecho, EM_USO);
    const amoxicilina = tabela.linhas[1];
    if (amoxicilina === undefined) throw new Error('sem linha');
    amoxicilina.celulas[8] = 'Ciclo de 7 dias';
    amoxicilina.modificada = true;
    const antes = trecho.split('\n');
    const depois = emitirTabela(tabela).split('\n');
    expect(depois.slice(0, 4)).toEqual(antes.slice(0, 4));
    expect(depois[4]).toBe(
      '| Amoxicilina | 500 mg | a cada 8 h | oral | 2026-10-18 | Dr. Paulo Mendes | | 2026-10-25 | Ciclo de 7 dias |',
    );
  });

  it('acrescenta linhas novas no fim; a região sem fim de linha ganha um antes da primeira', () => {
    const trecho = tabelaDaSecao(lerFixture('vaults/v2-exemplo/Perfis/Ana/Exames.md'), 'Peso');
    const { tabela } = parseTabela(trecho, PESO);
    const saida = emitirTabela(tabela, [
      ['2026-10-01', '66,0', ''],
      ['2026-10-15', '65,8', 'Depois | antes'],
    ]);
    expect(saida).toBe(`${trecho}\n| 2026-10-01 | 66,0 | |\n| 2026-10-15 | 65,8 | Depois \\| antes |`);
    const relida = parseTabela(saida, PESO).tabela;
    expect(relida.linhas.map((l) => l.celulas[2])).toEqual(['', 'Depois de três meses de caminhada', '', '', 'Depois | antes']);
    invariante(saida, relida);
  });

  it('região que termina com fim de linha: as linhas novas também terminam com ele', () => {
    const trecho = '| A | B |\n|---|---|\n| 1 | 2 |\n';
    const { tabela } = parseTabela(trecho, ['A', 'B']);
    expect(emitirTabela(tabela)).toBe(trecho);
    expect(emitirTabela(tabela, [['3', '4']])).toBe(`${trecho}| 3 | 4 |\n`);
  });

  it('CRLF: no-op byte a byte e linhas novas com CRLF', () => {
    const fonte = lerFixture('dirty/crlf.md');
    const trecho = tabelaDaSecao(fonte, 'Descontinuados');
    const { tabela } = parseTabela(trecho, ['Medicamento', 'Dose', 'Frequência', 'Início', 'Fim', 'Prescrito por', 'Motivo']);
    expect(tabela.eolPadrao).toBe('\r\n');
    expect(tabela.linhas[0]?.eol).toBe('');
    expect(emitirTabela(tabela)).toBe(trecho);
    expect(emitirTabela(tabela, [['Dipirona', '1 g']])).toBe(`${trecho}\r\n| Dipirona | 1 g | | | | | |`);
  });

  it('tabela só com cabeçalho e delimitador: a linha nova vem depois do delimitador', () => {
    const trecho = '| A | B |\r\n|---|---|';
    const { tabela, problemas } = parseTabela(trecho, ['A', 'B']);
    expect(problemas).toEqual([]);
    expect(tabela.linhas).toEqual([]);
    expect(tabela.opacas).toEqual([]);
    expect(tabela.eolPadrao).toBe('\r\n');
    invariante(trecho, tabela);
    expect(emitirTabela(tabela)).toBe(trecho);
    expect(emitirTabela(tabela, [['1', '2']])).toBe('| A | B |\r\n|---|---|\r\n| 1 | 2 |');
  });

  it('tabela só com linhas opacas: tudo volta, e a linha nova vai depois delas', () => {
    const trecho = linhas('| A | B |', '|---|---|', '| | |', 'texto solto');
    const { tabela } = parseTabela(trecho, ['A', 'B']);
    expect(tabela.linhas).toEqual([]);
    expect(tabela.opacas.map((o) => o.motivo)).toEqual(['vazia', 'sem-barra']);
    invariante(trecho, tabela);
    expect(emitirTabela(tabela)).toBe(trecho);
    expect(emitirTabela(tabela, [['1', '2']])).toBe(`${trecho}\n| 1 | 2 |`);
  });

  it('recusa célula com quebra de linha e linha com células demais', () => {
    const { tabela } = parseTabela(linhas('| A | B |', '|---|---|', '| 1 | 2 |'), ['A', 'B']);
    // A mensagem diz a posição e não carrega o conteúdo da célula (dado de saúde pode ir parar em log).
    let mensagem = '';
    try {
      emitirTabela(tabela, [['', 'segredo\nclinico']]);
    } catch (erro) {
      mensagem = (erro as Error).message;
    }
    expect(mensagem).toMatch(/célula 2 tem quebra de linha/);
    expect(mensagem).not.toContain('segredo');
    expect(() => emitirTabela(tabela, [['1', '2', '3']])).toThrow(/células/);
    const linha = tabela.linhas[0];
    if (linha === undefined) throw new Error('sem linha');
    linha.celulas.push('demais');
    linha.modificada = true;
    expect(() => emitirTabela(tabela)).toThrow(/células/);
  });
});

describe('parseTabela — trechos degenerados não lançam e voltam intactos', () => {
  it.each([
    ['vazio', ''],
    ['só o cabeçalho', '| A | B |'],
    ['só o cabeçalho, com quebra', '| A | B |\n'],
    ['uma barra', '|'],
  ])('%s', (_nome, trecho) => {
    const { tabela, problemas } = parseTabela(trecho, ['A', 'B']);
    expect(problemas.length).toBeGreaterThan(0);
    expect(tabela.linhas).toEqual([]);
    expect(tabela.opacas).toEqual([]);
    expect(emitirTabela(tabela)).toBe(trecho);
  });
});

describe('no-op byte a byte e invariante em todas as tabelas do cofre de exemplo e do corpus sujo', () => {
  const arquivos = [
    ...readdirSync(FIXTURES + 'vaults/v2-exemplo', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.md'))
      .map((f) => `vaults/v2-exemplo/${f.replaceAll('\\', '/')}`),
    ...readdirSync(FIXTURES + 'dirty', { encoding: 'utf8' }).map((f) => `dirty/${f}`),
  ];

  it('acha as tabelas (inclusive as CRLF)', () => {
    const total = arquivos.flatMap((a) => parseDocumento(lerFixture(a)).secoes.filter((s) => s.tabela)).length;
    expect(total).toBeGreaterThan(40);
  });

  it.each(arquivos)('%s', (arquivo) => {
    const fonte = lerFixture(arquivo);
    // A seção de nível 1 compartilha a tabela da primeira de nível 2: cada faixa conta uma vez.
    const faixas = new Map<number, Faixa>();
    for (const s of parseDocumento(fonte).secoes) if (s.tabela !== undefined) faixas.set(s.tabela.inicio, s.tabela);
    const edicoes: Edicao[] = [];
    for (const faixa of faixas.values()) {
      const trecho = fonte.slice(faixa.inicio, faixa.fim);
      // Primeiro sem colunas esperadas (tudo vira extra), depois com as do próprio cabeçalho.
      const semEsperadas = parseTabela(trecho, []).tabela;
      expect(emitirTabela(semEsperadas)).toBe(trecho);
      invariante(trecho, semEsperadas);
      const { tabela, problemas } = parseTabela(trecho, semEsperadas.colunasExtras);
      expect(problemas).toEqual([]);
      expect(tabela.colunasExtras).toEqual([]);
      expect(emitirTabela(tabela)).toBe(trecho);
      invariante(trecho, tabela);
      // Regenerar todas as linhas lidas devolve as mesmas células.
      for (const linha of tabela.linhas) linha.modificada = true;
      const regenerada = parseTabela(emitirTabela(tabela), semEsperadas.colunasExtras).tabela;
      expect(regenerada.linhas.map((l) => l.celulas)).toEqual(tabela.linhas.map((l) => l.celulas));
      expect(regenerada.opacas).toEqual(tabela.opacas);
      edicoes.push({ ...faixa, texto: emitirTabela(parseTabela(trecho, []).tabela) });
    }
    expect(aplicarEdicoes(fonte, edicoes)).toBe(fonte);
  });
});

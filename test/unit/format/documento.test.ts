import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { type Documento, type Faixa, parseDocumento } from '../../../src/core/format/documento.js';
import { normalizarCabecalho, removerBom } from '../../../src/core/format/texto.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const lerFixture = (relativo: string): string => readFileSync(FIXTURES + relativo, 'utf8');
const trecho = (fonte: string, faixa: Faixa): string => fonte.slice(faixa.inicio, faixa.fim);
const linhas = (...l: string[]): string => l.join('\n');

function secao(doc: Documento, titulo: string) {
  const achada = doc.secoes.find((s) => s.titulo === titulo);
  if (achada === undefined) throw new Error(`seção ausente: ${titulo}`);
  return achada;
}

describe('parseDocumento — Medicamentos.md da Ana', () => {
  const fonte = lerFixture('vaults/v2-exemplo/Perfis/Ana/Medicamentos.md');
  const doc = parseDocumento(fonte);
  const nivel2 = doc.secoes.filter((s) => s.nivel === 2);

  it('acha as 3 seções de nível 2, cada uma com sua tabela', () => {
    expect(nivel2.map((s) => s.titulo)).toEqual(['Em uso', 'Prescritos', 'Descontinuados']);
    expect(nivel2.map((s) => s.tituloNormalizado)).toEqual(['em uso', 'prescritos', 'descontinuados']);
    for (const s of nivel2) expect(s.tabela).toBeDefined();
  });

  it('offsets da tabela batem com slice: começa em |, termina no | da última linha, sem quebra', () => {
    const tamanhos = nivel2.map((s) => {
      if (s.tabela === undefined) throw new Error('sem tabela');
      const t = trecho(fonte, s.tabela);
      expect(t.startsWith('| Medicamento | Dose | Frequência |')).toBe(true);
      expect(t.endsWith('|')).toBe(true);
      return t.split('\n').length;
    });
    expect(tamanhos).toEqual([4, 3, 3]);
    const emUso = secao(doc, 'Em uso').tabela;
    if (emUso === undefined) throw new Error('sem tabela');
    expect(trecho(fonte, emUso).split('\n')[3]).toBe(
      '| Amoxicilina | 500 mg | a cada 8 h | oral | 2026-10-18 | Dr. Paulo Mendes | | 2026-10-25 | Tomar com alimento \\| completar os 7 dias |',
    );
  });

  it('a seção vai do cabeçalho até o próximo cabeçalho de nível ≤ ou o fim do texto', () => {
    const [emUso, prescritos, descontinuados] = nivel2;
    if (emUso === undefined || prescritos === undefined || descontinuados === undefined) throw new Error();
    expect(fonte.slice(emUso.inicio).startsWith('## Em uso\n')).toBe(true);
    expect(emUso.fim).toBe(prescritos.inicio);
    expect(prescritos.fim).toBe(descontinuados.inicio);
    expect(descontinuados.fim).toBe(fonte.length);
    const titulo = doc.secoes[0];
    expect(titulo?.nivel).toBe(1);
    expect(titulo?.titulo).toBe('Medicamentos — Ana');
    expect(titulo?.fim).toBe(fonte.length);
    expect(titulo?.tabela).toEqual(emUso.tabela);
  });
});

describe('parseDocumento — Ficha.md da Ana', () => {
  const fonte = lerFixture('vaults/v2-exemplo/Perfis/Ana/Ficha.md');
  const doc = parseDocumento(fonte);

  it('frontmatter: texto é o YAML interno, a faixa cobre o bloco com as duas linhas ---', () => {
    const fm = doc.frontmatter;
    if (fm === undefined) throw new Error('sem frontmatter');
    expect(fm.texto.startsWith('id: ana\n')).toBe(true);
    expect(fm.texto.endsWith('conjuges: [bruno]')).toBe(true);
    expect(fm.inicio).toBe(0);
    expect(trecho(fonte, fm)).toBe(`---\n${fm.texto}\n---`);
    expect(fonte.slice(fm.fim, fm.fim + 3)).toBe('\n\n#');
  });

  it('as duas regiões gerenciadas têm tabela; a seção de texto livre não', () => {
    const contatos = secao(doc, 'Contatos de emergência').tabela;
    const profissionais = secao(doc, 'Profissionais de referência').tabela;
    if (contatos === undefined || profissionais === undefined) throw new Error('sem tabela');
    expect(trecho(fonte, contatos)).toBe(
      linhas('| Nome | Relação | Telefone |', '|---|---|---|', '| Bruno | Cônjuge | (11) 90000-0001 |'),
    );
    expect(trecho(fonte, profissionais).split('\n')).toHaveLength(4);
    expect(secao(doc, 'Observações').tabela).toBeUndefined();
  });

  it('offsets em unidades UTF-16 (emojis antes das seções não deslocam nada)', () => {
    expect(fonte.includes('📒')).toBe(true);
    for (const s of doc.secoes) {
      expect(fonte.slice(s.inicio).startsWith(`${'#'.repeat(s.nivel)} ${s.titulo}`)).toBe(true);
    }
  });
});

describe('parseDocumento — CRLF', () => {
  const crlf = lerFixture('dirty/crlf.md');
  const lf = crlf.replaceAll('\r\n', '\n');
  const docCrlf = parseDocumento(crlf);
  const docLf = parseDocumento(lf);

  it('a fixture é mesmo CRLF', () => {
    expect(crlf.includes('\r\n')).toBe(true);
    expect(crlf.replaceAll('\r\n', '').includes('\n')).toBe(false);
  });

  it('dá os mesmos títulos e níveis que o gêmeo LF', () => {
    const resumo = (d: Documento) => d.secoes.map((s) => [s.nivel, s.titulo, s.tituloNormalizado]);
    expect(resumo(docCrlf)).toEqual(resumo(docLf));
    expect(docCrlf.secoes.filter((s) => s.nivel === 2).map((s) => s.titulo)).toEqual([
      'Em uso',
      'Prescritos',
      'Descontinuados',
    ]);
  });

  it('o texto de cada tabela é o mesmo do gêmeo LF, a menos dos \\r', () => {
    expect(docCrlf.secoes).toHaveLength(docLf.secoes.length);
    docCrlf.secoes.forEach((s, i) => {
      const gemeo = docLf.secoes[i]?.tabela;
      if (s.tabela === undefined || gemeo === undefined) throw new Error('sem tabela');
      const t = trecho(crlf, s.tabela);
      expect(t.includes('\r\n')).toBe(true);
      expect(t.startsWith('|')).toBe(true);
      expect(t.endsWith('|')).toBe(true);
      expect(t.replaceAll('\r\n', '\n')).toBe(trecho(lf, gemeo));
    });
  });

  it('frontmatter CRLF: texto com os CRLF originais, faixa até o --- de fechamento', () => {
    const fonte = '---\r\nid: ana\r\nnome: Ana\r\n---\r\n\r\n# T\r\n';
    const fm = parseDocumento(fonte).frontmatter;
    expect(fm).toEqual({ inicio: 0, fim: fonte.indexOf('\r\n\r\n#'), texto: 'id: ana\r\nnome: Ana' });
  });
});

describe('parseDocumento — casos de borda', () => {
  it('tabela dentro de fence de código não conta, nem o cabeçalho dentro dela', () => {
    const fonte = linhas(
      '# Notas',
      '',
      '## Exemplo',
      '',
      '```markdown',
      '## Em uso',
      '',
      '| Medicamento | Dose |',
      '|---|---|',
      '| Falso | 1 mg |',
      '```',
      '',
      'Texto depois do exemplo.',
      '',
    );
    const doc = parseDocumento(fonte);
    expect(doc.secoes.map((s) => s.titulo)).toEqual(['Notas', 'Exemplo']);
    expect(doc.secoes.every((s) => s.tabela === undefined)).toBe(true);
  });

  it('com uma tabela real depois do fence, a tabela é a real', () => {
    const fonte = linhas('## Em uso', '', '~~~', '| Falso |', '|---|', '~~~', '', '| Real |', '|---|', '| 1 |', '');
    const tabela = parseDocumento(fonte).secoes[0]?.tabela;
    if (tabela === undefined) throw new Error('sem tabela');
    expect(trecho(fonte, tabela)).toBe(linhas('| Real |', '|---|', '| 1 |'));
  });

  it('tabela logo abaixo do cabeçalho, sem linha em branco', () => {
    const fonte = linhas('## Em uso', '| A | B |', '|---|---|', '| 1 | 2 |', '');
    const tabela = parseDocumento(fonte).secoes[0]?.tabela;
    if (tabela === undefined) throw new Error('sem tabela');
    expect(trecho(fonte, tabela)).toBe(linhas('| A | B |', '|---|---|', '| 1 | 2 |'));
  });

  it('frase solta no meio da tabela continua dentro da faixa (vira linha opaca adiante)', () => {
    const fonte = lerFixture('dirty/linha-opaca.md');
    const tabela = secao(parseDocumento(fonte), 'Em uso').tabela;
    if (tabela === undefined) throw new Error('sem tabela');
    const t = trecho(fonte, tabela).split('\n');
    expect(t).toHaveLength(5);
    expect(t[3]).toBe('Observação solta escrita à mão no meio da tabela');
  });

  it('espaços no fim da última linha ficam dentro da faixa', () => {
    const fonte = lerFixture('dirty/espaco-final.md');
    const tabela = secao(parseDocumento(fonte), 'Descontinuados').tabela;
    if (tabela === undefined) throw new Error('sem tabela');
    expect(trecho(fonte, tabela).endsWith('| Fim do tratamento | ')).toBe(true);
    expect(fonte.slice(tabela.fim)).toBe('\n');
  });

  it('só a primeira tabela da seção é dela; uma tabela de subseção ### conta se vier primeiro', () => {
    const fonte = linhas(
      '## Doses',
      '',
      '| A |',
      '|---|',
      '| 1 |',
      '',
      '| B |',
      '|---|',
      '| 2 |',
      '',
      '## Em uso',
      '',
      'Texto livre.',
      '',
      '### Detalhes',
      '',
      '| C |',
      '|---|',
      '| 3 |',
      '',
      '## Prescritos',
      '',
    );
    const doc = parseDocumento(fonte);
    const doses = secao(doc, 'Doses').tabela;
    const emUso = secao(doc, 'Em uso');
    const detalhes = secao(doc, 'Detalhes');
    if (doses === undefined || emUso.tabela === undefined) throw new Error('sem tabela');
    expect(trecho(fonte, doses)).toBe(linhas('| A |', '|---|', '| 1 |'));
    expect(trecho(fonte, emUso.tabela)).toBe(linhas('| C |', '|---|', '| 3 |'));
    expect(detalhes.tabela).toEqual(emUso.tabela);
    expect(emUso.fim).toBe(secao(doc, 'Prescritos').inicio);
    expect(detalhes.fim).toBe(emUso.fim);
    expect(secao(doc, 'Prescritos').tabela).toBeUndefined();
  });

  it('lista: a faixa vai do primeiro item ao fim do último, incluindo sublistas', () => {
    const fonte = linhas(
      '## Eventos',
      '',
      '- **2026-01-01** a',
      '  - sub',
      '    - subsub',
      '- **2026-01-02** b',
      '  continuação indentada',
      '',
      'Texto depois.',
      '',
    );
    const s = parseDocumento(fonte).secoes[0];
    if (s?.lista === undefined) throw new Error('sem lista');
    expect(trecho(fonte, s.lista)).toBe(
      linhas('- **2026-01-01** a', '  - sub', '    - subsub', '- **2026-01-02** b', '  continuação indentada'),
    );
    expect(s.tabela).toBeUndefined();
  });

  it('lista de eventos do Historico.md da Ana', () => {
    const fonte = lerFixture('vaults/v2-exemplo/Perfis/Ana/Historico.md');
    const lista = secao(parseDocumento(fonte), 'Eventos').lista;
    if (lista === undefined) throw new Error('sem lista');
    const itens = trecho(fonte, lista).split('\n');
    expect(itens).toHaveLength(5);
    expect(itens.every((l) => l.startsWith('- **2026-'))).toBe(true);
  });

  it('cabeçalho setext (=== / ---) é cabeçalho', () => {
    const fonte = linhas('Título', '======', '', 'Seção', '-----', '', '| A |', '|---|', '| 1 |', '');
    const doc = parseDocumento(fonte);
    expect(doc.secoes.map((s) => [s.nivel, s.titulo])).toEqual([
      [1, 'Título'],
      [2, 'Seção'],
    ]);
    expect(doc.secoes[1]?.tabela).toBeDefined();
  });

  it('--- no meio do texto é linha horizontal, não frontmatter', () => {
    const doc = parseDocumento(linhas('# A', '', '---', '', 'texto', ''));
    expect(doc.frontmatter).toBeUndefined();
    expect(doc.secoes.map((s) => s.titulo)).toEqual(['A']);
  });

  it('bloco --- que não começa no offset 0 não é frontmatter (e o --- final vira setext)', () => {
    const doc = parseDocumento(linhas('', '---', 'id: x', '---', ''));
    expect(doc.frontmatter).toBeUndefined();
    expect(doc.secoes.map((s) => [s.nivel, s.titulo])).toEqual([[2, 'id: x']]);
  });

  it('--- sem fechamento não é frontmatter; frontmatter vazio tem texto vazio', () => {
    expect(parseDocumento(linhas('---', 'id: ana', '', '# T', '')).frontmatter).toBeUndefined();
    expect(parseDocumento(linhas('---', '---', '', '# T', '')).frontmatter).toEqual({ inicio: 0, fim: 7, texto: '' });
  });

  it('título: conteúdo do cabeçalho como está escrito, sem # nem espaços das pontas', () => {
    const doc = parseDocumento(linhas('##   Pressão   arterial  ##', '', '## Perfil *lipídico*', '', '##', ''));
    expect(doc.secoes.map((s) => s.titulo)).toEqual(['Pressão   arterial', 'Perfil *lipídico*', '']);
    expect(doc.secoes[0]?.tituloNormalizado).toBe('pressão arterial');
  });

  it('cabeçalho e tabela dentro de citação ou item de lista não contam', () => {
    const fonte = linhas('> ## Citado', '', '## Real', '', '> | a |', '> |---|', '> | 1 |', '', '- ## Item', '');
    const doc = parseDocumento(fonte);
    expect(doc.secoes.map((s) => s.titulo)).toEqual(['Real']);
    expect(doc.secoes[0]?.tabela).toBeUndefined();
  });

  it('texto sem cabeçalho não tem seções', () => {
    expect(parseDocumento('')).toEqual({ secoes: [] });
    expect(parseDocumento('só um parágrafo\n')).toEqual({ secoes: [] });
  });

  it('recusa texto com BOM (os offsets do remark sairiam deslocados)', () => {
    expect(() => parseDocumento(lerFixture('dirty/bom.md'))).toThrow(/BOM/);
    expect(() => parseDocumento(removerBom(lerFixture('dirty/bom.md')).texto)).not.toThrow();
  });
});

describe('parseDocumento — invariantes em todo o cofre de exemplo e no corpus sujo', () => {
  const arquivos = [
    ...readdirSync(FIXTURES + 'vaults/v2-exemplo', { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.md'))
      .map((f) => `vaults/v2-exemplo/${f.replaceAll('\\', '/')}`),
    ...readdirSync(FIXTURES + 'dirty', { encoding: 'utf8' }).map((f) => `dirty/${f}`),
  ];

  it('acha os arquivos', () => {
    expect(arquivos.length).toBeGreaterThan(25);
  });

  it.each(arquivos)('%s', (arquivo) => {
    const fonte = removerBom(lerFixture(arquivo)).texto;
    const doc = parseDocumento(fonte);
    let anterior = -1;
    for (const s of doc.secoes) {
      expect(s.inicio).toBeGreaterThan(anterior);
      anterior = s.inicio;
      expect(s.fim).toBeGreaterThan(s.inicio);
      expect(s.fim).toBeLessThanOrEqual(fonte.length);
      expect(fonte.slice(s.inicio).startsWith('#'.repeat(s.nivel) + ' ')).toBe(true);
      expect(s.tituloNormalizado).toBe(normalizarCabecalho(s.titulo));
      for (const faixa of [s.tabela, s.lista]) {
        if (faixa === undefined) continue;
        expect(faixa.inicio).toBeGreaterThan(s.inicio);
        expect(faixa.fim).toBeLessThanOrEqual(s.fim);
        expect(trecho(fonte, faixa)).not.toMatch(/[\r\n]$/);
      }
      if (s.tabela !== undefined) {
        const t = trecho(fonte, s.tabela);
        expect(t.startsWith('|')).toBe(true);
        expect(t.trimEnd().endsWith('|')).toBe(true);
      }
      if (s.lista !== undefined) expect(trecho(fonte, s.lista).startsWith('- ')).toBe(true);
    }
    if (doc.frontmatter !== undefined) {
      expect(trecho(fonte, doc.frontmatter).startsWith('---')).toBe(true);
      expect(trecho(fonte, doc.frontmatter).endsWith('---')).toBe(true);
    }
  });
});

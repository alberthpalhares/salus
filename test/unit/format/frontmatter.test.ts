import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDocumento } from '../../../src/core/format/documento.js';
import {
  ErroFrontmatter,
  escreverFrontmatter,
  lerFrontmatter,
} from '../../../src/core/format/frontmatter.js';
import { aplicarEdicoes } from '../../../src/core/format/splice.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const lerFixture = (relativo: string): string => readFileSync(FIXTURES + relativo, 'utf8');
const ANA = lerFixture('vaults/v2-exemplo/Perfis/Ana/Ficha.md');
const COMENTARIO =
  '# alergias: null = ainda não perguntado; [] = sem alergias conhecidas; lista = alergias confirmadas';

function ler(fonte: string) {
  const lido = lerFrontmatter(parseDocumento(fonte), fonte);
  if (lido === undefined) throw new Error('sem frontmatter');
  return lido;
}

function capturar(fn: () => unknown): unknown {
  try {
    fn();
  } catch (erro) {
    return erro;
  }
  throw new Error('não lançou');
}

describe('lerFrontmatter', () => {
  it('arquivo sem frontmatter devolve undefined', () => {
    const fonte = '# Medicamentos — Ana\n\n## Em uso\n';
    expect(lerFrontmatter(parseDocumento(fonte), fonte)).toBeUndefined();
  });

  it('lê a Ficha da Ana: escalares como texto e comentário preservado no toString()', () => {
    const { documento, faixa } = ler(ANA);
    expect(documento.get('id')).toBe('ana');
    expect(documento.get('nascimento')).toBe('1985-03-10');
    expect(documento.toJS()).toMatchObject({ alergias: ['Dipirona'], conjuges: ['bruno'] });
    expect(documento.toString()).toContain(COMENTARIO);
    expect(faixa).toEqual({ inicio: 0, fim: ANA.indexOf('\n---\n', 3) + 4 });
  });

  it('YAML inválido → ErroFrontmatter com a linha do arquivo', () => {
    const erro = capturar(() => ler('---\nid: ana\nid: bruno\n---\n'));
    expect(erro).toBeInstanceOf(ErroFrontmatter);
    expect(erro).toBeInstanceOf(Error);
    expect(erro).toMatchObject({ linha: 3 });
    expect((erro as Error).message).toMatch(/linha 3/);
  });

  it('a linha do erro conta as linhas do arquivo também com CRLF', () => {
    const erro = capturar(() => ler('---\r\nid: ana\r\nnome: Ana\r\nid: bruno\r\n---\r\n'));
    expect(erro).toMatchObject({ linha: 4 });
  });
});

describe('escreverFrontmatter', () => {
  it('sem mudança devolve undefined (nada a gravar)', () => {
    const { documento, faixa } = ler(ANA);
    expect(escreverFrontmatter(ANA, faixa, documento, false)).toBeUndefined();
  });

  it.each([
    'vaults/v2-exemplo/Perfis/Ana/Ficha.md',
    'vaults/v2-exemplo/Perfis/Bruno/Ficha.md',
    'vaults/v2-exemplo/Perfis/Mia (gata)/Ficha.md',
    'vaults/v2-exemplo/Perfis/Ana/Genetica.md',
  ])('regravar sem alteração reproduz o bloco byte a byte: %s', (arquivo) => {
    const fonte = lerFixture(arquivo);
    const { documento, faixa } = ler(fonte);
    const edicao = escreverFrontmatter(fonte, faixa, documento, true);
    const bloco = fonte.slice(faixa.inicio, faixa.fim);
    expect(edicao).toEqual({ inicio: faixa.inicio, fim: faixa.fim, texto: bloco });
  });

  it("doc.set('papel', 'Mãe') gera a edição com papel: Mãe e o comentário mantido", () => {
    const antes = ANA.replace('papel: Mãe\n', 'papel: Responsável\n');
    expect(antes).not.toBe(ANA);
    const { documento, faixa } = ler(antes);
    documento.set('papel', 'Mãe');
    const edicao = escreverFrontmatter(antes, faixa, documento, true);
    if (edicao === undefined) throw new Error('sem edição');
    expect(edicao.texto).toContain('papel: Mãe');
    expect(edicao.texto).toContain(COMENTARIO);
    expect(edicao.texto.startsWith('---\n')).toBe(true);
    expect(edicao.texto.endsWith('\nconjuges: [bruno]\n---')).toBe(true);
    // Só a linha do papel muda; o resto do arquivo volta byte a byte.
    expect(aplicarEdicoes(antes, [edicao])).toBe(ANA);
  });

  it('usa o EOL dominante da fonte (CRLF) em todas as linhas do bloco', () => {
    const anaCrlf = ANA.replaceAll('\n', '\r\n');
    const antes = anaCrlf.replace('papel: Mãe\r\n', 'papel: Responsável\r\n');
    const { documento, faixa } = ler(antes);
    documento.set('papel', 'Mãe');
    const edicao = escreverFrontmatter(antes, faixa, documento, true);
    if (edicao === undefined) throw new Error('sem edição');
    expect(edicao.texto.startsWith('---\r\n')).toBe(true);
    expect(edicao.texto.endsWith('\r\n---')).toBe(true);
    expect(/(^|[^\r])\n/.test(edicao.texto)).toBe(false);
    expect(aplicarEdicoes(antes, [edicao])).toBe(anaCrlf);
  });

  it('chave nova entra no fim do bloco, antes do --- de fechamento', () => {
    const { documento, faixa } = ler(ANA);
    documento.set('apelido', 'Aninha');
    const edicao = escreverFrontmatter(ANA, faixa, documento, true);
    if (edicao === undefined) throw new Error('sem edição');
    const depois = aplicarEdicoes(ANA, [edicao]);
    expect(depois).toBe(ANA.replace('conjuges: [bruno]\n---\n', 'conjuges: [bruno]\napelido: Aninha\n---\n'));
  });
});

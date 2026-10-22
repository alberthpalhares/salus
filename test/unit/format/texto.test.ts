import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  compararTexto,
  desescaparCelula,
  detectarEol,
  dividirLinhas,
  escaparCelula,
  linhaDoOffset,
  normalizarCabecalho,
  removerBom,
} from '../../../src/core/format/texto.js';
import { compararTexto as compararTextoDasConsultas } from '../../../src/core/queries/normalizar.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/', import.meta.url));
const lerFixture = (relativo: string): string => readFileSync(FIXTURES + relativo, 'utf8');

describe('removerBom', () => {
  it('remove o U+FEFF do início e sinaliza', () => {
    expect(removerBom('\uFEFF# Título\n')).toEqual({ texto: '# Título\n', tinhaBom: true });
  });

  it('sem BOM devolve o texto intacto', () => {
    expect(removerBom('# Título\n')).toEqual({ texto: '# Título\n', tinhaBom: false });
    expect(removerBom('')).toEqual({ texto: '', tinhaBom: false });
  });

  it('só o BOM do início sai: um U+FEFF no meio do texto fica', () => {
    expect(removerBom('a\uFEFFb')).toEqual({ texto: 'a\uFEFFb', tinhaBom: false });
    expect(removerBom('\uFEFF\uFEFFa')).toEqual({ texto: '\uFEFFa', tinhaBom: true });
  });

  it('lê o BOM real de dirty/bom.md', () => {
    const { texto, tinhaBom } = removerBom(lerFixture('dirty/bom.md'));
    expect(tinhaBom).toBe(true);
    expect(texto.startsWith('# Medicamentos')).toBe(true);
  });
});

describe('detectarEol', () => {
  it('escolhe o terminador dominante', () => {
    expect(detectarEol('a\r\nb\r\nc\n')).toBe('CRLF');
    expect(detectarEol('a\nb\nc\r\n')).toBe('LF');
  });

  it('empate ou texto sem quebra de linha → LF', () => {
    expect(detectarEol('a\r\nb\n')).toBe('LF');
    expect(detectarEol('sem quebra')).toBe('LF');
    expect(detectarEol('')).toBe('LF');
  });

  it('\\r solto não conta como fim de linha', () => {
    expect(detectarEol('a\rb\rc\r\n')).toBe('CRLF');
    expect(detectarEol('a\rb\rc\n')).toBe('LF');
  });

  it('reconhece os arquivos do corpus', () => {
    expect(detectarEol(lerFixture('dirty/crlf.md'))).toBe('CRLF');
    expect(detectarEol(lerFixture('vaults/v2-exemplo/Perfis/Ana/Medicamentos.md'))).toBe('LF');
  });
});

describe('normalizarCabecalho', () => {
  it('apara, ignora maiúsculas e colapsa espaços repetidos', () => {
    expect(normalizarCabecalho('  Pressão  Arterial ')).toBe(normalizarCabecalho('pressão arterial'));
    expect(normalizarCabecalho('  Pressão  Arterial ')).toBe('pressão arterial');
  });

  it('normaliza o Unicode para NFC (ã decomposto = ã composto)', () => {
    const decomposto = 'Pressa\u0303o arterial';
    expect(decomposto).not.toBe('Pressão arterial');
    expect(normalizarCabecalho(decomposto)).toBe(normalizarCabecalho('Pressão arterial'));
    expect(normalizarCabecalho(decomposto)).toBe('pressão arterial'.normalize('NFC'));
  });

  it('trata tabulação, espaço inseparável e quebra de linha como espaço', () => {
    expect(normalizarCabecalho('Contatos\tde\u00A0\u00A0emergência')).toBe('contatos de emergência');
    expect(normalizarCabecalho('Contatos de\nemergência')).toBe('contatos de emergência');
  });

  it('minúsculas com acento em português', () => {
    expect(normalizarCabecalho('DESCONTINUADOS')).toBe('descontinuados');
    expect(normalizarCabecalho('ÉPOCA DE VACINAÇÃO')).toBe('época de vacinação');
  });
});

describe('escaparCelula / desescaparCelula', () => {
  it('escreve | como \\| e lê \\| como |', () => {
    expect(escaparCelula('Tomar com alimento | completar os 7 dias')).toBe(
      'Tomar com alimento \\| completar os 7 dias',
    );
    expect(desescaparCelula('Tomar com alimento \\| completar os 7 dias')).toBe(
      'Tomar com alimento | completar os 7 dias',
    );
  });

  it('texto sem | passa intacto (HTML é só texto)', () => {
    expect(escaparCelula('<b>alto</b> segundo o paciente')).toBe('<b>alto</b> segundo o paciente');
    expect(desescaparCelula('<b>alto</b> segundo o paciente')).toBe('<b>alto</b> segundo o paciente');
    expect(escaparCelula('')).toBe('');
  });

  it('round-trip com barra invertida antes do |', () => {
    for (const s of ['a\\|b', '\\', 'a\\', '||', '\\\\|', '| início e fim |']) {
      expect(desescaparCelula(escaparCelula(s))).toBe(s);
    }
  });

  it('propriedade: desescapar(escapar(s)) === s', () => {
    const unidade = fc.constantFrom('|', '\\', 'a', ' ', 'ç', 'é', '\u0303', '<', '>');
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.string({ unit: unidade })), (s) => {
        expect(desescaparCelula(escaparCelula(s))).toBe(s);
        // Depois de escapar, todo | está precedido de \ (nunca vira divisor de célula).
        expect(/(^|[^\\])\|/.test(escaparCelula(s))).toBe(false);
      }),
      { numRuns: 300 },
    );
  });
});

describe('dividirLinhas', () => {
  it('separa linhas e guarda o terminador original de cada uma', () => {
    expect(dividirLinhas('a\r\nb\nc')).toEqual({ linhas: ['a', 'b', 'c'], eols: ['\r\n', '\n', ''] });
  });

  it('texto terminado em quebra não ganha linha vazia extra', () => {
    expect(dividirLinhas('a\n')).toEqual({ linhas: ['a'], eols: ['\n'] });
    expect(dividirLinhas('a\n\n')).toEqual({ linhas: ['a', ''], eols: ['\n', '\n'] });
  });

  it('texto vazio não tem linhas', () => {
    expect(dividirLinhas('')).toEqual({ linhas: [], eols: [] });
  });

  it('\\r solto fica dentro da linha', () => {
    expect(dividirLinhas('a\rb\n')).toEqual({ linhas: ['a\rb'], eols: ['\n'] });
  });

  it('preserva o CRLF de dirty/crlf.md linha a linha', () => {
    const fonte = lerFixture('dirty/crlf.md');
    const { linhas, eols } = dividirLinhas(fonte);
    expect(linhas.length).toBe(20);
    expect(eols.every((eol) => eol === '\r\n')).toBe(true);
    expect(linhas.some((l) => l.includes('\r'))).toBe(false);
  });

  it('propriedade: linhas e eols paralelos; juntar devolve a fonte byte a byte', () => {
    const unidade = fc.constantFrom('a', ' ', '|', '\r', '\n', '\r\n', 'é');
    fc.assert(
      fc.property(fc.string({ unit: unidade }), (s) => {
        const { linhas, eols } = dividirLinhas(s);
        expect(linhas.length).toBe(eols.length);
        expect(linhas.map((l, i) => l + eols[i]).join('')).toBe(s);
        for (const l of linhas) expect(l.includes('\n')).toBe(false);
        for (const eol of eols.slice(0, -1)) expect(['\n', '\r\n']).toContain(eol);
      }),
      { numRuns: 300 },
    );
  });
});

describe('linhaDoOffset e compararTexto (uma definição só, reusada no núcleo)', () => {
  it('linhaDoOffset: 1 + quantos `\n` há antes do offset (CRLF conta uma vez)', () => {
    const fonte = 'a\nbc\r\nd';
    expect(linhaDoOffset(fonte, 0)).toBe(1);
    expect(linhaDoOffset(fonte, 1)).toBe(1); // o próprio `\n` ainda é da linha 1
    expect(linhaDoOffset(fonte, 2)).toBe(2);
    expect(linhaDoOffset(fonte, 6)).toBe(3);
    expect(linhaDoOffset(fonte, 99)).toBe(3);
  });

  it('compararTexto: ordem do Explorer (acento, caixa, números por valor) e é a mesma das consultas', () => {
    expect(['Zélia', 'Ana 10', 'Ágata', 'Ana 2', 'ana'].sort(compararTexto)).toEqual(['Ágata', 'ana', 'Ana 2', 'Ana 10', 'Zélia']);
    expect(compararTextoDasConsultas).toBe(compararTexto);
  });
});

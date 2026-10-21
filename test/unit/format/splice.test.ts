import { describe, expect, it } from 'vitest';
import { aplicarEdicoes, type Edicao } from '../../../src/core/format/splice.js';

const FONTE = '0123456789';

describe('aplicarEdicoes', () => {
  it('sem edições devolve a fonte intacta', () => {
    expect(aplicarEdicoes(FONTE, [])).toBe(FONTE);
  });

  it('aplica duas edições fora de ordem; offsets sempre da fonte original', () => {
    const edicoes: Edicao[] = [
      { inicio: 6, fim: 8, texto: 'X' },
      { inicio: 1, fim: 3, texto: 'YYYY' },
    ];
    expect(aplicarEdicoes(FONTE, edicoes)).toBe('0YYYY345X89');
    // A ordem de entrada não muda o resultado nem é alterada.
    expect(aplicarEdicoes(FONTE, [...edicoes].reverse())).toBe('0YYYY345X89');
    expect(edicoes[0]).toEqual({ inicio: 6, fim: 8, texto: 'X' });
  });

  it('troca, remove e insere', () => {
    expect(aplicarEdicoes(FONTE, [{ inicio: 0, fim: 10, texto: 'novo' }])).toBe('novo');
    expect(aplicarEdicoes(FONTE, [{ inicio: 2, fim: 5, texto: '' }])).toBe('0156789');
    expect(aplicarEdicoes(FONTE, [{ inicio: 10, fim: 10, texto: '!' }])).toBe('0123456789!');
    expect(aplicarEdicoes(FONTE, [{ inicio: 0, fim: 0, texto: '>' }])).toBe('>0123456789');
  });

  it('faixas encostadas não se sobrepõem', () => {
    const edicoes: Edicao[] = [
      { inicio: 2, fim: 4, texto: 'b' },
      { inicio: 0, fim: 2, texto: 'a' },
    ];
    expect(aplicarEdicoes(FONTE, edicoes)).toBe('ab456789');
  });

  it('rejeita sobreposição com Error', () => {
    expect(() =>
      aplicarEdicoes(FONTE, [
        { inicio: 1, fim: 5, texto: 'a' },
        { inicio: 4, fim: 6, texto: 'b' },
      ]),
    ).toThrow(/sobrep/);
    expect(() =>
      aplicarEdicoes(FONTE, [
        { inicio: 2, fim: 8, texto: 'a' },
        { inicio: 3, fim: 4, texto: 'b' },
      ]),
    ).toThrow(Error);
  });

  it('duas edições não vazias no mesmo início se sobrepõem', () => {
    expect(() =>
      aplicarEdicoes(FONTE, [
        { inicio: 3, fim: 5, texto: 'a' },
        { inicio: 3, fim: 4, texto: 'b' },
      ]),
    ).toThrow(/sobrep/);
  });

  it('inserção estritamente dentro de uma troca é sobreposição', () => {
    expect(() =>
      aplicarEdicoes(FONTE, [
        { inicio: 2, fim: 6, texto: 'a' },
        { inicio: 4, fim: 4, texto: 'b' },
      ]),
    ).toThrow(/sobrep/);
  });

  it('inserções no mesmo ponto entram na ordem de entrada', () => {
    expect(
      aplicarEdicoes(FONTE, [
        { inicio: 3, fim: 3, texto: 'A' },
        { inicio: 3, fim: 3, texto: 'B' },
        { inicio: 3, fim: 3, texto: 'C' },
      ]),
    ).toBe('012ABC3456789');
  });

  it('inserção e troca com o mesmo início seguem a ordem de entrada', () => {
    const troca: Edicao = { inicio: 3, fim: 5, texto: 'T' };
    const insercao: Edicao = { inicio: 3, fim: 3, texto: 'i' };
    expect(aplicarEdicoes(FONTE, [insercao, troca])).toBe('012iT56789');
    expect(aplicarEdicoes(FONTE, [troca, insercao])).toBe('012Ti56789');
  });

  it('inserção no fim de uma troca vem depois dela', () => {
    expect(
      aplicarEdicoes(FONTE, [
        { inicio: 5, fim: 5, texto: 'i' },
        { inicio: 3, fim: 5, texto: 'T' },
      ]),
    ).toBe('012Ti56789');
  });

  it('rejeita faixa invertida, fora da fonte ou não inteira', () => {
    expect(() => aplicarEdicoes(FONTE, [{ inicio: 5, fim: 4, texto: '' }])).toThrow(Error);
    expect(() => aplicarEdicoes(FONTE, [{ inicio: -1, fim: 2, texto: '' }])).toThrow(Error);
    expect(() => aplicarEdicoes(FONTE, [{ inicio: 8, fim: 11, texto: '' }])).toThrow(Error);
    expect(() => aplicarEdicoes(FONTE, [{ inicio: 1.5, fim: 2, texto: '' }])).toThrow(Error);
  });

  it('preserva CRLF e caracteres fora do BMP fora das faixas', () => {
    const fonte = 'a📒\r\nb\r\nc\r\n';
    const inicio = fonte.indexOf('b');
    expect(aplicarEdicoes(fonte, [{ inicio, fim: inicio + 1, texto: 'B' }])).toBe('a📒\r\nB\r\nc\r\n');
  });
});

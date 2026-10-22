import fc from 'fast-check';
import { afterEach, describe, expect, it } from 'vitest';
import { ehDataValida } from '../../../src/core/schema/comuns.js';
import { diasEntre, exigirDataValida, hojeIso, somarDias } from '../../../src/core/queries/datas.js';

/** Mensagem do erro lançado por `fn` (falha o teste se `fn` não lançar). */
function mensagemDe(fn: () => unknown): string {
  try {
    fn();
  } catch (erro) {
    return erro instanceof Error ? erro.message : String(erro);
  }
  throw new Error('a função não lançou');
}

describe('diasEntre', () => {
  it('conta dias civis entre duas datas (b − a)', () => {
    expect(diasEntre('2026-02-28', '2026-03-01')).toBe(1);
    expect(diasEntre('2024-02-28', '2024-03-01')).toBe(2);
    expect(diasEntre('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('mesma data dá 0 e a ordem invertida dá o negativo', () => {
    expect(diasEntre('2026-10-21', '2026-10-21')).toBe(0);
    expect(diasEntre('2026-03-01', '2026-02-28')).toBe(-1);
    expect(diasEntre('2027-01-01', '2026-12-31')).toBe(-1);
  });

  it('respeita ano bissexto, inclusive nos séculos (1900 e 2100 não são; 2000 é)', () => {
    expect(diasEntre('2028-02-28', '2028-03-01')).toBe(2);
    expect(diasEntre('2028-02-29', '2028-03-01')).toBe(1);
    expect(diasEntre('2000-02-28', '2000-03-01')).toBe(2);
    expect(diasEntre('1900-02-28', '1900-03-01')).toBe(1);
    expect(diasEntre('2100-02-28', '2100-03-01')).toBe(1);
    expect(diasEntre('2026-01-01', '2027-01-01')).toBe(365);
    expect(diasEntre('2024-01-01', '2025-01-01')).toBe(366);
  });

  it('não escorrega por fuso nem por horário de verão: 28 de março a 1 de abril são 4 dias', () => {
    expect(diasEntre('2026-03-28', '2026-04-01')).toBe(4);
    expect(diasEntre('2026-10-24', '2026-11-02')).toBe(9);
    expect(diasEntre('2026-01-01', '2026-12-31')).toBe(364);
  });

  it('anos de dois dígitos não viram 19xx (Date.UTC faz isso com 0–99)', () => {
    expect(diasEntre('0050-02-28', '0050-03-01')).toBe(1);
    expect(diasEntre('0050-01-01', '0051-01-01')).toBe(365);
  });

  it('data que não existe lança RangeError, e a mensagem não repete texto que não seja data', () => {
    expect(() => diasEntre('2026-02-29', '2026-03-01')).toThrow(RangeError);
    expect(() => diasEntre('2026-03-01', '2026-13-01')).toThrow(RangeError);
    expect(() => diasEntre('hipertensão arterial', '2026-03-01')).toThrow(RangeError);
    expect(() => diasEntre('2026-03-01', '')).toThrow(RangeError);
    expect(mensagemDe(() => diasEntre('hipertensão arterial', '2026-03-01'))).not.toContain('hipertens');
    expect(mensagemDe(() => diasEntre('2026-02-29', '2026-03-01'))).toContain('2026-02-29');
  });
});

describe('somarDias', () => {
  it('soma dias atravessando mês, ano e fevereiro bissexto', () => {
    expect(somarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(somarDias('2024-02-28', 1)).toBe('2024-02-29');
    expect(somarDias('2024-02-29', 1)).toBe('2024-03-01');
    expect(somarDias('2026-02-28', 1)).toBe('2026-03-01');
    expect(somarDias('2028-02-29', 366)).toBe('2029-03-01');
  });

  it('zero devolve a mesma data e o negativo volta no tempo', () => {
    expect(somarDias('2026-10-21', 0)).toBe('2026-10-21');
    expect(somarDias('2027-01-01', -1)).toBe('2026-12-31');
    expect(somarDias('2026-03-01', -1)).toBe('2026-02-28');
    expect(somarDias('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('formata com zeros à esquerda (mês, dia e ano de menos de quatro dígitos)', () => {
    expect(somarDias('2026-01-01', 4)).toBe('2026-01-05');
    expect(somarDias('0050-12-31', 1)).toBe('0051-01-01');
  });

  it('data inválida, quantidade fracionária ou fora do calendário lançam RangeError', () => {
    expect(() => somarDias('2026-02-30', 1)).toThrow(RangeError);
    expect(() => somarDias('ontem', 1)).toThrow(RangeError);
    expect(() => somarDias('2026-01-01', 1.5)).toThrow(RangeError);
    expect(() => somarDias('2026-01-01', Number.NaN)).toThrow(RangeError);
    expect(() => somarDias('9999-12-31', 1)).toThrow(RangeError);
    expect(() => somarDias('0000-01-01', -1)).toThrow(RangeError);
  });
});

describe('diasEntre e somarDias se desfazem (propriedade)', () => {
  const data = fc
    .record({ ano: fc.integer({ min: 20, max: 9980 }), mes: fc.integer({ min: 1, max: 12 }), dia: fc.integer({ min: 1, max: 31 }) })
    .map(({ ano, mes, dia }) => `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`)
    .filter(ehDataValida);

  it('diasEntre(a, somarDias(a, n)) === n', () => {
    fc.assert(
      fc.property(data, fc.integer({ min: -4000, max: 4000 }), (a, n) => {
        expect(diasEntre(a, somarDias(a, n))).toBe(n);
      }),
      { numRuns: 300 },
    );
  });

  it('somarDias(a, diasEntre(a, b)) === b e a soma devolve sempre uma data válida', () => {
    fc.assert(
      fc.property(data, data, (a, b) => {
        expect(somarDias(a, diasEntre(a, b))).toBe(b);
        expect(ehDataValida(somarDias(a, 1))).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});

describe('hojeIso', () => {
  it('formata a data local, com zeros à esquerda', () => {
    expect(hojeIso(new Date(2026, 0, 5, 12, 0))).toBe('2026-01-05');
    expect(hojeIso(new Date(2026, 9, 21, 8, 30))).toBe('2026-10-21');
    expect(hojeIso(new Date(2028, 1, 29))).toBe('2028-02-29');
  });

  it('perto da meia-noite local continua no dia local (toISOString mudaria de dia em muitos fusos)', () => {
    expect(hojeIso(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    expect(hojeIso(new Date(2027, 0, 1, 0, 0, 1))).toBe('2027-01-01');
  });

  it('sem argumento usa o relógio e devolve uma data válida', () => {
    const hoje = hojeIso();
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ehDataValida(hoje)).toBe(true);
  });

  it('data inválida (Invalid Date) lança RangeError', () => {
    expect(() => hojeIso(new Date(Number.NaN))).toThrow(RangeError);
  });
});

describe('hojeIso em outros fusos', () => {
  const fusoOriginal = process.env.TZ;
  afterEach(() => {
    if (fusoOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = fusoOriginal;
  });

  it.each([
    // [fuso, instante, data local]: o dia local e o dia UTC diferem, e o que vale é o local
    ['Pacific/Auckland', '2026-12-31T20:00:00Z', '2027-01-01'], // UTC+13: o dia local já virou, o UTC não
    ['America/Sao_Paulo', '2027-01-01T02:00:00Z', '2026-12-31'], // UTC-3: o dia UTC já virou, o local não
    ['UTC', '2026-12-31T23:59:59Z', '2026-12-31'],
  ])('%s', (fuso, instante, esperado) => {
    process.env.TZ = fuso;
    expect(hojeIso(new Date(instante))).toBe(esperado);
  });
});

describe('exigirDataValida', () => {
  it('aceita 29 de fevereiro de ano bissexto e rejeita o de ano comum', () => {
    expect(() => exigirDataValida('2028-02-29')).not.toThrow();
    expect(() => exigirDataValida('2027-02-29')).toThrow(RangeError);
  });
});

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  DataIso,
  DataOuVazia,
  ehDataValida,
  FlagExame,
  FORMATO_DATA,
  HoraHHmm,
  HoraOuVazia,
  Id,
  TextoOpcional,
  TipoAntiparasitario,
  TipoEvento,
  TipoMembro,
} from '../../../src/core/schema/comuns.js';

describe('ehDataValida', () => {
  it('rejeita 29 de fevereiro em ano comum e aceita em ano bissexto', () => {
    expect(ehDataValida('2026-02-29')).toBe(false);
    expect(ehDataValida('2024-02-29')).toBe(true);
  });

  it('trata os séculos: 1900 não é bissexto, 2000 é', () => {
    expect(ehDataValida('1900-02-29')).toBe(false);
    expect(ehDataValida('2000-02-29')).toBe(true);
  });

  it('rejeita mês, dia e formato fora do calendário', () => {
    expect(ehDataValida('2026-13-01')).toBe(false);
    expect(ehDataValida('2026-00-10')).toBe(false);
    expect(ehDataValida('2026-01-00')).toBe(false);
    expect(ehDataValida('2026-04-31')).toBe(false);
    expect(ehDataValida('2026-1-1')).toBe(false);
    expect(ehDataValida('10/03/1985')).toBe(false);
    expect(ehDataValida('')).toBe(false);
  });

  it('propriedade: aceita todo dia do mês e rejeita o dia seguinte ao último', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9999 }), fc.integer({ min: 1, max: 12 }), (ano, mes) => {
        const diasNoMes = diasDoMes(ano, mes);
        const aaaa = String(ano).padStart(4, '0');
        const mm = String(mes).padStart(2, '0');
        for (let dia = 1; dia <= diasNoMes; dia++) {
          expect(ehDataValida(`${aaaa}-${mm}-${String(dia).padStart(2, '0')}`)).toBe(true);
        }
        expect(ehDataValida(`${aaaa}-${mm}-${String(diasNoMes + 1).padStart(2, '0')}`)).toBe(false);
      }),
    );
  });
});

/** Oráculo independente: o Date do JS conta os dias do mês (setUTCFullYear evita o mapeamento de anos 0-99). */
function diasDoMes(ano: number, mes: number): number {
  const d = new Date(0);
  d.setUTCFullYear(ano, mes, 0);
  return d.getUTCDate();
}

describe('DataIso', () => {
  it('aceita uma data ISO existente', () => {
    expect(DataIso.safeParse('2026-10-21').success).toBe(true);
    expect(DataIso.safeParse('2024-02-29').success).toBe(true);
  });

  it('rejeita formato fora de AAAA-MM-DD', () => {
    expect(DataIso.safeParse('26-1-1').success).toBe(false);
    expect(DataIso.safeParse('2026/10/21').success).toBe(false);
    expect(DataIso.safeParse('').success).toBe(false);
  });

  it('rejeita data que não existe no calendário', () => {
    expect(DataIso.safeParse('2026-02-30').success).toBe(false);
  });

  it('dá uma única mensagem em pt-BR para o formato inválido', () => {
    const r = DataIso.safeParse('26-1-1');
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues).toHaveLength(1);
      expect(r.error.issues[0]?.message).toContain('AAAA-MM-DD');
    }
  });

  it('rejeita o que não é texto (YAML sem aspas vira número ou booleano)', () => {
    expect(DataIso.safeParse(20261021).success).toBe(false);
    expect(DataIso.safeParse(null).success).toBe(false);
  });
});

describe('DataOuVazia', () => {
  it('aceita data ISO válida e a célula vazia', () => {
    expect(DataOuVazia.safeParse('2026-11-05').success).toBe(true);
    expect(DataOuVazia.safeParse('').success).toBe(true);
  });

  it('rejeita data inexistente e texto solto', () => {
    expect(DataOuVazia.safeParse('2026-02-30').success).toBe(false);
    expect(DataOuVazia.safeParse('em breve').success).toBe(false);
    expect(DataOuVazia.safeParse(' ').success).toBe(false);
  });

  it('aceita null (chave YAML presente e vazia) e o normaliza para vazio', () => {
    expect(DataOuVazia.parse(null)).toBe('');
    expect(DataOuVazia.default('').parse(undefined)).toBe('');
    expect(DataOuVazia.safeParse(20261021).success).toBe(false);
  });
});

describe('HoraOuVazia', () => {
  it('aceita HH:MM, vazio e null (normalizado para vazio)', () => {
    expect(HoraOuVazia.parse('07:30')).toBe('07:30');
    expect(HoraOuVazia.parse('')).toBe('');
    expect(HoraOuVazia.parse(null)).toBe('');
  });

  it('rejeita hora inválida e o que não é texto', () => {
    expect(HoraOuVazia.safeParse('7h30').success).toBe(false);
    expect(HoraOuVazia.safeParse(730).success).toBe(false);
  });
});

describe('TextoOpcional', () => {
  it('ausente e null valem vazio; texto é mantido; número é rejeitado', () => {
    expect(TextoOpcional.parse(undefined)).toBe('');
    expect(TextoOpcional.parse(null)).toBe('');
    expect(TextoOpcional.parse('F')).toBe('F');
    expect(TextoOpcional.safeParse(985112000123456).success).toBe(false);
  });
});

describe('HoraHHmm', () => {
  it('aceita horas de 00:00 a 23:59', () => {
    for (const h of ['00:00', '07:30', '12:05', '23:59']) {
      expect(HoraHHmm.safeParse(h).success).toBe(true);
    }
  });

  it('rejeita hora fora do relógio ou do formato', () => {
    for (const h of ['24:00', '12:60', '7:30', '07:3', '0730', '07h30', '']) {
      expect(HoraHHmm.safeParse(h).success).toBe(false);
    }
  });
});

describe('Id', () => {
  it('aceita minúsculas, números e hífen', () => {
    expect(Id.safeParse('ana-maria').success).toBe(true);
    expect(Id.safeParse('ana').success).toBe(true);
    expect(Id.safeParse('rex2').success).toBe(true);
    expect(Id.safeParse('2a').success).toBe(true);
  });

  it('rejeita maiúscula, acento, espaço, hífen inicial e vazio', () => {
    for (const id of ['Ana', 'josé', 'ana maria', '-ana', 'ana_maria', '']) {
      expect(Id.safeParse(id).success).toBe(false);
    }
  });
});

describe('vocabulários fechados', () => {
  it('TipoMembro', () => {
    for (const t of ['pessoa', 'cao', 'gato', 'outro']) expect(TipoMembro.safeParse(t).success).toBe(true);
    expect(TipoMembro.safeParse('cachorro').success).toBe(false);
    expect(TipoMembro.safeParse('').success).toBe(false);
  });

  it('FlagExame aceita o vazio e rejeita variações', () => {
    for (const f of ['normal', 'alto', 'baixo', '']) expect(FlagExame.safeParse(f).success).toBe(true);
    expect(FlagExame.safeParse('Alto').success).toBe(false);
    expect(FlagExame.safeParse('crítico').success).toBe(false);
  });

  it('TipoAntiparasitario', () => {
    for (const t of ['antipulgas', 'vermifugo']) expect(TipoAntiparasitario.safeParse(t).success).toBe(true);
    expect(TipoAntiparasitario.safeParse('vermífugo').success).toBe(false);
    expect(TipoAntiparasitario.safeParse('').success).toBe(false);
  });

  it('TipoEvento', () => {
    for (const t of ['consulta', 'sintoma', 'procedimento', 'observacao']) {
      expect(TipoEvento.safeParse(t).success).toBe(true);
    }
    expect(TipoEvento.safeParse('observação').success).toBe(false);
  });
});

describe('FORMATO_DATA (exportado: a única regex de forma AAAA-MM-DD do núcleo)', () => {
  it('aceita a forma (sem olhar o calendário) e recusa o resto', () => {
    expect(FORMATO_DATA.test('2026-02-30')).toBe(true);
    for (const s of ['2026-2-3', '26-02-03', '2026-02-03 ', '03/02/2026', '']) expect(FORMATO_DATA.test(s), s).toBe(false);
  });
});

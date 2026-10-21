import { z } from 'zod';

const FORMATO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;

function anoBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

/** `AAAA-MM-DD` que existe no calendário (2026-02-29 não existe; 2024-02-29 existe). */
export function ehDataValida(s: string): boolean {
  const partes = FORMATO_DATA.exec(s);
  if (partes === null) return false;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (mes < 1 || mes > 12 || dia < 1) return false;
  const diasPorMes = [31, anoBissexto(ano) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dia <= (diasPorMes[mes - 1] ?? 0);
}

/** Data ISO estrita. O formato reprovado e o calendário reprovado dão uma mensagem cada, nunca as duas. */
export const DataIso = z
  .string()
  .regex(FORMATO_DATA, { error: 'a data deve estar no formato AAAA-MM-DD', abort: true })
  .refine(ehDataValida, { error: 'a data não existe no calendário' });
export type DataIso = z.infer<typeof DataIso>;

/** Data ISO ou célula vazia (data desconhecida ou não se aplica). */
export const DataOuVazia = z.string().refine((s) => s === '' || ehDataValida(s), {
  error: 'a data deve estar no formato AAAA-MM-DD (e existir no calendário) ou ficar vazia',
});
export type DataOuVazia = z.infer<typeof DataOuVazia>;

/** Hora `HH:MM`, de 00:00 a 23:59. */
export const HoraHHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'a hora deve estar no formato HH:MM' });
export type HoraHHmm = z.infer<typeof HoraHHmm>;

/** Hora `HH:MM` ou célula vazia. */
export const HoraOuVazia = z.string().refine((s) => s === '' || HoraHHmm.safeParse(s).success, {
  error: 'a hora deve estar no formato HH:MM ou ficar vazia',
});
export type HoraOuVazia = z.infer<typeof HoraOuVazia>;

export const TipoMembro = z.enum(['pessoa', 'cao', 'gato', 'outro']);
export type TipoMembro = z.infer<typeof TipoMembro>;

/** Identificador curto do membro: minúsculas sem acento, números e hífen (`ana`, `ana-maria`). */
export const Id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, { error: 'o id usa só minúsculas sem acento, números e hífen, e não começa com hífen' });
export type Id = z.infer<typeof Id>;

/** Flag do próprio laudo; vazio quando o laudo não traz. */
export const FlagExame = z.enum(['normal', 'alto', 'baixo', '']);
export type FlagExame = z.infer<typeof FlagExame>;

export const TipoAntiparasitario = z.enum(['antipulgas', 'vermifugo']);
export type TipoAntiparasitario = z.infer<typeof TipoAntiparasitario>;

export const TipoEvento = z.enum(['consulta', 'sintoma', 'procedimento', 'observacao']);
export type TipoEvento = z.infer<typeof TipoEvento>;

/** Texto de uma célula ou chave opcional: ausente vale vazio. */
export const TextoOpcional = z.string().default('');

/** Texto que identifica o registro (nome, produto, valor medido): não pode ficar vazio. */
export const TextoObrigatorio = z.string().min(1, { error: 'o campo não pode ficar vazio' });

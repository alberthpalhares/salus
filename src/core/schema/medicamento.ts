import { z } from 'zod';
import { DataOuVazia, TextoObrigatorio, TextoOpcional } from './comuns.js';

/** Linha de `## Em uso`. `renova_em` é a renovação da receita contínua; `termino_em`, o fim de um ciclo fechado. */
export const MedicamentoEmUso = z.object({
  nome: TextoObrigatorio,
  dose: TextoOpcional,
  frequencia: TextoOpcional,
  via: TextoOpcional,
  desde: DataOuVazia.default(''),
  prescrito_por: TextoOpcional,
  renova_em: DataOuVazia.default(''),
  termino_em: DataOuVazia.default(''),
  obs: TextoOpcional,
});
export type MedicamentoEmUso = z.infer<typeof MedicamentoEmUso>;

/** Linha de `## Prescritos`: receita ainda não iniciada. */
export const MedicamentoPrescrito = z.object({
  nome: TextoObrigatorio,
  dose: TextoOpcional,
  frequencia: TextoOpcional,
  data_receita: DataOuVazia.default(''),
  prescrito_por: TextoOpcional,
  validade_receita: DataOuVazia.default(''),
  obs: TextoOpcional,
});
export type MedicamentoPrescrito = z.infer<typeof MedicamentoPrescrito>;

/** Linha de `## Descontinuados`. */
export const MedicamentoDescontinuado = z.object({
  nome: TextoObrigatorio,
  dose: TextoOpcional,
  frequencia: TextoOpcional,
  inicio: DataOuVazia.default(''),
  fim: DataOuVazia.default(''),
  prescrito_por: TextoOpcional,
  motivo: TextoOpcional,
});
export type MedicamentoDescontinuado = z.infer<typeof MedicamentoDescontinuado>;

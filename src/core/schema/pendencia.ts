import { z } from 'zod';
import { DataOuVazia, TextoObrigatorio, TextoOpcional } from './comuns.js';

/** Linha de `## Exames solicitados`. `realizar_ate` pode ficar vazio. */
export const ExameSolicitado = z.object({
  exame: TextoObrigatorio,
  solicitado_em: DataOuVazia.default(''),
  solicitado_por: TextoOpcional,
  realizar_ate: DataOuVazia.default(''),
  obs: TextoOpcional,
});
export type ExameSolicitado = z.infer<typeof ExameSolicitado>;

/** Linha de `## Consultas e check-ups`. Sem data, entra na agenda como "sem data". */
export const Consulta = z.object({
  tipo: TextoObrigatorio,
  data: DataOuVazia.default(''),
  profissional: TextoOpcional,
  obs: TextoOpcional,
});
export type Consulta = z.infer<typeof Consulta>;

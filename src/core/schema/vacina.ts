import { z } from 'zod';
import { DataOuVazia, TextoObrigatorio, TextoOpcional, TipoAntiparasitario } from './comuns.js';

/** Linha de `## Vacinas`. */
export const Vacina = z.object({
  nome: TextoObrigatorio,
  aplicada_em: DataOuVazia.default(''),
  proxima_em: DataOuVazia.default(''),
  obs: TextoOpcional,
});
export type Vacina = z.infer<typeof Vacina>;

/** Linha de `## Antiparasitários` (só animais). */
export const Antiparasitario = z.object({
  produto: TextoObrigatorio,
  tipo: TipoAntiparasitario,
  aplicado_em: DataOuVazia.default(''),
  proximo_em: DataOuVazia.default(''),
  obs: TextoOpcional,
});
export type Antiparasitario = z.infer<typeof Antiparasitario>;

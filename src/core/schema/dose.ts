import { z } from 'zod';
import { DataIso, HoraOuVazia, TextoObrigatorio, TextoOpcional } from './comuns.js';

/** Linha de `## Doses` do Doses.md: dose tomada, só de acréscimo. */
export const Dose = z.object({
  data: DataIso,
  hora: HoraOuVazia.default(''),
  medicamento: TextoObrigatorio,
  dose: TextoOpcional,
  obs: TextoOpcional,
});
export type Dose = z.infer<typeof Dose>;

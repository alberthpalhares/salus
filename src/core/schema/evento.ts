import { z } from 'zod';
import { DataIso, TextoObrigatorio, TipoEvento } from './comuns.js';

/** Item de `## Eventos` do Historico.md: `- **AAAA-MM-DD** [tipo] texto`. `tipo` é opcional (`null` sem `[tipo]`). */
export const Evento = z.object({
  data: DataIso,
  tipo: TipoEvento.nullable(),
  texto: TextoObrigatorio,
});
export type Evento = z.infer<typeof Evento>;

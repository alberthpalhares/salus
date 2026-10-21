import { z } from 'zod';
import { DataIso, TextoObrigatorio } from './comuns.js';

/** Conteúdo do `salus.yaml`, o manifesto do cofre v2 na raiz. `ultima_revisao` é `null` se nunca houve revisão. */
export const SalusYaml = z.object({
  schema_versao: z.literal(2),
  versao_salus: TextoObrigatorio,
  familia: TextoObrigatorio,
  criado_em: DataIso,
  ultima_revisao: DataIso.nullable().default(null),
});
export type SalusYaml = z.infer<typeof SalusYaml>;

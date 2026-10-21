import { z } from 'zod';
import { DataIso, FlagExame, HoraOuVazia, TextoObrigatorio, TextoOpcional } from './comuns.js';

/**
 * Linha de um exame de laboratório (`## <Exame>` não canônico). `exame` é o título da seção.
 * `valor` é o texto exatamente como está no laudo; `flag` é sempre a do laudo e só existe com faixa.
 */
export const Marcador = z
  .object({
    exame: TextoObrigatorio,
    data: DataIso,
    marcador: TextoObrigatorio,
    valor: TextoObrigatorio,
    unidade: TextoOpcional,
    faixa_do_laudo: TextoOpcional,
    flag: FlagExame.default(''),
    obs: TextoOpcional,
  })
  .superRefine((m, ctx) => {
    if (m.flag !== '' && m.faixa_do_laudo === '') {
      ctx.addIssue({
        code: 'custom',
        path: ['faixa_do_laudo'],
        message: 'a Flag só existe com a Faixa do laudo preenchida (o Salus não inventa faixas)',
        params: { codigo: 'faixa_obrigatoria' },
      });
    }
  });
export type Marcador = z.infer<typeof Marcador>;

/** Linha de `## Peso`. `peso` em kg, como escrito (`68,4`). */
export const Peso = z.object({
  data: DataIso,
  peso: TextoObrigatorio,
  obs: TextoOpcional,
});
export type Peso = z.infer<typeof Peso>;

/** Linha de `## Pressão arterial`. */
export const Pressao = z.object({
  data: DataIso,
  sistolica: TextoObrigatorio,
  diastolica: TextoObrigatorio,
  fc: TextoOpcional,
  obs: TextoOpcional,
});
export type Pressao = z.infer<typeof Pressao>;

/** Linha de `## Glicemia`. `condicao` é texto livre (`jejum`, `pós-prandial`). */
export const Glicemia = z.object({
  data: DataIso,
  hora: HoraOuVazia.default(''),
  valor: TextoObrigatorio,
  condicao: TextoOpcional,
  obs: TextoOpcional,
});
export type Glicemia = z.infer<typeof Glicemia>;

const NUMERO_DO_LAUDO = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Número de um `valor` de laudo, para gráficos: aceita `5,5` e `5.5`; devolve `null` para o que
 * não é um número puro (`< 0,5`, `negativo`, vazio). Nunca arredonda nem interpreta o texto.
 */
export function valorNumerico(valor: string): number | null {
  const texto = valor.trim();
  if (!NUMERO_DO_LAUDO.test(texto)) return null;
  return Number(texto.replace(',', '.'));
}

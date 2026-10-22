import type { DataIso, FlagExame } from '../schema/comuns.js';
import { valorNumerico } from '../schema/exame.js';
import type { Vault } from '../vault/Vault.js';
import { compararDatas } from './datas.js';
import { normalizarParaBusca } from './normalizar.js';

/** Um resultado do marcador, para tabela ou gráfico. */
export type PontoMarcador = {
  data: DataIso;
  /** O texto do laudo, como está escrito. */
  valor: string;
  /** O número de `valor` (`5,5` e `5.5` valem 5,5); `null` quando não é um número puro (`< 0,5`, `negativo`). */
  valorNumerico: number | null;
  unidade: string;
  faixa_do_laudo: string;
  /** A do próprio laudo; `''` quando o laudo não traz. */
  flag: FlagExame;
  /** Seção do `Exames.md` de onde veio (`Hemograma`). */
  exame: string;
};

/**
 * A série do marcador `nomeMarcador` do membro `id`, por data (a mesma data mantém a ordem do arquivo).
 * O nome tem de ser igual ao do laudo, sem distinguir acento nem caixa. `id` ou marcador que não
 * existem dão lista vazia.
 */
export function serieMarcador(vault: Vault, id: string, nomeMarcador: string): PontoMarcador[] {
  const membro = vault.membro(id);
  const procurado = normalizarParaBusca(nomeMarcador);
  if (membro === undefined || procurado === '') return [];
  return membro.exames.marcadores
    .filter((m) => normalizarParaBusca(m.marcador) === procurado)
    .map((m) => ({
      data: m.data,
      valor: m.valor,
      valorNumerico: valorNumerico(m.valor),
      unidade: m.unidade,
      faixa_do_laudo: m.faixa_do_laudo,
      flag: m.flag,
      exame: m.exame,
    }))
    .sort((a, b) => compararDatas(a.data, b.data));
}

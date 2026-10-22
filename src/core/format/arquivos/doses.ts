/** Codec do `Doses.md`: a tabela `## Doses` (registro só de acréscimo). */
import { Dose } from '../../schema/dose.js';
import { edicoesDasTabelas, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';
import type { SpecTabela } from './validacao.js';

export type DadosDoses = { doses: Dose[] };

export const DOSES: SpecTabela<Dose> = {
  chave: 'doses',
  secao: 'Doses',
  colunas: [
    { titulo: 'Data', campo: 'data' },
    { titulo: 'Hora', campo: 'hora' },
    { titulo: 'Medicamento', campo: 'medicamento' },
    { titulo: 'Dose', campo: 'dose' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Dose,
};

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosDoses> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  return leitura.resultado({ doses: leitura.regiao(DOSES) });
}

/** O codec aceita qualquer mudança; a regra "só acréscimo" é dos comandos (Fase 1B). */
export function escrever(estado: EstadoArquivo, dados: DadosDoses): string {
  return gravar(estado, edicoesDasTabelas(estado, [DOSES], dados));
}

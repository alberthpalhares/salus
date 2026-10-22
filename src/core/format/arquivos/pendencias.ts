/** Codec do `Pendencias.md`: `## Exames solicitados` e `## Consultas e check-ups`. */
import { Consulta, ExameSolicitado } from '../../schema/pendencia.js';
import { edicoesDasTabelas, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';
import type { SpecTabela } from './validacao.js';

export type DadosPendencias = {
  examesSolicitados: ExameSolicitado[];
  consultas: Consulta[];
};

export const EXAMES_SOLICITADOS: SpecTabela<ExameSolicitado> = {
  chave: 'examesSolicitados',
  secao: 'Exames solicitados',
  colunas: [
    { titulo: 'Exame', campo: 'exame' },
    { titulo: 'Solicitado em', campo: 'solicitado_em' },
    { titulo: 'Solicitado por', campo: 'solicitado_por' },
    { titulo: 'Realizar até', campo: 'realizar_ate' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: ExameSolicitado,
};

export const CONSULTAS: SpecTabela<Consulta> = {
  chave: 'consultas',
  secao: 'Consultas e check-ups',
  colunas: [
    { titulo: 'Tipo', campo: 'tipo' },
    { titulo: 'Data', campo: 'data' },
    { titulo: 'Profissional', campo: 'profissional' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Consulta,
};

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosPendencias> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  return leitura.resultado({
    examesSolicitados: leitura.regiao(EXAMES_SOLICITADOS),
    consultas: leitura.regiao(CONSULTAS),
  });
}

export function escrever(estado: EstadoArquivo, dados: DadosPendencias): string {
  return gravar(estado, edicoesDasTabelas(estado, [EXAMES_SOLICITADOS, CONSULTAS], dados));
}

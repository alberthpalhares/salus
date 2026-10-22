/** Codec do `Medicamentos.md`: as tabelas `## Em uso`, `## Prescritos` e `## Descontinuados`. */
import {
  MedicamentoDescontinuado,
  MedicamentoEmUso,
  MedicamentoPrescrito,
} from '../../schema/medicamento.js';
import { edicoesDasTabelas, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';
import type { SpecTabela } from './validacao.js';

export type DadosMedicamentos = {
  emUso: MedicamentoEmUso[];
  prescritos: MedicamentoPrescrito[];
  descontinuados: MedicamentoDescontinuado[];
};

export const EM_USO: SpecTabela<MedicamentoEmUso> = {
  chave: 'emUso',
  secao: 'Em uso',
  colunas: [
    { titulo: 'Medicamento', campo: 'nome' },
    { titulo: 'Dose', campo: 'dose' },
    { titulo: 'Frequência', campo: 'frequencia' },
    { titulo: 'Via', campo: 'via' },
    { titulo: 'Desde', campo: 'desde' },
    { titulo: 'Prescrito por', campo: 'prescrito_por' },
    { titulo: 'Renova em', campo: 'renova_em' },
    { titulo: 'Término em', campo: 'termino_em' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: MedicamentoEmUso,
};

export const PRESCRITOS: SpecTabela<MedicamentoPrescrito> = {
  chave: 'prescritos',
  secao: 'Prescritos',
  colunas: [
    { titulo: 'Medicamento', campo: 'nome' },
    { titulo: 'Dose', campo: 'dose' },
    { titulo: 'Frequência', campo: 'frequencia' },
    { titulo: 'Data da receita', campo: 'data_receita' },
    { titulo: 'Prescrito por', campo: 'prescrito_por' },
    { titulo: 'Validade da receita', campo: 'validade_receita' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: MedicamentoPrescrito,
};

export const DESCONTINUADOS: SpecTabela<MedicamentoDescontinuado> = {
  chave: 'descontinuados',
  secao: 'Descontinuados',
  colunas: [
    { titulo: 'Medicamento', campo: 'nome' },
    { titulo: 'Dose', campo: 'dose' },
    { titulo: 'Frequência', campo: 'frequencia' },
    { titulo: 'Início', campo: 'inicio' },
    { titulo: 'Fim', campo: 'fim' },
    { titulo: 'Prescrito por', campo: 'prescrito_por' },
    { titulo: 'Motivo', campo: 'motivo' },
  ],
  schema: MedicamentoDescontinuado,
};

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosMedicamentos> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  return leitura.resultado({
    emUso: leitura.regiao(EM_USO),
    prescritos: leitura.regiao(PRESCRITOS),
    descontinuados: leitura.regiao(DESCONTINUADOS),
  });
}

export function escrever(estado: EstadoArquivo, dados: DadosMedicamentos): string {
  return gravar(estado, edicoesDasTabelas(estado, [EM_USO, PRESCRITOS, DESCONTINUADOS], dados));
}

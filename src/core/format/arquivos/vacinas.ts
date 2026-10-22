/**
 * Codec do `Vacinas.md`: `## Vacinas` e `## Antiparasitários` (só animais; a ausência da seção não é
 * problema, porque perfis de pessoa não a têm).
 */
import { Antiparasitario, Vacina } from '../../schema/vacina.js';
import { edicoesDasTabelas, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';
import type { SpecTabela } from './validacao.js';

export type DadosVacinas = {
  vacinas: Vacina[];
  antiparasitarios: Antiparasitario[];
};

export const VACINAS: SpecTabela<Vacina> = {
  chave: 'vacinas',
  secao: 'Vacinas',
  colunas: [
    { titulo: 'Vacina', campo: 'nome' },
    { titulo: 'Aplicada em', campo: 'aplicada_em' },
    { titulo: 'Próxima em', campo: 'proxima_em' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Vacina,
};

export const ANTIPARASITARIOS: SpecTabela<Antiparasitario> = {
  chave: 'antiparasitarios',
  secao: 'Antiparasitários',
  colunas: [
    { titulo: 'Produto', campo: 'produto' },
    { titulo: 'Tipo', campo: 'tipo' },
    { titulo: 'Aplicado em', campo: 'aplicado_em' },
    { titulo: 'Próximo em', campo: 'proximo_em' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Antiparasitario,
};

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosVacinas> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  return leitura.resultado({
    vacinas: leitura.regiao(VACINAS),
    antiparasitarios: leitura.regiao(ANTIPARASITARIOS, true),
  });
}

export function escrever(estado: EstadoArquivo, dados: DadosVacinas): string {
  return gravar(estado, edicoesDasTabelas(estado, [VACINAS, ANTIPARASITARIOS], dados));
}

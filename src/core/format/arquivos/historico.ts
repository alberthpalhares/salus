/**
 * Codec do `Historico.md`: a lista de eventos de `## Eventos` (`- **AAAA-MM-DD** [tipo] texto`).
 * Item fora da gramática é opaco (listado em `opacas`, não é problema); linha em branco na lista é
 * ignorada; item que segue a gramática mas não passa no schema (`[tipo]` fora do vocabulário, data
 * inexistente) → `linha_invalida`, preservado cru.
 */
import type { Evento } from '../../schema/evento.js';
import { edicaoDaLista, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';

export type DadosHistorico = { eventos: Evento[] };

const SECAO = 'Eventos';
const CHAVE = 'eventos';

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosHistorico> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  return leitura.resultado({ eventos: leitura.lista(SECAO, CHAVE) });
}

/**
 * Eventos novos vão para o fim da lista (o codec também regrava um evento alterado; a regra "eventos
 * não se editam" é dos comandos). Seção sem lista ainda (modelo novo): acrescentar o primeiro evento
 * chega na Fase 1B.
 */
export function escrever(estado: EstadoArquivo, dados: DadosHistorico): string {
  const edicao = edicaoDaLista(estado, CHAVE, SECAO, dados.eventos);
  return gravar(estado, edicao === undefined ? [] : [edicao]);
}

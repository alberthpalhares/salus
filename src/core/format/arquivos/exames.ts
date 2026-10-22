/**
 * Codec do `Exames.md`. `## Peso`, `## Pressão arterial` e `## Glicemia` são canônicos; **qualquer
 * outro** `##` com tabela é um exame de laboratório (`## Hemograma`), cujas linhas viram marcadores
 * com `exame` = título da seção como está escrito. Um `##` não canônico cuja tabela não tem o
 * cabeçalho de marcadores → `cabecalho_invalido` e a seção é ignorada; `##` sem tabela é texto livre.
 */
import { Glicemia, Marcador, Peso, Pressao } from '../../schema/exame.js';
import { edicoesDasTabelas, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';
import type { SpecTabela } from './validacao.js';
import { normalizarCabecalho } from '../texto.js';

export type DadosExames = {
  pesos: Peso[];
  pressoes: Pressao[];
  glicemias: Glicemia[];
  /** Marcadores de todos os `## <Exame>`, na ordem do arquivo. */
  marcadores: Marcador[];
};

export const PESO: SpecTabela<Peso> = {
  chave: 'pesos',
  secao: 'Peso',
  colunas: [
    { titulo: 'Data', campo: 'data' },
    { titulo: 'Peso (kg)', campo: 'peso' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Peso,
};

export const PRESSAO: SpecTabela<Pressao> = {
  chave: 'pressoes',
  secao: 'Pressão arterial',
  colunas: [
    { titulo: 'Data', campo: 'data' },
    { titulo: 'Sistólica', campo: 'sistolica' },
    { titulo: 'Diastólica', campo: 'diastolica' },
    { titulo: 'FC', campo: 'fc' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Pressao,
};

export const GLICEMIA: SpecTabela<Glicemia> = {
  chave: 'glicemias',
  secao: 'Glicemia',
  colunas: [
    { titulo: 'Data', campo: 'data' },
    { titulo: 'Hora', campo: 'hora' },
    { titulo: 'Valor (mg/dL)', campo: 'valor' },
    { titulo: 'Condição', campo: 'condicao' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Glicemia,
};

/** Tabela de um exame de laboratório; a seção é qualquer `##` não canônico. */
export const MARCADORES: SpecTabela<Marcador> = {
  chave: 'marcadores',
  colunas: [
    { titulo: 'Data', campo: 'data' },
    { titulo: 'Marcador', campo: 'marcador' },
    { titulo: 'Valor', campo: 'valor' },
    { titulo: 'Unidade', campo: 'unidade' },
    { titulo: 'Faixa do laudo', campo: 'faixa_do_laudo' },
    { titulo: 'Flag', campo: 'flag' },
    { titulo: 'Obs', campo: 'obs' },
  ],
  schema: Marcador,
  campoDoTitulo: 'exame',
};

const CANONICAS = new Set([PESO, PRESSAO, GLICEMIA].map((spec) => normalizarCabecalho(spec.secao ?? '')));

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosExames> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  const pesos = leitura.regiao(PESO);
  const pressoes = leitura.regiao(PRESSAO);
  const glicemias = leitura.regiao(GLICEMIA);
  const marcadores: Marcador[] = [];
  for (const secao of leitura.documento.secoes) {
    if (secao.nivel !== 2 || secao.tabela === undefined || CANONICAS.has(secao.tituloNormalizado)) continue;
    // O título do exame é escrito por quem usa: as mensagens dizem só "de exame" (e a linha).
    marcadores.push(...leitura.tabela(secao, MARCADORES, 'de exame'));
  }
  return leitura.resultado({ pesos, pressoes, glicemias, marcadores });
}

/**
 * Um marcador novo vai para o fim da seção do seu `exame`; criar a seção de um exame novo e mudar o
 * `exame` de um marcador lido chegam na Fase 1B (lançam).
 */
export function escrever(estado: EstadoArquivo, dados: DadosExames): string {
  return gravar(estado, edicoesDasTabelas(estado, [PESO, PRESSAO, GLICEMIA, MARCADORES], dados));
}

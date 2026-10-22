/**
 * Codec da `Ficha.md`: o frontmatter (`FichaFrontmatter`) e as tabelas `## Contatos de emergência` e
 * `## Profissionais de referência`. O corpo livre nunca é tocado.
 */
import { Contato, FichaFrontmatter, Profissional } from '../../schema/membro.js';
import type { Edicao } from '../splice.js';
import { edicaoDoFrontmatter, edicoesDasTabelas, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';
import type { SpecTabela } from './validacao.js';

export type DadosFicha = {
  /**
   * `undefined` quando o frontmatter não dá um membro: ausente, YAML inválido ou `id`/`nome`/`tipo`
   * inválidos (os problemas dizem qual). Um campo opcional inválido não derruba o frontmatter: ele
   * vale o padrão do schema e o problema é listado.
   */
  frontmatter: FichaFrontmatter | undefined;
  contatos: Contato[];
  profissionais: Profissional[];
};

export const CONTATOS: SpecTabela<Contato> = {
  chave: 'contatos',
  secao: 'Contatos de emergência',
  colunas: [
    { titulo: 'Nome', campo: 'nome' },
    { titulo: 'Relação', campo: 'relacao' },
    { titulo: 'Telefone', campo: 'telefone' },
  ],
  schema: Contato,
};

export const PROFISSIONAIS: SpecTabela<Profissional> = {
  chave: 'profissionais',
  secao: 'Profissionais de referência',
  colunas: [
    { titulo: 'Nome', campo: 'nome' },
    { titulo: 'Especialidade', campo: 'especialidade' },
    { titulo: 'Contato', campo: 'contato' },
    { titulo: 'Acompanha', campo: 'acompanha' },
  ],
  schema: Profissional,
};

/** Sem eles não há membro: um deles inválido deixa `frontmatter` `undefined`. */
const OBRIGATORIOS = ['id', 'nome', 'tipo'] as const;

export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosFicha> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  return leitura.resultado({
    frontmatter: leitura.frontmatter(FichaFrontmatter, OBRIGATORIOS),
    contatos: leitura.regiao(CONTATOS),
    profissionais: leitura.regiao(PROFISSIONAIS),
  });
}

/**
 * Regrava só as duas tabelas gerenciadas e, se alguma chave mudou, o frontmatter. `frontmatter`
 * `undefined` não toca o bloco; um frontmatter que não foi lido não pode ser gravado (lança).
 */
export function escrever(estado: EstadoArquivo, dados: DadosFicha): string {
  const edicoes: Edicao[] = edicoesDasTabelas(estado, [CONTATOS, PROFISSIONAIS], {
    contatos: dados.contatos,
    profissionais: dados.profissionais,
  });
  if (dados.frontmatter !== undefined) {
    const edicao = edicaoDoFrontmatter(estado, dados.frontmatter, FichaFrontmatter);
    if (edicao !== undefined) edicoes.push(edicao);
  }
  return gravar(estado, edicoes);
}

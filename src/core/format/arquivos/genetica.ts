/**
 * Codec do `Genetica.md`: só a chave `condicoes_hereditarias` do frontmatter. O corpo é texto livre
 * e nunca é tocado.
 */
import { z } from 'zod';
import { ListaOpcional } from '../../schema/comuns.js';
import { edicaoDoFrontmatter, gravar } from './escrita.js';
import type { ContextoLeitura, EstadoArquivo, ResultadoLeitura } from './estado.js';
import { Leitura } from './leitura.js';

/** Frontmatter do `Genetica.md`: lista de textos (só o nome de cada condição), `[]` se nenhuma. */
export const GeneticaFrontmatter = z.object({ condicoes_hereditarias: ListaOpcional });
export type DadosGenetica = z.infer<typeof GeneticaFrontmatter>;

/** Sem frontmatter legível, a lista é vazia (os problemas dizem por quê). */
export function ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<DadosGenetica> {
  const leitura = new Leitura(fonte, contexto.arquivo);
  const frontmatter = leitura.frontmatter(GeneticaFrontmatter, []);
  return leitura.resultado({ condicoes_hereditarias: frontmatter?.condicoes_hereditarias ?? [] });
}

/**
 * Regrava o frontmatter só se a lista mudou. Se o frontmatter não foi lido, só a lista vazia (o que
 * `ler` devolveu) é aceita; gravar uma condição por cima de um YAML ilegível lança.
 */
export function escrever(estado: EstadoArquivo, dados: DadosGenetica): string {
  if (estado.frontmatter?.lido === undefined && dados.condicoes_hereditarias.length === 0) return gravar(estado, []);
  const edicao = edicaoDoFrontmatter(estado, dados, GeneticaFrontmatter);
  return gravar(estado, edicao === undefined ? [] : [edicao]);
}

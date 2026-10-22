/**
 * Leitura de um perfil: os oito arquivos de verdade lidos de uma vez (o OneDrive só baixa o arquivo
 * "sob demanda" quando alguém o lê), cada um pelo seu codec, e o `Membro` montado com o resultado.
 * Nunca lança por causa do conteúdo: o que está errado vira `Problema` e o resto segue.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  type ArquivoDeVerdade,
  type Codec,
  codecs,
  type EstadoArquivo,
  type Opaca,
} from '../format/arquivos/index.js';
import type { Membro } from '../schema/membro.js';
import type { Problema } from './problemas.js';

/** Pasta dos perfis, na raiz do cofre. */
export const PASTA_PERFIS = 'Perfis';

/** Texto do arquivo, ou o motivo de não o ter: `ausente` (não existe) ou o código do erro de leitura. */
export type TextoDoDisco = { fonte: string } | { ausente: true } | { ausente: false; codigo: string };

/** Código do erro do Node (`ENOENT`, `EISDIR`, `EACCES`…), se o erro tem um. */
export function codigoDoErro(erro: unknown): string | undefined {
  if (typeof erro === 'object' && erro !== null && 'code' in erro && typeof erro.code === 'string') return erro.code;
  return undefined;
}

/**
 * Lê o arquivo como UTF-8 (o BOM, se houver, fica: os codecs o tratam). Síncrono nesta fase. Não
 * lança: arquivo que não existe é `ausente`; qualquer outra falha (pasta no lugar, permissão,
 * arquivo do OneDrive que não baixou) volta com o código do erro, para o cofre seguir sem ele.
 */
export function lerTextoDoDisco(caminho: string): TextoDoDisco {
  try {
    return { fonte: readFileSync(caminho, 'utf8') };
  } catch (erro) {
    const codigo = codigoDoErro(erro);
    if (codigo === 'ENOENT' || codigo === 'ENOTDIR') return { ausente: true };
    return { ausente: false, codigo: codigo ?? 'erro desconhecido' };
  }
}

/** Resultado de ler um perfil. `estados` tem as chaves `"<pasta>/<arquivo>"`, só dos arquivos que existem. */
export type PerfilLido = {
  /** `undefined` quando a `Ficha.md` falta ou não tem `id`, `nome` e `tipo` válidos. */
  membro: Membro | undefined;
  /** Dos oito arquivos, na ordem de `ARQUIVOS_DE_VERDADE` (e, em cada um, por linha). */
  problemas: Problema[];
  /** Linhas opacas dos oito arquivos (as que o `doctor` lista). */
  opacas: Opaca[];
  estados: Record<string, EstadoArquivo>;
};

/**
 * Lê os oito arquivos de `dirPerfil`. `nomePasta` é o nome da pasta em `Perfis/`: vira `Membro.pasta`,
 * prefixo das chaves de `estados` e parte do caminho de cada problema (`Perfis/<pasta>/<arquivo>`).
 * Arquivo ausente: `arquivo_ausente` e a seção vazia, sem estado. Arquivo que não dá para ler: o
 * mesmo problema, com o código do erro na mensagem. O `Membro` compartilha as listas com o resultado
 * dos codecs (nada é copiado): quem alterar uma lista grava com o `estado` do arquivo correspondente.
 */
export function lerPerfil(dirPerfil: string, nomePasta: string): PerfilLido {
  const problemas: Problema[] = [];
  const opacas: Opaca[] = [];
  const estados: Record<string, EstadoArquivo> = {};

  const ler = <T>(arquivo: ArquivoDeVerdade, codec: Pick<Codec<T>, 'ler'>): T => {
    const caminho = `${PASTA_PERFIS}/${nomePasta}/${arquivo}`;
    const texto = lerTextoDoDisco(join(dirPerfil, arquivo));
    if ('fonte' in texto) {
      const lido = codec.ler(texto.fonte, { arquivo: caminho });
      problemas.push(...lido.problemas);
      opacas.push(...lido.opacas);
      estados[`${nomePasta}/${arquivo}`] = lido.estado;
      return lido.dados;
    }
    const mensagem = texto.ausente
      ? `falta o arquivo '${arquivo}'${arquivo === 'Ficha.md' ? '; sem ele o perfil não entra no cofre' : ''}`
      : `não foi possível ler o arquivo '${arquivo}' (${texto.codigo})`;
    problemas.push({ arquivo: caminho, codigo: 'arquivo_ausente', mensagem });
    // O modelo vazio do próprio codec (listas vazias, sem frontmatter); os problemas da leitura de "" ficam de fora.
    return codec.ler('', { arquivo: caminho }).dados;
  };

  const ficha = ler('Ficha.md', codecs.ficha);
  const medicamentos = ler('Medicamentos.md', codecs.medicamentos);
  const vacinas = ler('Vacinas.md', codecs.vacinas);
  const exames = ler('Exames.md', codecs.exames);
  const historico = ler('Historico.md', codecs.historico);
  const pendencias = ler('Pendencias.md', codecs.pendencias);
  const doses = ler('Doses.md', codecs.doses);
  const genetica = ler('Genetica.md', codecs.genetica);

  const { frontmatter } = ficha;
  const membro: Membro | undefined =
    frontmatter === undefined
      ? undefined
      : {
          id: frontmatter.id,
          pasta: nomePasta,
          ficha: { frontmatter, contatos: ficha.contatos, profissionais: ficha.profissionais },
          medicamentos,
          vacinas: vacinas.vacinas,
          antiparasitarios: vacinas.antiparasitarios,
          exames,
          historico: historico.eventos,
          pendencias,
          doses: doses.doses,
          genetica,
        };
  return { membro, problemas, opacas, estados };
}

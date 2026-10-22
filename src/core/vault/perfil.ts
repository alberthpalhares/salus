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

/**
 * Por que um arquivo ou pasta não foi lido: `ausente` (não existe: `arquivo_ausente`) ou ilegível, com
 * o código do erro do Node (`arquivo_ilegivel`). O código basta para o `doctor`; a mensagem do erro
 * do Node cita o caminho e fica de fora.
 */
export type FalhaDeLeitura = { ausente: true } | { ausente: false; codigo: string };

/** Texto do arquivo, ou a falha de leitura. */
export type TextoDoDisco = { fonte: string } | FalhaDeLeitura;

/** Código do erro do Node (`ENOENT`, `EISDIR`, `EACCES`…), se o erro tem um. */
function codigoDoErro(erro: unknown): string | undefined {
  if (typeof erro === 'object' && erro !== null && 'code' in erro && typeof erro.code === 'string') return erro.code;
  return undefined;
}

/**
 * Só `ENOENT` (não existe) e `ENOTDIR` (um trecho do caminho não é pasta) querem dizer "ausente";
 * qualquer outro erro (`EISDIR`, `EACCES`, `EBUSY`, arquivo do OneDrive que não baixou…) é ilegível.
 */
export function classificarFalha(erro: unknown): FalhaDeLeitura {
  const codigo = codigoDoErro(erro);
  if (codigo === 'ENOENT' || codigo === 'ENOTDIR') return { ausente: true };
  return { ausente: false, codigo: codigo ?? 'erro desconhecido' };
}

/**
 * Lê o arquivo como UTF-8 (o BOM, se houver, fica: os codecs o tratam). Síncrono nesta fase. Não
 * lança: a falha volta classificada (`classificarFalha`), para o cofre seguir sem o arquivo.
 */
export function lerTextoDoDisco(caminho: string): TextoDoDisco {
  try {
    return { fonte: readFileSync(caminho, 'utf8') };
  } catch (erro) {
    return classificarFalha(erro);
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
 * Arquivo ausente (`ENOENT`/`ENOTDIR`): `arquivo_ausente`. Arquivo que não dá para ler (qualquer outro
 * erro, como `EISDIR` ou `EACCES`): `arquivo_ilegivel`, com o código do erro na mensagem. Nos dois casos
 * a seção vem vazia e o arquivo não tem estado. O `Membro` compartilha as listas com o resultado
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
    const semFicha = arquivo === 'Ficha.md' ? '; sem ele o perfil não entra no cofre' : '';
    problemas.push(
      texto.ausente
        ? { arquivo: caminho, codigo: 'arquivo_ausente', mensagem: `falta o arquivo '${arquivo}'${semFicha}` }
        : {
            arquivo: caminho,
            codigo: 'arquivo_ilegivel',
            mensagem: `não foi possível ler o arquivo '${arquivo}' (${texto.codigo})${semFicha}`,
          },
    );
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

/**
 * O cofre v2 aberto em memória: o manifesto, os membros (um por perfil com `Ficha.md` válida), os
 * problemas de cada arquivo e o estado de leitura de cada arquivo de verdade (o que a escrita por
 * *splice* precisa para gravar de volta). `abrir` lê tudo de uma vez e nunca lança por conteúdo
 * inválido: o que está errado vira `Problema`, e os outros arquivos e perfis seguem.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  type ArquivoDeVerdade,
  type EstadoArquivo,
  type EstadoManifesto,
  linhaDaChaveNoFrontmatter,
  manifesto as codecManifesto,
  type Opaca,
} from '../format/arquivos/index.js';
import { compararTexto } from '../format/texto.js';
import type { Membro } from '../schema/membro.js';
import type { SalusYaml } from '../schema/manifesto.js';
import {
  caminhoNoCofre,
  classificarFalha,
  ehPastaDePerfil,
  lerPerfil,
  lerTextoDoDisco,
  PASTA_PERFIS,
  type PerfilLido,
} from './perfil.js';
import type { Problema } from './problemas.js';

const ARQUIVO_MANIFESTO = 'salus.yaml';

function ehPasta(caminho: string): boolean {
  try {
    return statSync(caminho).isDirectory();
  } catch {
    return false;
  }
}

/**
 * `id_duplicado` na `Ficha.md` de `pasta`, na linha do `id`. `pastasDoId` são as pastas que têm esse
 * `id`, em ordem de nome (a primeira entra no cofre). Cita só nomes de pasta, nunca o `id`.
 */
function problemaDeIdDuplicado(
  pasta: string,
  ficha: EstadoArquivo | undefined,
  pastasDoId: readonly string[],
): Problema {
  const primeira = pastasDoId[0] ?? pasta;
  const outras = pastasDoId.slice(1).map((p) => `'${p}'`);
  const mensagem =
    primeira === pasta
      ? `o 'id' do frontmatter também é usado ${outras.length === 1 ? 'pela pasta' : 'pelas pastas'} ` +
        `${outras.join(', ')}; só esta pasta, a primeira em ordem de nome, entra no cofre`
      : `o 'id' do frontmatter já é usado pela pasta '${primeira}', a primeira em ordem de nome, que entra no ` +
        `cofre; esta fica de fora até o 'id' ser trocado`;
  const arquivo = caminhoNoCofre(pasta, 'Ficha.md');
  const linha = ficha === undefined ? undefined : linhaDaChaveNoFrontmatter(ficha, 'id');
  return linha === undefined
    ? { arquivo, codigo: 'id_duplicado', mensagem }
    : { arquivo, linha, codigo: 'id_duplicado', mensagem };
}

export class Vault {
  /** Caminho absoluto da pasta do cofre. */
  readonly dir: string;
  /** `undefined` quando o `salus.yaml` falta, não é legível ou não é da versão 2 (há `manifesto_invalido`). */
  readonly manifesto: SalusYaml | undefined;
  /** Estado do `salus.yaml` lido (para gravar uma chave dele de volta); `undefined` se o arquivo não existe. */
  readonly estadoManifesto: EstadoManifesto | undefined;
  /** Um por perfil com `Ficha.md` válida, na ordem do nome da pasta; id repetido: só o primeiro. */
  readonly membros: ReadonlyArray<Membro>;
  /** Do manifesto e de cada perfil (pastas em ordem de nome, arquivos na ordem de `ARQUIVOS_DE_VERDADE`). */
  readonly problemas: ReadonlyArray<Problema>;
  /** Linhas opacas de todos os arquivos de verdade lidos (as que o `doctor` lista). */
  readonly opacas: ReadonlyArray<Opaca>;
  /**
   * Caminho no cofre (`Perfis/<pasta>/<arquivo>`, o mesmo `estado.arquivo`) → estado de leitura, de
   * todo arquivo de verdade lido (inclusive de perfil sem membro). Para achar pelo membro: `estadoDe`.
   */
  readonly estados: ReadonlyMap<string, EstadoArquivo>;
  private readonly porId: ReadonlyMap<string, Membro>;

  private constructor(
    dir: string,
    manifesto: { dados: SalusYaml | undefined; estado: EstadoManifesto | undefined },
    membros: Membro[],
    problemas: Problema[],
    opacas: Opaca[],
    estados: Map<string, EstadoArquivo>,
  ) {
    this.dir = dir;
    this.manifesto = manifesto.dados;
    this.estadoManifesto = manifesto.estado;
    this.membros = membros;
    this.problemas = problemas;
    this.opacas = opacas;
    this.estados = estados;
    this.porId = new Map(membros.map((m) => [m.id, m]));
  }

  /**
   * Abre o cofre em `dir`: lê o `salus.yaml` e, em cada pasta de `Perfis/`, os oito arquivos de
   * verdade. Só lança se `dir` não for uma pasta (`Cofre não encontrado: …`).
   */
  static abrir(dir: string): Vault {
    if (!ehPasta(dir)) throw new Error(`Cofre não encontrado: ${dir}`);
    const raiz = resolve(dir);
    const problemas: Problema[] = [];

    const manifesto = Vault.lerManifesto(raiz, problemas);
    const { perfis, ausentes } = Vault.lerPerfis(raiz);
    problemas.push(...ausentes);

    // As pastas de cada `id`, na ordem de nome: a primeira entra em `membros`, as outras ficam de fora.
    const pastasPorId = new Map<string, string[]>();
    for (const { pasta, lido } of perfis) {
      const id = lido.membro?.id;
      if (id !== undefined) pastasPorId.set(id, [...(pastasPorId.get(id) ?? []), pasta]);
    }

    const membros: Membro[] = [];
    const opacas: Opaca[] = [];
    const estados = new Map<string, EstadoArquivo>();
    for (const { pasta, lido } of perfis) {
      problemas.push(...lido.problemas);
      opacas.push(...lido.opacas);
      for (const [chave, estado] of Object.entries(lido.estados)) estados.set(chave, estado);
      const { membro } = lido;
      if (membro === undefined) continue;
      const pastasDoId = pastasPorId.get(membro.id) ?? [pasta];
      if (pastasDoId.length > 1) {
        problemas.push(problemaDeIdDuplicado(pasta, lido.estados[caminhoNoCofre(pasta, 'Ficha.md')], pastasDoId));
      }
      if (pastasDoId[0] === pasta) membros.push(membro);
    }
    return new Vault(raiz, manifesto, membros, problemas, opacas, estados);
  }

  /** Estado do `arquivo` de verdade da pasta de perfil `pasta` (`Membro.pasta`), se ele foi lido. */
  estadoDe(pasta: string, arquivo: ArquivoDeVerdade): EstadoArquivo | undefined {
    return this.estados.get(caminhoNoCofre(pasta, arquivo));
  }

  /** O membro com esse `id` (o do frontmatter da `Ficha.md`, não o nome da pasta), ou `undefined`. */
  membro(id: string): Membro | undefined {
    return this.porId.get(id);
  }

  /**
   * `salus.yaml`: arquivo que falta → `manifesto_invalido`; que existe mas não dá para ler →
   * `arquivo_ilegivel`; o resto é do codec. Nos dois casos, sem manifesto nem estado.
   */
  private static lerManifesto(
    raiz: string,
    problemas: Problema[],
  ): { dados: SalusYaml | undefined; estado: EstadoManifesto | undefined } {
    const texto = lerTextoDoDisco(join(raiz, ARQUIVO_MANIFESTO));
    if ('fonte' in texto) {
      const lido = codecManifesto.ler(texto.fonte, { arquivo: ARQUIVO_MANIFESTO });
      problemas.push(...lido.problemas);
      return { dados: lido.dados, estado: lido.estado };
    }
    problemas.push(
      texto.ausente
        ? {
            arquivo: ARQUIVO_MANIFESTO,
            codigo: 'manifesto_invalido',
            mensagem: `falta o ${ARQUIVO_MANIFESTO} na raiz do cofre: sem ele o cofre não é reconhecido como v2`,
          }
        : {
            arquivo: ARQUIVO_MANIFESTO,
            codigo: 'arquivo_ilegivel',
            mensagem: `não foi possível ler o ${ARQUIVO_MANIFESTO} (${texto.codigo})`,
          },
    );
    return { dados: undefined, estado: undefined };
  }

  /**
   * Lê todos os perfis de `Perfis/`, em ordem de nome de pasta. Sem a pasta `Perfis/`: nenhum perfil e
   * um `arquivo_ausente`; pasta que existe mas não dá para listar: nenhum perfil e um `arquivo_ilegivel`.
   */
  private static lerPerfis(raiz: string): {
    perfis: { pasta: string; lido: PerfilLido }[];
    ausentes: Problema[];
  } {
    const dirPerfis = join(raiz, PASTA_PERFIS);
    let pastas: string[];
    try {
      pastas = readdirSync(dirPerfis, { withFileTypes: true })
        .filter((entrada) => entrada.isDirectory() && ehPastaDePerfil(entrada.name))
        .map((entrada) => entrada.name)
        .sort(compararTexto);
    } catch (erro) {
      const falha = classificarFalha(erro);
      const problema: Problema = falha.ausente
        ? {
            arquivo: PASTA_PERFIS,
            codigo: 'arquivo_ausente',
            mensagem: `falta a pasta '${PASTA_PERFIS}' na raiz do cofre`,
          }
        : {
            arquivo: PASTA_PERFIS,
            codigo: 'arquivo_ilegivel',
            mensagem: `não foi possível listar a pasta '${PASTA_PERFIS}' (${falha.codigo})`,
          };
      return { perfis: [], ausentes: [problema] };
    }
    return { perfis: pastas.map((pasta) => ({ pasta, lido: lerPerfil(join(dirPerfis, pasta), pasta) })), ausentes: [] };
  }
}

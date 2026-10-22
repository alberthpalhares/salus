/**
 * `salus-ai inspecionar`: a estrutura de um cofre sem nenhum valor. Mostra pastas, arquivos de
 * texto (BOM, fim de linha, chaves de YAML e de frontmatter em notação de caminho, seções com as
 * colunas da tabela, a contagem de linhas e de itens de lista) e conta os binários. Nunca inclui
 * valor de YAML, célula ou texto de item; nomes de membros, de terceiros e da família, datas,
 * telefones, e-mails e identificadores numéricos que apareçam em títulos, colunas, chaves ou nomes
 * de pasta e arquivo saem mascarados (`Perfis/Ana` → `Perfis/membro-1`). Somente leitura.
 */
import { statSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import { parseDocumento } from '../format/documento.js';
import { lerFrontmatter } from '../format/frontmatter.js';
import { parseTabela } from '../format/tabela.js';
import { dividirLinhas } from '../format/texto.js';
import { SENTINELA_NAO_INICIALIZADO } from '../framework/detect.js';
import { compararTexto } from '../queries/normalizar.js';
import {
  coletarNomes,
  coletarTerceiros,
  construirTermos,
  ehArquivoDeTexto,
  lerTexto,
  percorrer,
  substituirNomes,
  substituirPadroes,
  type TrocaDePadroes,
} from './comum.js';

export type SecaoInspecionada = {
  nivel: number;
  /** Título mascarado (nomes, datas, telefones, e-mails e números longos trocados por marcadores). */
  titulo: string;
  /** Colunas (mascaradas) da primeira tabela da seção, antes do próximo cabeçalho de qualquer nível. */
  tabela_colunas?: string[];
  /** Linhas da tabela depois do delimitador (inclusive as vazias e as que o Salus não entende). */
  linhas?: number;
  /** Itens do nível superior da primeira lista da seção. */
  itens_lista?: number;
};

export type ArquivoInspecionado = {
  /** Caminho relativo (com `/`), mascarado. */
  caminho: string;
  bom: boolean;
  eol: 'LF' | 'CRLF' | 'misto';
  /** Chaves do frontmatter em notação de caminho (`membros[].nome`), mascaradas. */
  frontmatter_chaves?: string[];
  /** Chaves de um `.yaml`/`.yml`/`.json`, em notação de caminho, mascaradas. */
  yaml_chaves?: string[];
  /** Seções (`.md`), na ordem do texto. */
  secoes?: SecaoInspecionada[];
};

export type Inspecao = {
  versao_detectada: 'v1' | 'v2' | 'desconhecida';
  /** Caminho absoluto da pasta inspecionada. */
  raiz: string;
  /** Pastas relativas (com `/`), mascaradas, em ordem. */
  pastas: string[];
  /** Arquivos de texto (`.md`, `.yaml`, `.yml`, `.txt`, `.json`), em ordem de caminho mascarado. */
  arquivos: ArquivoInspecionado[];
  /** Quantos arquivos não são de texto. */
  binarios: number;
};

/** Marcadores no lugar dos valores (nenhum deles carrega o valor). */
const MARCADORES: TrocaDePadroes = {
  email: () => '<email>',
  dataIso: () => 'AAAA-MM-DD',
  dataBr: () => 'AAAA-MM-DD',
  telefone: () => '<telefone>',
  digitos: () => '<número>',
};

function eolDe(texto: string): 'LF' | 'CRLF' | 'misto' {
  const crlf = texto.split('\r\n').length - 1;
  const lf = texto.split('\n').length - 1 - crlf;
  if (crlf > 0 && lf > 0) return 'misto';
  return crlf > 0 ? 'CRLF' : 'LF';
}

/** Chaves de um objeto YAML (nós do `yaml`) em notação de caminho, na ordem em que aparecem. */
function chavesDoYaml(raiz: unknown, mascarar: (s: string) => string): string[] {
  const vistas = new Set<string>();
  const andar = (no: unknown, prefixo: string): void => {
    if (isMap(no)) {
      for (const par of no.items) {
        const chave = mascarar(isScalar(par.key) ? String(par.key.value) : '?');
        const caminho = prefixo === '' ? chave : `${prefixo}.${chave}`;
        vistas.add(caminho);
        andar(par.value, caminho);
      }
    } else if (isSeq(no)) {
      for (const item of no.items) andar(item, `${prefixo}[]`);
    }
  };
  andar(raiz, '');
  return [...vistas];
}

/** Chaves de um valor JSON em notação de caminho. */
function chavesDoJson(raiz: unknown, mascarar: (s: string) => string): string[] {
  const vistas = new Set<string>();
  const andar = (valor: unknown, prefixo: string): void => {
    if (Array.isArray(valor)) {
      for (const item of valor) andar(item, `${prefixo}[]`);
    } else if (typeof valor === 'object' && valor !== null) {
      for (const [chave, filho] of Object.entries(valor)) {
        const caminho = prefixo === '' ? mascarar(chave) : `${prefixo}.${mascarar(chave)}`;
        vistas.add(caminho);
        andar(filho, caminho);
      }
    }
  };
  andar(raiz, '');
  return [...vistas];
}

/** Itens do nível superior de uma lista: linhas com marcador na mesma indentação da primeira. */
function contarItens(trecho: string): number {
  const { linhas } = dividirLinhas(trecho);
  const indentacao = /^ */.exec(linhas[0] ?? '')?.[0].length ?? 0;
  const marcador = new RegExp(`^ {${indentacao}}(?:[-*+]|\\d{1,9}[.)])(?:\\s|$)`);
  return linhas.filter((l) => marcador.test(l)).length;
}

function secoesDe(texto: string, mascarar: (s: string) => string): SecaoInspecionada[] {
  const { secoes } = parseDocumento(texto);
  return secoes.map((secao, i) => {
    const limite = secoes[i + 1]?.inicio ?? texto.length;
    const saida: SecaoInspecionada = { nivel: secao.nivel, titulo: mascarar(secao.titulo) };
    if (secao.tabela !== undefined && secao.tabela.inicio < limite) {
      const trecho = texto.slice(secao.tabela.inicio, secao.tabela.fim);
      saida.tabela_colunas = parseTabela(trecho, []).tabela.colunasExtras.map(mascarar);
      saida.linhas = Math.max(0, dividirLinhas(trecho).linhas.length - 2);
    }
    if (secao.lista !== undefined && secao.lista.inicio < limite) {
      saida.itens_lista = contarItens(texto.slice(secao.lista.inicio, secao.lista.fim));
    }
    return saida;
  });
}

function inspecionarArquivo(
  caminho: string,
  extensao: string,
  texto: string,
  bom: boolean,
  mascarar: (s: string) => string,
): ArquivoInspecionado {
  const arquivo: ArquivoInspecionado = { caminho, bom, eol: eolDe(texto) };
  if (extensao === '.md') {
    try {
      const documento = parseDocumento(texto);
      try {
        const frontmatter = lerFrontmatter(documento, texto);
        if (frontmatter !== undefined) arquivo.frontmatter_chaves = chavesDoYaml(frontmatter.documento.contents, mascarar);
      } catch {
        // frontmatter com YAML inválido: sem chaves
      }
      arquivo.secoes = secoesDe(texto, mascarar);
    } catch {
      // CR solto: o Markdown não é lido (o doctor aponta); fica só BOM e fim de linha
    }
  } else if (extensao === '.yaml' || extensao === '.yml') {
    const doc = parseDocument(texto, { prettyErrors: false, schema: 'core' });
    if (doc.errors.length === 0) arquivo.yaml_chaves = chavesDoYaml(doc.contents, mascarar);
  } else if (extensao === '.json') {
    try {
      arquivo.yaml_chaves = chavesDoJson(JSON.parse(texto) as unknown, mascarar);
    } catch {
      // JSON inválido: sem chaves
    }
  }
  return arquivo;
}

function versaoDe(textos: ReadonlyMap<string, string>): Inspecao['versao_detectada'] {
  const manifesto = textos.get('salus.yaml');
  if (manifesto !== undefined) {
    const doc = parseDocument(manifesto, { prettyErrors: false, schema: 'core' });
    const dados = doc.errors.length === 0 ? (doc.toJS() as unknown) : undefined;
    if (typeof dados === 'object' && dados !== null && (dados as Record<string, unknown>).schema_versao === 2) return 'v2';
  }
  if (textos.has('Familia/_index.yaml')) return 'v1';
  const agents = textos.get('AGENTS.md');
  if (agents !== undefined && !agents.includes(SENTINELA_NAO_INICIALIZADO)) return 'v1';
  return 'desconhecida';
}

/** Lança `Error('Pasta não encontrada: <caminho>')` se `dir` não é uma pasta. */
export function exigirPasta(dir: string): string {
  const raiz = resolve(dir);
  let ehPasta = false;
  try {
    ehPasta = statSync(raiz).isDirectory();
  } catch {
    ehPasta = false;
  }
  if (!ehPasta) throw new Error(`Pasta não encontrada: ${raiz}`);
  return raiz;
}

/**
 * Inspeciona a pasta `dir` (somente leitura; links simbólicos e junções não são seguidos). Lança
 * `Error('Pasta não encontrada: …')` se ela não existe.
 */
export function inspecionar(dir: string): Inspecao {
  const raiz = exigirPasta(dir);
  const { entradas } = percorrer(raiz);

  const lidos = new Map<string, { texto: string; bom: boolean }>();
  let binarios = 0;
  for (const entrada of entradas) {
    if (entrada.tipo !== 'arquivo') continue;
    if (ehArquivoDeTexto(entrada.rel)) lidos.set(entrada.rel, lerTexto(resolve(raiz, entrada.rel)));
    else binarios++;
  }
  const textos = new Map([...lidos].map(([rel, { texto }]) => [rel, texto] as const));

  const pastasDePerfil = entradas
    .filter((e) => e.tipo === 'pasta' && /^Perfis\/[^/]+$/.test(e.rel))
    .map((e) => e.rel.slice('Perfis/'.length));
  const nomes = coletarNomes(pastasDePerfil, textos);
  const termos = construirTermos(nomes, coletarTerceiros(textos, nomes.membros), {
    membro: (i) => `membro-${i + 1}`,
    idDeMembro: (i) => `membro-${i + 1}`,
    terceiro: (j) => `profissional-${j + 1}`,
  });
  const mascarar = (s: string): string => substituirNomes(substituirPadroes(s, MARCADORES), termos);

  const indiceDaPasta = new Map<string, number>();
  nomes.membros.forEach((membro, i) => {
    if (membro.pasta !== undefined) indiceDaPasta.set(membro.pasta, i);
  });
  const mascararCaminho = (rel: string): string =>
    rel
      .split('/')
      .map((parte, k, partes) => {
        const indice = k === 1 && partes[0] === 'Perfis' ? indiceDaPasta.get(parte) : undefined;
        return indice === undefined ? mascarar(parte) : `membro-${indice + 1}`;
      })
      .join('/');

  const pastas = [
    ...new Set(entradas.filter((e) => e.tipo === 'pasta').map((e) => mascararCaminho(e.rel))),
  ].sort(compararTexto);
  const arquivos = [...lidos]
    .map(([rel, { texto, bom }]) => inspecionarArquivo(mascararCaminho(rel), extname(rel).toLowerCase(), texto, bom, mascarar))
    .sort((a, b) => compararTexto(a.caminho, b.caminho));

  return { versao_detectada: versaoDe(textos), raiz, pastas, arquivos, binarios };
}

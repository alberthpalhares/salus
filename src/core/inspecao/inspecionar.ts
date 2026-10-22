/**
 * `salus-ai inspecionar`: a estrutura de um cofre sem nenhum valor. Mostra pastas, arquivos de
 * texto (BOM, fim de linha, chaves de YAML e de frontmatter em notação de caminho, seções com as
 * colunas da tabela, a contagem de linhas e de itens de lista) e conta os binários. Nunca inclui
 * valor de YAML, célula ou texto de item. Títulos de seção só ficam íntegros se forem dos modelos
 * (v2 e v1); qualquer outro vira `<título com N palavras>`. Nomes de arquivo e de pasta só ficam se
 * forem do formato ou do framework; os outros viram `<nome>` (com a extensão e a forma da data). As
 * pastas de perfil viram `Perfis/membro-N`; nomes, datas, telefones, e-mails e números longos em
 * colunas e chaves saem mascarados. Somente leitura.
 */
import { type Dirent, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import { ARQUIVOS_DE_VERDADE } from '../format/arquivos/index.js';
import { parseDocumento } from '../format/documento.js';
import { lerFrontmatter } from '../format/frontmatter.js';
import { parseTabela } from '../format/tabela.js';
import { dividirLinhas, normalizarCabecalho } from '../format/texto.js';
import { SENTINELA_NAO_INICIALIZADO } from '../framework/detect.js';
import { frameworkRoot } from '../framework/manifest.js';
import { compararTexto } from '../queries/normalizar.js';
import { PASTA_PERFIS } from '../vault/perfil.js';
import {
  ARQUIVO_RELATORIO,
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
  /**
   * Título de modelo como está escrito; nível 1 de modelo com nome (`Ficha de Saúde — membro-1`);
   * qualquer outro, `<título com N palavras>`.
   */
  titulo: string;
  /** Colunas (mascaradas) da primeira tabela da seção, antes do próximo cabeçalho de qualquer nível. */
  tabela_colunas?: string[];
  /** Linhas da tabela depois do delimitador (inclusive as vazias e as que o Salus não entende). */
  linhas?: number;
  /** Itens do nível superior da primeira lista da seção. */
  itens_lista?: number;
};

export type ArquivoInspecionado = {
  /** Caminho relativo (com `/`), com os nomes fora do formato trocados por `<nome>`. */
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
  /** Só o nome da pasta inspecionada (sem o caminho), com nomes e datas mascarados. */
  raiz: string;
  /** Pastas relativas (com `/`), mascaradas, em ordem. */
  pastas: string[];
  /** Arquivos de texto (`.md`, `.yaml`, `.yml`, `.txt`, `.json`), em ordem de caminho mascarado. */
  arquivos: ArquivoInspecionado[];
  /** Quantos arquivos não são de texto. */
  binarios: number;
  /** Sempre `AVISO_INSPECAO`. */
  aviso: string;
};

export const AVISO_INSPECAO = 'Títulos e nomes fora do formato foram trocados por marcadores; revise antes de compartilhar.';

/** O que o formato e o framework nomeiam: títulos (normalizados), prefixos do nível 1, arquivos e pastas. */
type FormatoConhecido = {
  titulos: ReadonlySet<string>;
  /** `Ficha de Saúde` de `# Ficha de Saúde — [Nome]` (normalizado). */
  prefixos: ReadonlySet<string>;
  arquivos: ReadonlySet<string>;
  pastas: ReadonlySet<string>;
};

/** Separador do título de nível 1 dos modelos: `# Ficha de Saúde — [Nome]`. */
const TRAVESSAO = ' — ';

/** Arquivos e pastas de `dir`, recursivamente (o `framework/` do pacote: nada de link nem de dado). */
function entradasDe(dir: string): { caminho: string; entrada: Dirent }[] {
  const todas: { caminho: string; entrada: Dirent }[] = [];
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name);
    todas.push({ caminho, entrada });
    if (entrada.isDirectory()) todas.push(...entradasDe(caminho));
  }
  return todas;
}

/**
 * Lê do `framework/` do pacote o que fica íntegro na inspeção: os títulos dos modelos v2
 * (`framework/templates/`) e v1 (`salus-onboarding/templates/`) e os cabeçalhos canônicos do
 * `FORMATO.md`; os nomes de todos os arquivos e pastas do framework; e as pastas do cofre citadas
 * na "Estrutura do cofre" do `FORMATO.md` e no modelo do cérebro (`Analises/`, `Documentos/`,
 * `Exames/`…). Se o framework não puder ser lido, fica só o mínimo (e tudo o mais é mascarado).
 */
function lerFormatoConhecido(): FormatoConhecido {
  const titulos = new Set<string>();
  const prefixos = new Set<string>();
  const arquivos = new Set<string>([...ARQUIVOS_DE_VERDADE, 'salus.yaml', ARQUIVO_RELATORIO]);
  const pastas = new Set<string>([PASTA_PERFIS]);
  const anotarTitulo = (titulo: string): void => {
    const corte = titulo.indexOf(TRAVESSAO);
    if (corte > 0) prefixos.add(normalizarCabecalho(titulo.slice(0, corte)));
    if (!titulo.includes('[')) titulos.add(normalizarCabecalho(titulo));
  };
  try {
    const raiz = frameworkRoot();
    for (const { entrada } of entradasDe(raiz)) (entrada.isDirectory() ? pastas : arquivos).add(entrada.name);
    const modelos = [join(raiz, 'templates'), join(raiz, '.agents', 'skills', 'salus-onboarding', 'templates')];
    for (const pasta of modelos) {
      for (const { caminho, entrada } of entradasDe(pasta)) {
        if (!entrada.isFile() || extname(entrada.name) !== '.md') continue;
        for (const secao of parseDocumento(readFileSync(caminho, 'utf8')).secoes) anotarTitulo(secao.titulo);
      }
    }
    const formato = readFileSync(join(raiz, 'Frameworks', 'FORMATO.md'), 'utf8');
    const canonicos = formato.slice(formato.indexOf('## Cabeçalhos canônicos'), formato.indexOf('## Arquivos'));
    for (const m of canonicos.matchAll(/`## ([^`]+)`/g)) anotarTitulo(m[1] ?? '');
    const cerebro = readFileSync(join(raiz, '.agents', 'skills', 'salus-onboarding', 'resources', 'SALUS_TEMPLATE.md'), 'utf8');
    // `Pasta/` entre crases, ou depois de `── ` e de `· ` na árvore da "Estrutura do cofre".
    for (const m of `${formato}\n${cerebro}`.matchAll(/(?:`|── |· )([^`\s/<>[\]][^`/<>[\]\n]*?)\/(?=[`\s]|$)/gm)) {
      pastas.add(m[1] ?? '');
    }
  } catch {
    // Sem o framework: só os nomes mínimos ficam; títulos e o resto viram marcadores.
  }
  return { titulos, prefixos, arquivos, pastas };
}

let formatoConhecido: FormatoConhecido | undefined;

/** `<título com N palavras>`: N conta só o que tem letra ou número. */
function marcadorDeTitulo(titulo: string): string {
  const n = titulo.split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length;
  return `<título com ${n} ${n === 1 ? 'palavra' : 'palavras'}>`;
}

/**
 * Título de modelo fica como está. Nível 1 com o prefixo de um modelo (`Ficha de Saúde — Ana`)
 * fica com o prefixo e o alias do membro (`— membro-1`), ou `— <nome>` se o resto não for nome de
 * membro. Qualquer outro vira `<título com N palavras>`, contadas depois de mascarar nomes e datas.
 */
function mascararTitulo(
  titulo: string,
  nivel: number,
  mascarar: (s: string) => string,
  conhecido: FormatoConhecido,
): string {
  if (conhecido.titulos.has(normalizarCabecalho(titulo))) return titulo;
  const corte = titulo.indexOf(TRAVESSAO);
  if (nivel === 1 && corte > 0 && conhecido.prefixos.has(normalizarCabecalho(titulo.slice(0, corte)))) {
    const aliases = [...new Set(mascarar(titulo.slice(corte + TRAVESSAO.length)).match(/membro-\d+/g) ?? [])];
    return `${titulo.slice(0, corte)}${TRAVESSAO}${aliases.length > 0 ? aliases.join(', ') : '<nome>'}`;
  }
  return marcadorDeTitulo(mascarar(titulo));
}

/**
 * Nome de arquivo ou pasta fora do formato: a data do começo vira `AAAA-MM-DD` (com o separador que
 * vier depois), a extensão curta de arquivo fica, e o resto vira `<nome>`.
 */
function marcadorDeNome(nome: string, ehArquivo: boolean): string {
  const extensao = ehArquivo && /^\.[A-Za-z0-9]{1,5}$/.test(extname(nome)) ? extname(nome) : '';
  const base = nome.slice(0, nome.length - extensao.length);
  const data = /^\d{4}([-_])\d{2}\1\d{2}/.exec(base);
  if (data === null) return `<nome>${extensao}`;
  const resto = base.slice(data[0].length);
  if (resto === '') return `AAAA-MM-DD${extensao}`;
  const separador = /^[-_ .]/.test(resto) ? resto.charAt(0) : '';
  return `AAAA-MM-DD${separador}<nome>${extensao}`;
}

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

function secoesDe(texto: string, mascarar: (s: string) => string, conhecido: FormatoConhecido): SecaoInspecionada[] {
  const { secoes } = parseDocumento(texto);
  return secoes.map((secao, i) => {
    const limite = secoes[i + 1]?.inicio ?? texto.length;
    const titulo = mascararTitulo(secao.titulo, secao.nivel, mascarar, conhecido);
    const saida: SecaoInspecionada = { nivel: secao.nivel, titulo };
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
  conhecido: FormatoConhecido,
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
      arquivo.secoes = secoesDe(texto, mascarar, conhecido);
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
  formatoConhecido ??= lerFormatoConhecido();
  const conhecido = formatoConhecido;

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
  /** `ehArquivo`: a última parte de `rel` é um arquivo (as outras são sempre pastas). */
  const mascararCaminho = (rel: string, ehArquivo: boolean): string =>
    rel
      .split('/')
      .map((parte, k, partes) => {
        const indice = k === 1 && partes[0] === PASTA_PERFIS ? indiceDaPasta.get(parte) : undefined;
        if (indice !== undefined) return `membro-${indice + 1}`;
        const deArquivo = ehArquivo && k === partes.length - 1;
        const permitidos = deArquivo ? conhecido.arquivos : conhecido.pastas;
        return permitidos.has(parte) ? parte : marcadorDeNome(parte, deArquivo);
      })
      .join('/');

  const pastas = [
    ...new Set(entradas.filter((e) => e.tipo === 'pasta').map((e) => mascararCaminho(e.rel, false))),
  ].sort(compararTexto);
  const arquivos = [...lidos]
    .map(([rel, { texto, bom }]) =>
      inspecionarArquivo(mascararCaminho(rel, true), extname(rel).toLowerCase(), texto, bom, mascarar, conhecido),
    )
    .sort((a, b) => compararTexto(a.caminho, b.caminho));

  return {
    versao_detectada: versaoDe(textos),
    raiz: mascarar(basename(raiz)),
    pastas,
    arquivos,
    binarios,
    aviso: AVISO_INSPECAO,
  };
}

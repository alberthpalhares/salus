/**
 * Peças comuns de `inspecionar` e `anonimizar`: o passeio pela pasta (sem seguir links), a coleta
 * dos nomes de membros, da família e de terceiros (profissionais, parentes sem perfil), os termos
 * que trocam esses nomes em qualquer texto (sem distinguir acento nem caixa, palavra inteira, o
 * mais longo primeiro) e os padrões de valor (e-mail, data, telefone, identificador numérico).
 *
 * Nada aqui grava em disco nem imprime: quem chama decide o que fazer com o que foi coletado.
 */
import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { RootContent } from 'mdast';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { isMap, isScalar, isSeq, parseDocument, type Document } from 'yaml';
import { parseDocumento } from '../format/documento.js';
import { lerFrontmatter } from '../format/frontmatter.js';
import { dividirCelulas } from '../format/tabela.js';
import { dividirLinhas, removerBom } from '../format/texto.js';
import { compararTexto, normalizarParaBusca } from '../queries/normalizar.js';
import { FORMATO_DATA } from '../schema/comuns.js';
import { ehPastaDePerfil } from '../vault/perfil.js';

// ---------------------------------------------------------------------------------------------
// Passeio pela pasta

/** Extensões tratadas como texto; o resto é binário (anonimizar grava vazio, inspecionar só conta). */
const EXTENSOES_TEXTO: ReadonlySet<string> = new Set(['.md', '.yaml', '.yml', '.txt', '.json']);

export function ehArquivoDeTexto(nome: string): boolean {
  return EXTENSOES_TEXTO.has(extname(nome).toLowerCase());
}

export type Entrada = {
  /** Caminho relativo à raiz, com `/`. */
  rel: string;
  tipo: 'pasta' | 'arquivo';
};

/**
 * Lista pastas e arquivos de `raiz` com `lstat`, em ordem de nome (por unidade de código, igual em
 * qualquer SO). Links simbólicos e junções **nunca são seguidos**: ficam de fora e contam em
 * `ignorados`, assim como o que não é arquivo nem pasta (soquete, pipe).
 */
export function percorrer(raiz: string): { entradas: Entrada[]; ignorados: number } {
  const entradas: Entrada[] = [];
  let ignorados = 0;
  const visitar = (dir: string, prefixo: string): void => {
    const nomes = readdirSync(dir).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const nome of nomes) {
      const completo = join(dir, nome);
      const rel = prefixo === '' ? nome : `${prefixo}/${nome}`;
      const info = lstatSync(completo);
      if (info.isSymbolicLink()) {
        ignorados++;
      } else if (info.isDirectory()) {
        entradas.push({ rel, tipo: 'pasta' });
        visitar(completo, rel);
      } else if (info.isFile()) {
        entradas.push({ rel, tipo: 'arquivo' });
      } else {
        ignorados++;
      }
    }
  };
  visitar(raiz, '');
  return { entradas, ignorados };
}

/** Lê um arquivo de texto em UTF-8; o BOM sai do texto e vira `bom: true`. */
export function lerTexto(caminho: string): { texto: string; bom: boolean } {
  const { texto, tinhaBom } = removerBom(readFileSync(caminho, 'utf8'));
  return { texto, bom: tinhaBom };
}

// ---------------------------------------------------------------------------------------------
// Markdown: blocos do nível superior e tabelas

const processador = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm);

export type Bloco = { tipo: RootContent['type']; inicio: number; fim: number };

/**
 * Blocos do nível superior do Markdown, com as faixas na string de origem (sem BOM). Lança se o
 * texto tiver um CR solto (o remark o leria como quebra e as faixas não bateriam com as linhas).
 */
export function blocosMarkdown(fonte: string): Bloco[] {
  if (/\r(?!\n)/.test(fonte)) throw new Error('CR solto no texto');
  return processador.parse(fonte).children.map((no) => {
    const inicio = no.position?.start.offset;
    const fim = no.position?.end.offset;
    if (inicio === undefined || fim === undefined) throw new Error(`o remark não informou a posição do nó '${no.type}'`);
    return { tipo: no.type, inicio, fim };
  });
}

/** Como uma coluna de tabela é tratada pelo anonimizador (pelo nome do cabeçalho). */
export type TipoColuna = 'livre' | 'profissional' | 'pessoa' | 'local' | 'generico';

const COLUNAS_PROFISSIONAIS: ReadonlySet<string> = new Set([
  'prescrito por',
  'prescrita por',
  'solicitado por',
  'solicitada por',
  'veterinario',
  'veterinaria',
  'profissional',
  'medico',
  'medica',
  'medico responsavel',
  'medica responsavel',
  'especialista',
]);
const COLUNAS_PESSOAS: ReadonlySet<string> = new Set([
  'nome',
  'parente',
  'pessoa',
  'responsavel',
  'tutor',
  'tutora',
  'contato de emergencia',
]);
const COLUNAS_LOCAIS: ReadonlySet<string> = new Set(['laboratorio', 'local', 'clinica', 'hospital', 'instituicao']);
const PREFIXOS_LIVRES = ['obs', 'motivo', 'nota', 'comentario', 'descricao', 'detalhe', 'anotac'];

export function tipoDeColuna(cabecalho: string): TipoColuna {
  const h = normalizarParaBusca(cabecalho.replace(/\([^)]*\)/g, ' '));
  if (PREFIXOS_LIVRES.some((p) => h.startsWith(p))) return 'livre';
  if (COLUNAS_PROFISSIONAIS.has(h)) return 'profissional';
  if (COLUNAS_PESSOAS.has(h)) return 'pessoa';
  if (COLUNAS_LOCAIS.has(h)) return 'local';
  return 'generico';
}

// Chaves YAML (a última do caminho) com tratamento próprio.
export const CHAVES_PROFISSIONAIS: ReadonlySet<string> = new Set([
  'prescrito_por',
  'solicitado_por',
  'profissional',
  'veterinario',
  'medico',
  'medico_responsavel',
]);
export const CHAVES_PESSOAS: ReadonlySet<string> = new Set([
  'pais_biologicos',
  'responsaveis',
  'tutores',
  'conjuges',
  'parentes',
  'contatos',
]);
export const CHAVES_LIVRES: ReadonlySet<string> = new Set([
  'obs',
  'observacao',
  'observacoes',
  'motivo',
  'notas',
  'nota',
  'descricao',
  'comentario',
  'comentarios',
]);

// ---------------------------------------------------------------------------------------------
// Nomes: membros, família e terceiros

export type MembroColetado = {
  /** Nome da pasta em `Perfis/`, quando o membro tem uma. */
  pasta?: string;
  /** Nomes completos como aparecem (pasta, `nome:` da Ficha e do índice, linha do META). */
  nomes: string[];
  /** `id`s do membro (Ficha e índice). */
  ids: string[];
};

export type NomesColetados = {
  /** Membros com pasta (em ordem de pasta) e depois os sem pasta (em ordem do primeiro nome). */
  membros: MembroColetado[];
  /** Valor de `familia:` (salus.yaml ou _index.yaml) ou do `**Família:**` do META, se houver. */
  familia: string | undefined;
};

/** Valor de modelo (`[Nome]`, `[Sobrenome/identificação]`) ou vazio: não é nome de ninguém. */
function ehValorDeModelo(s: string): boolean {
  return s.trim() === '' || s.includes('[');
}

function textoDe(valor: unknown): string | undefined {
  return typeof valor === 'string' && !ehValorDeModelo(valor) ? valor.trim() : undefined;
}

/** O YAML como objeto JS (esquema core), ou `undefined` se tiver erro. */
function yamlParaJs(texto: string): unknown {
  const doc = parseDocument(texto, { prettyErrors: false, schema: 'core' });
  if (doc.errors.length > 0) return undefined;
  return doc.toJS() as unknown;
}

function ehRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function frontmatterJs(fonte: string): unknown {
  try {
    const lido = lerFrontmatter(parseDocumento(fonte), fonte);
    return lido?.documento.toJS() as unknown;
  } catch {
    return undefined;
  }
}

/** Pasta citada num caminho `Perfis/<pasta>/…`. */
function pastaDoCaminho(s: string): string | undefined {
  return /Perfis\/([^/`]+)/.exec(s)?.[1];
}

/**
 * Coleta membros e família: pastas de `Perfis/` (`pastas`, só os nomes), o frontmatter de cada
 * `Ficha.md`, os `membros` e a `familia` do `Familia/_index.yaml` (v1), a `familia` do `salus.yaml`
 * (v2) e a tabela de membros e o `**Família:**` do `Familia/META.md` (v1). `textos` são os arquivos
 * de texto já lidos (caminho relativo → texto sem BOM).
 */
export function coletarNomes(pastas: readonly string[], textos: ReadonlyMap<string, string>): NomesColetados {
  const comPasta: MembroColetado[] = [...pastas]
    .filter(ehPastaDePerfil)
    .sort(compararTexto)
    .map((pasta) => ({ pasta, nomes: [pasta], ids: [] }));
  const semPasta: MembroColetado[] = [];
  const todos = (): MembroColetado[] => [...comPasta, ...semPasta];

  const acrescentar = (dados: { pasta?: string; nome?: string; id?: string }): void => {
    const chaveNome = dados.nome === undefined ? undefined : normalizarParaBusca(dados.nome);
    const chaveId = dados.id === undefined ? undefined : normalizarParaBusca(dados.id);
    const chavePasta = dados.pasta === undefined ? undefined : normalizarParaBusca(dados.pasta);
    let membro = comPasta.find((m) => normalizarParaBusca(m.pasta ?? '') === chavePasta);
    membro ??= todos().find(
      (m) =>
        m.nomes.some((n) => normalizarParaBusca(n) === chaveNome) ||
        m.ids.some((i) => normalizarParaBusca(i) === chaveId),
    );
    if (membro === undefined && chaveNome !== undefined) {
      // Índice sem `perfil`: a pasta costuma ser o primeiro nome (`Ofélia` para `Ofélia Tavares`).
      const primeiro = chaveNome.split(' ')[0] ?? '';
      const candidatos = comPasta.filter((m) => normalizarParaBusca(semParenteses(m.pasta ?? '')) === primeiro);
      if (candidatos.length === 1) membro = candidatos[0];
    }
    if (membro === undefined) {
      if (dados.nome === undefined && dados.id === undefined) return;
      membro = { nomes: [], ids: [] };
      semPasta.push(membro);
    }
    if (dados.nome !== undefined && !membro.nomes.includes(dados.nome)) membro.nomes.push(dados.nome);
    if (dados.id !== undefined && !membro.ids.includes(dados.id)) membro.ids.push(dados.id);
  };

  for (const membro of [...comPasta]) {
    const ficha = textos.get(`Perfis/${membro.pasta ?? ''}/Ficha.md`);
    const dados = ficha === undefined ? undefined : frontmatterJs(ficha);
    if (!ehRegistro(dados)) continue;
    const nome = textoDe(dados.nome);
    const id = textoDe(dados.id);
    acrescentar({ pasta: membro.pasta, ...(nome === undefined ? {} : { nome }), ...(id === undefined ? {} : { id }) });
  }

  let familia: string | undefined;
  for (const arquivo of ['salus.yaml', 'Familia/_index.yaml']) {
    const texto = textos.get(arquivo);
    const dados = texto === undefined ? undefined : yamlParaJs(texto);
    if (!ehRegistro(dados)) continue;
    familia ??= textoDe(dados.familia);
    const membros = Array.isArray(dados.membros) ? (dados.membros as unknown[]) : [];
    for (const item of membros) {
      if (!ehRegistro(item)) continue;
      const nome = textoDe(item.nome);
      const id = textoDe(item.id);
      const perfil = textoDe(item.perfil);
      const pasta = perfil === undefined ? undefined : pastaDoCaminho(perfil);
      acrescentar({
        ...(pasta === undefined ? {} : { pasta }),
        ...(nome === undefined ? {} : { nome }),
        ...(id === undefined ? {} : { id }),
      });
    }
  }

  const meta = textos.get('Familia/META.md');
  if (meta !== undefined) {
    familia ??= textoDe(/^\*\*Fam[íi]lia:\*\*[ \t]*(.+)$/m.exec(meta)?.[1]);
    for (const tabela of tabelasDe(meta)) {
      const iNome = tabela.cabecalho.findIndex((c) => normalizarParaBusca(c) === 'nome');
      if (iNome < 0 || !normalizarParaBusca(tabela.secao).includes('membro')) continue;
      const iPerfil = tabela.cabecalho.findIndex((c) => normalizarParaBusca(c) === 'perfil');
      for (const linha of tabela.linhas) {
        const nome = textoDe(linha[iNome]);
        if (nome === undefined) continue;
        const pasta = iPerfil < 0 ? undefined : pastaDoCaminho(linha[iPerfil] ?? '');
        acrescentar({ ...(pasta === undefined ? {} : { pasta }), nome });
      }
    }
  }

  semPasta.sort((a, b) => compararTexto(a.nomes[0] ?? a.ids[0] ?? '', b.nomes[0] ?? b.ids[0] ?? ''));
  return { membros: todos(), familia };
}

/** Tabelas do nível superior de um Markdown: o título da seção, o cabeçalho e as células das linhas. */
export function tabelasDe(fonte: string): { secao: string; cabecalho: string[]; linhas: string[][] }[] {
  let blocos: Bloco[];
  try {
    blocos = blocosMarkdown(fonte);
  } catch {
    return [];
  }
  const tabelas: { secao: string; cabecalho: string[]; linhas: string[][] }[] = [];
  let secao = '';
  for (const bloco of blocos) {
    const trecho = fonte.slice(bloco.inicio, bloco.fim);
    if (bloco.tipo === 'heading') secao = trecho.replace(/^\s*#+/, '').trim();
    if (bloco.tipo !== 'table') continue;
    const { linhas } = dividirLinhas(trecho);
    tabelas.push({
      secao,
      cabecalho: dividirCelulas(linhas[0] ?? ''),
      linhas: linhas.slice(2).map(dividirCelulas),
    });
  }
  return tabelas;
}

const TITULOS: ReadonlySet<string> = new Set(['dr', 'dra', 'doutor', 'doutora', 'prof', 'profa', 'sr', 'sra']);
/**
 * Partes que nunca viram termo: partículas de nome (`dos`) e as palavras dos próprios aliases
 * (`Membro A`, `Dr. Alias 3`, `Sobrenome`, `Família Exemplo`) — senão inspecionar a cópia
 * anonimizada mascararia de novo palavras comuns como "membro" num título ou cabeçalho.
 */
const PARTICULAS: ReadonlySet<string> = new Set([
  'das',
  'dos',
  'des',
  'del',
  'della',
  'van',
  'von',
  'der',
  'den',
  'membro',
  'alias',
  'sobrenome',
  'exemplo',
  'familia',
  'local',
  'profissional',
]);

/** Tira o que vem entre parênteses ou colchetes (`Mia (gata)` → `Mia`). */
function semParenteses(s: string): string {
  return s.replace(/\([^)]*\)|\[[^\]]*\]/g, ' ');
}

/** Partes de um nome com 3 letras ou mais, normalizadas, sem títulos (`Dra.`) nem partículas (`dos`). */
function partesDoNome(nome: string): string[] {
  return normalizarParaBusca(semParenteses(nome))
    .split(/[^\p{L}]+/u)
    .filter((p) => p.length >= 3 && !TITULOS.has(p) && !PARTICULAS.has(p));
}

/**
 * Chave de um terceiro (profissional, parente sem perfil): sem parênteses, sem o título do começo
 * (`Dra.`, `Dr`) e normalizada; `undefined` se não sobra nenhuma letra.
 */
export function chaveDeTerceiro(s: string): string | undefined {
  let chave = normalizarParaBusca(semParenteses(s));
  for (let anterior = ''; anterior !== chave; ) {
    anterior = chave;
    const titulo = /^(\p{L}+)\.?\s+/u.exec(chave);
    if (titulo !== null && TITULOS.has(titulo[1] ?? '')) chave = chave.slice(titulo[0].length);
  }
  chave = chave.trim();
  return /\p{L}/u.test(chave) ? chave : undefined;
}

/** Tira um "Família" do começo do valor de `familia:` (`Família Silva` → `Silva`). */
function nucleoDaFamilia(familia: string): string {
  return familia.replace(/^\s*fam[íi]lia\s+/iu, '').trim();
}

/** As chaves normalizadas que identificam membros: nomes completos, partes e ids. */
export function chavesDeMembros(membros: readonly MembroColetado[]): Set<string> {
  const chaves = new Set<string>();
  for (const membro of membros) {
    for (const nome of membro.nomes) {
      chaves.add(normalizarParaBusca(nome));
      chaves.add(normalizarParaBusca(semParenteses(nome)));
      for (const parte of partesDoNome(nome)) chaves.add(parte);
    }
    for (const id of membro.ids) chaves.add(normalizarParaBusca(id));
  }
  chaves.delete('');
  return chaves;
}

/** Valor que nomeia um membro (inteiro: `Bruno`, `Bruno (marido)`, `Dr. Ana`)? */
export function ehNomeDeMembro(valor: string, chavesMembros: ReadonlySet<string>): boolean {
  const chave = chaveDeTerceiro(valor);
  return chave !== undefined && chavesMembros.has(chave);
}

type VisitaYaml = (valor: string, chaves: readonly string[]) => void;

/** Visita os escalares de texto de um YAML com o caminho de chaves (`[]` para item de lista). */
function visitarTextosYaml(doc: Document, visita: VisitaYaml): void {
  const andar = (no: unknown, chaves: readonly string[]): void => {
    if (isMap(no)) {
      for (const par of no.items) {
        const chave = isScalar(par.key) ? String(par.key.value) : '';
        andar(par.value, [...chaves, chave]);
      }
    } else if (isSeq(no)) {
      for (const item of no.items) andar(item, [...chaves, '[]']);
    } else if (isScalar(no) && typeof no.value === 'string') {
      visita(no.value, chaves);
    }
  };
  andar(doc.contents, []);
}

/** Última chave com nome do caminho (pula os `[]`), normalizada. */
export function ultimaChave(chaves: readonly string[]): string {
  for (let i = chaves.length - 1; i >= 0; i--) {
    const chave = chaves[i] ?? '';
    if (chave !== '[]') return normalizarParaBusca(chave).replace(/\s+/g, '_');
  }
  return '';
}

/**
 * Coleta os terceiros: células das colunas de pessoa e de profissional das tabelas e valores das
 * chaves YAML de profissional e de pessoa (frontmatter e arquivos `.yaml`) que não nomeiam um
 * membro nem são `id` de membro. Devolve as chaves (`chaveDeTerceiro`) em ordem de texto.
 */
export function coletarTerceiros(textos: ReadonlyMap<string, string>, membros: readonly MembroColetado[]): string[] {
  const chavesMembros = chavesDeMembros(membros);
  const ids = new Set(membros.flatMap((m) => m.ids));
  const terceiros = new Set<string>();
  const anotar = (valor: string): void => {
    if (ehValorDeModelo(valor) || ids.has(valor.trim()) || ehNomeDeMembro(valor, chavesMembros)) return;
    const chave = chaveDeTerceiro(valor);
    if (chave !== undefined) terceiros.add(chave);
  };
  const doYaml = (texto: string): void => {
    const doc = parseDocument(texto, { prettyErrors: false, schema: 'core' });
    if (doc.errors.length > 0) return;
    visitarTextosYaml(doc, (valor, chaves) => {
      const chave = ultimaChave(chaves);
      if (CHAVES_PROFISSIONAIS.has(chave) || CHAVES_PESSOAS.has(chave)) anotar(valor);
    });
  };

  for (const [rel, texto] of textos) {
    const extensao = extname(rel).toLowerCase();
    if (extensao === '.yaml' || extensao === '.yml') doYaml(texto);
    if (extensao !== '.md') continue;
    try {
      const fm = parseDocumento(texto).frontmatter;
      if (fm !== undefined) doYaml(fm.texto);
    } catch {
      // CR solto: o arquivo inteiro vira texto anonimizado; não há tabela nem frontmatter a ler.
    }
    for (const tabela of tabelasDe(texto)) {
      tabela.cabecalho.forEach((cabecalho, i) => {
        const tipo = tipoDeColuna(cabecalho);
        if (tipo !== 'pessoa' && tipo !== 'profissional') return;
        for (const linha of tabela.linhas) anotar(linha[i] ?? '');
      });
    }
  }
  return [...terceiros].sort(compararTexto);
}

// ---------------------------------------------------------------------------------------------
// Termos: troca de nomes em texto

/** Como os nomes viram aliases: muda entre `anonimizar` (`Membro A`) e `inspecionar` (`membro-1`). */
export type FabricaDeAliases = {
  membro(indice: number): string;
  idDeMembro(indice: number): string;
  terceiro(indice: number): string;
};

export const ALIAS_SOBRENOME = 'Sobrenome';
export const ALIAS_FAMILIA = 'Exemplo';

export type Termos = {
  /** Termo normalizado → alias. */
  mapa: ReadonlyMap<string, string>;
  /** Alternância de todos os termos, o mais longo primeiro (sobre o texto normalizado). */
  regex: RegExp | undefined;
  /** A mesma alternância com fronteira só de letra, para nomes de arquivo e pasta. */
  regexArquivo: RegExp | undefined;
};

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Monta os termos, nesta prioridade (o primeiro a ocupar um termo fica com ele): nomes completos de
 * membro → alias do membro; partes (≥3 letras) de um só membro → alias dele, de vários → `Sobrenome`;
 * ids de membro; terceiros (nome inteiro e partes, do mesmo jeito); o núcleo da família → `Exemplo`
 * e as partes dele → `Sobrenome`.
 */
export function construirTermos(
  nomes: NomesColetados,
  terceiros: readonly string[],
  fabrica: FabricaDeAliases,
): Termos {
  const mapa = new Map<string, string>();
  const ocupar = (termo: string, alias: string): void => {
    if (termo !== '' && !mapa.has(termo)) mapa.set(termo, alias);
  };
  const porPartes = (grupos: readonly string[][], alias: (i: number) => string): void => {
    const donos = new Map<string, Set<number>>();
    grupos.forEach((nomesDoGrupo, i) => {
      for (const nome of nomesDoGrupo) {
        for (const parte of partesDoNome(nome)) {
          const conjunto = donos.get(parte) ?? new Set<number>();
          conjunto.add(i);
          donos.set(parte, conjunto);
        }
      }
    });
    for (const [parte, conjunto] of donos) {
      const [unico] = conjunto;
      ocupar(parte, conjunto.size === 1 && unico !== undefined ? alias(unico) : ALIAS_SOBRENOME);
    }
  };

  nomes.membros.forEach((membro, i) => {
    for (const nome of membro.nomes) {
      ocupar(normalizarParaBusca(nome), fabrica.membro(i));
      ocupar(normalizarParaBusca(semParenteses(nome)), fabrica.membro(i));
    }
  });
  // Nome completo colado, sem espaço (`AnaSouza.pdf`): só para nomes de mais de uma parte.
  nomes.membros.forEach((membro, i) => {
    for (const nome of membro.nomes) {
      const partes = normalizarParaBusca(semParenteses(nome)).split(/[^\p{L}]+/u).filter((p) => p !== '');
      if (partes.length > 1) ocupar(partes.join(''), fabrica.membro(i));
    }
  });
  porPartes(
    nomes.membros.map((m) => m.nomes),
    (i) => fabrica.membro(i),
  );
  nomes.membros.forEach((membro, i) => {
    for (const id of membro.ids) ocupar(normalizarParaBusca(id), fabrica.idDeMembro(i));
  });
  terceiros.forEach((chave, j) => {
    ocupar(chave, fabrica.terceiro(j));
  });
  porPartes(
    terceiros.map((t) => [t]),
    (j) => fabrica.terceiro(j),
  );
  if (nomes.familia !== undefined) {
    const nucleo = nucleoDaFamilia(nomes.familia);
    ocupar(normalizarParaBusca(nucleo), ALIAS_FAMILIA);
    for (const parte of partesDoNome(nucleo)) ocupar(parte, ALIAS_SOBRENOME);
  }

  const chaves = [...mapa.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : a > b ? 1 : 0));
  const alternancia = chaves.map((c) => escaparRegex(c).replace(/ /g, '\\s+')).join('|');
  if (chaves.length === 0) return { mapa, regex: undefined, regexArquivo: undefined };
  return {
    mapa,
    regex: new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternancia})(?![\\p{L}\\p{N}])`, 'gu'),
    // Em nome de arquivo ou pasta só letra cola: dígito, `_`, `-` e `.` separam (`Exame-Ana2026.pdf`).
    regexArquivo: new RegExp(`(?<!\\p{L})(?:${alternancia})(?!\\p{L})`, 'gu'),
  };
}

/**
 * O texto em minúsculas e sem acento, com o índice, no texto original, do caractere que gerou cada
 * unidade (mais uma posição final = `texto.length`). Marcas combinantes soltas somem e ficam
 * dentro da faixa do caractere anterior.
 */
function normalizarComMapa(texto: string): { normal: string; origem: number[] } {
  let normal = '';
  const origem: number[] = [];
  for (let i = 0; i < texto.length; ) {
    const codigo = texto.codePointAt(i) ?? 0;
    const caractere = String.fromCodePoint(codigo);
    const forma = caractere.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{M}/gu, '');
    for (let k = 0; k < forma.length; k++) origem.push(i);
    normal += forma;
    i += caractere.length;
  }
  origem.push(texto.length);
  return { normal, origem };
}

/**
 * Troca cada termo achado em `texto` (palavra inteira, sem distinguir acento nem caixa, o mais longo
 * primeiro) pelo alias. Um alias igual ao termo (a família `Exemplo`) deixa o texto como estava.
 * `emNomeDeArquivo`: o termo também vale colado a dígito, `_`, `-` ou `.` (no texto, `Anabela` e
 * `Ana2` ficam; em nome de arquivo, só `Anabela`).
 */
export function substituirNomes(texto: string, termos: Termos, emNomeDeArquivo = false): string {
  const regex = emNomeDeArquivo ? termos.regexArquivo : termos.regex;
  if (regex === undefined || texto === '') return texto;
  const { normal, origem } = normalizarComMapa(texto);
  let saida = '';
  let cursor = 0;
  for (const achado of normal.matchAll(regex)) {
    const chave = achado[0].replace(/\s+/g, ' ');
    const alias = termos.mapa.get(chave);
    if (alias === undefined || normalizarParaBusca(alias) === chave) continue;
    const inicio = origem[achado.index] ?? texto.length;
    const fim = origem[achado.index + achado[0].length] ?? texto.length;
    if (inicio < cursor) continue;
    saida += texto.slice(cursor, inicio) + alias;
    cursor = fim;
  }
  return saida + texto.slice(cursor);
}

// ---------------------------------------------------------------------------------------------
// Padrões de valor

export type TrocaDePadroes = {
  email(valor: string): string;
  /** `AAAA-MM-DD` ou `AAAA_MM_DD` (nome de arquivo). */
  dataIso(valor: string): string;
  /** Dia/mês/ano com barras. */
  dataBr(valor: string): string;
  telefone(valor: string): string;
  /** Sequência de 8 dígitos ou mais (com `.`, `-` ou `/` entre eles): CPF, cartão, microchip, CEP. */
  digitos(valor: string): string;
};

/** Um passe só, da esquerda para a direita: num mesmo ponto, e-mail > data > telefone > dígitos. */
const PADROES = new RegExp(
  [
    '(?<email>[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)*\\.\\p{L}{2,})',
    '(?<iso>(?<!\\d)\\d{4}(?<sep>[-_])\\d{2}\\k<sep>\\d{2}(?!\\d))',
    '(?<br>(?<!\\d)\\d{2}/\\d{2}/\\d{4}(?!\\d))',
    '(?<tel>(?<![\\d+])(?:\\+\\d{2}\\s?)?(?:\\(\\d{2}\\)\\s?9?\\d{4}[-.\\s]?\\d{4}|\\d{2}\\s9?\\d{4}[-.\\s]\\d{4}|9?\\d{4}-\\d{4})(?!\\d))',
    '(?<dig>(?<!\\d)\\d(?:[./-]?\\d){7,}(?!\\d))',
  ].join('|'),
  'gu',
);

export function substituirPadroes(texto: string, troca: TrocaDePadroes): string {
  return texto.replace(PADROES, (achado: string, ...resto: unknown[]) => {
    const grupos = resto.at(-1) as Record<string, string | undefined>;
    if (grupos.email !== undefined) return troca.email(achado);
    if (grupos.iso !== undefined) return troca.dataIso(achado);
    if (grupos.br !== undefined) return troca.dataBr(achado);
    if (grupos.tel !== undefined) return troca.telefone(achado);
    return troca.digitos(achado);
  });
}

/** O texto inteiro é uma data (`AAAA-MM-DD` ou dia/mês/ano)? */
export function ehData(s: string): boolean {
  return FORMATO_DATA.test(s) || /^\d{2}\/\d{2}\/\d{4}$/.test(s);
}

/**
 * `salus-ai anonimizar`: grava em `destino` uma cópia anonimizada e determinística do cofre em
 * `origem`, para servir de fixture de teste fora do repositório. O que mais importa é **nada
 * vazar**: nome de membro, de família ou de terceiro, data, telefone, e-mail, identificador
 * numérico e texto livre. A estrutura (pastas, arquivos, cabeçalhos, colunas, quantidade de
 * linhas e de itens) fica igual, para o migrador e os codecs poderem ser testados nela.
 *
 * Regras (na ordem do plano):
 * 1. membros viram `Membro A`, `Membro B`… (ids `membro-a`…), pela ordem da pasta em `Perfis/`;
 *    nome completo e cada parte (≥3 letras) trocados em todo texto e em nomes de pasta e arquivo,
 *    sem distinguir acento nem caixa; parte de vários membros (sobrenome) → `Sobrenome`;
 *    `familia:` → `Família Exemplo` (e o nome da família no texto → `Exemplo`);
 * 2. datas `AAAA-MM-DD` e dia/mês/ano deslocadas por `deslocamentoDias` ∈ [100, 900] (da semente);
 *    data que não existe no calendário → zeros;
 * 3. números de célula de tabela e números do YAML perturbados em ±(0–15)% (mesmas casas e vírgula);
 * 4. telefones → `(00) 00000-0000`, e-mails → `pessoa@exemplo.com`, 8+ dígitos → zeros;
 * 5. colunas de profissional e de pessoa (Prescrito por, Profissional, Nome…) → `Dr. Alias N`
 *    (a não ser que nomeiem um membro); o mesmo nome em outro texto → `Alias N`;
 * 6. parágrafo e item de lista: o prefixo estrutural (`- **data**`, `- [ ]`, `[tipo]`, `**Rótulo:**`)
 *    fica e o texto livre vira `Texto anonimizado (N caracteres).`; o mesmo nas colunas de
 *    observação e no que não é tabela, lista, cabeçalho nem frontmatter;
 * 7. arquivo que não é `.md/.yaml/.yml/.txt/.json` → arquivo vazio com o nome tratado;
 * 8. `destino` não pode existir com conteúdo; `ANONIMIZACAO.md` registra semente, deslocamento e
 *    contagens, **nunca** o mapa de nomes.
 *
 * Segurança: lê só dentro de `origem` (links simbólicos e junções não são seguidos; contam em
 * `ignorados`) e grava só dentro de `destino` (um dentro do outro é recusado antes de ler).
 */
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { type Document, isMap, isScalar, isSeq, parseDocument, type Scalar, visit } from 'yaml';
import { escaparCelula, detectarEol, dividirLinhas } from '../format/texto.js';
import { ehDataValida } from '../schema/comuns.js';
import { somarDias } from '../queries/datas.js';
import { normalizarParaBusca } from '../queries/normalizar.js';
import {
  blocosMarkdown,
  celulasDaLinha,
  CHAVES_LIVRES,
  CHAVES_PESSOAS,
  CHAVES_PROFISSIONAIS,
  chaveDeTerceiro,
  chavesDeMembros,
  coletarNomes,
  coletarTerceiros,
  construirTermos,
  ehArquivoDeTexto,
  ehData,
  ehNomeDeMembro,
  lerTexto,
  percorrer,
  substituirNomes,
  substituirPadroes,
  type Termos,
  type TipoColuna,
  tipoDeColuna,
  ultimaChave,
} from './comum.js';
import { exigirPasta } from './inspecionar.js';

export type OpcoesAnonimizacao = {
  /** Inteiro não negativo; sem ela, uma é sorteada (e informada no relatório). */
  semente?: number;
};

export type RelatorioAnonimizacao = {
  semente: number;
  deslocamentoDias: number;
  membros: number;
  arquivosTexto: number;
  binarios: number;
  /** Links simbólicos, junções e o que não é arquivo nem pasta: não foram seguidos nem copiados. */
  ignorados: number;
};

export const ARQUIVO_RELATORIO = 'ANONIMIZACAO.md';

const TELEFONE = '(00) 00000-0000';
const EMAIL = 'pessoa@exemplo.com';
const FAMILIA = 'Família Exemplo';
const OPCOES_YAML = { flowCollectionPadding: false, lineWidth: 0 } as const;

/** PRNG pequeno e determinístico (mulberry32): toda a aleatoriedade sai daqui. */
function mulberry32(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `A`, `B`, … `Z`, `AA`, `AB`… */
function letra(indice: number): string {
  let n = indice + 1;
  let saida = '';
  while (n > 0) {
    const resto = (n - 1) % 26;
    saida = String.fromCharCode(65 + resto) + saida;
    n = Math.floor((n - 1) / 26);
  }
  return saida;
}

/** Caminho real (links resolvidos) mesmo que o fim ainda não exista. */
function caminhoReal(p: string): string {
  let atual = resolve(p);
  const resto: string[] = [];
  while (!existsSync(atual)) {
    const pai = dirname(atual);
    if (pai === atual) break;
    resto.unshift(basename(atual));
    atual = pai;
  }
  let real = atual;
  try {
    real = realpathSync.native(atual);
  } catch {
    real = atual;
  }
  return join(real, ...resto);
}

/**
 * `filho` é `pai` ou fica dentro dele? Um nome que só começa com `..` (`..copia`) é dentro; `rel`
 * absoluto (outro drive no Windows) é fora.
 */
function dentroDe(filho: string, pai: string): boolean {
  const rel = relative(pai, filho);
  if (rel === '') return true;
  return !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel));
}

/**
 * Rótulo em negrito (`**Nascimento:**`) só é estrutura com até 4 palavras; mais longo é uma frase
 * (`**Ana teve febre após vacina:**`) e vai para o texto livre.
 */
function ehRotuloCurto(rotulo: string): boolean {
  return rotulo.replace(/:\s*$/, '').trim().split(/\s+/).length <= 4;
}

const NUMERO = /^([<>≤≥~]\s*)?([+-]?)(\d+)(?:([.,])(\d+))?$/;

/** Contexto de uma execução: termos, aliases e o sorteio (na ordem em que os arquivos são lidos). */
class Anonimizador {
  private readonly locais = new Map<string, number>();
  private readonly indiceDeTerceiro: Map<string, number>;

  constructor(
    private readonly termos: Termos,
    private readonly aliasDeId: ReadonlyMap<string, string>,
    private readonly chavesMembros: ReadonlySet<string>,
    terceiros: readonly string[],
    private readonly deslocamento: number,
    private readonly sortear: () => number,
  ) {
    this.indiceDeTerceiro = new Map(terceiros.map((chave, j) => [chave, j + 1]));
  }

  // ---- valores ------------------------------------------------------------------------------

  private deslocarIso(data: string): string {
    if (!ehDataValida(data)) return '0000-00-00';
    try {
      return somarDias(data, this.deslocamento);
    } catch {
      return '0000-00-00';
    }
  }

  private deslocarBr(data: string): string {
    const [dia = '', mes = '', ano = ''] = data.split('/');
    const iso = this.deslocarIso(`${ano}-${mes}-${dia}`);
    if (iso === '0000-00-00') return '00/00/0000';
    const [a = '', m = '', d = ''] = iso.split('-');
    return `${d}/${m}/${a}`;
  }

  /**
   * E-mail, data, telefone e dígitos trocados; depois os nomes. Serve a todo texto que fica.
   * `emNomeDeArquivo`: o nome também é achado colado a dígito, `_`, `-` ou `.` (`Exame-Ana2026.pdf`).
   */
  generico(texto: string, emNomeDeArquivo = false): string {
    const semPadroes = substituirPadroes(texto, {
      email: () => EMAIL,
      dataIso: (d) => {
        // `AAAA_MM_DD` (nome de arquivo) é deslocada como `AAAA-MM-DD` e volta com o sublinhado.
        const separador = d.charAt(4);
        const deslocada = this.deslocarIso(d.replaceAll(separador, '-'));
        return deslocada.replaceAll('-', separador);
      },
      dataBr: (d) => this.deslocarBr(d),
      telefone: () => TELEFONE,
      digitos: (s) => s.replace(/\d/g, '0'),
    });
    return substituirNomes(semPadroes, this.termos, emNomeDeArquivo);
  }

  /** Texto livre → `Texto anonimizado (N caracteres).` (vazio fica vazio). */
  livre(texto: string): string {
    const aparado = texto.trim();
    return aparado === '' ? texto : `Texto anonimizado (${[...aparado].length} caracteres).`;
  }

  /** Número perturbado em ±(0–15)%, com as mesmas casas e o mesmo separador; 8+ dígitos → zeros. */
  private perturbar(texto: string): string | undefined {
    const m = NUMERO.exec(texto);
    if (m === null) return undefined;
    const [, prefixo = '', sinal = '', inteira = '', separador, fracao = ''] = m;
    if ((inteira + fracao).length >= 8) return texto.replace(/\d/g, '0');
    const valor = Number(`${inteira}.${fracao === '' ? '0' : fracao}`);
    const fator = 1 + (this.sortear() * 0.3 - 0.15);
    let novo = (valor * fator).toFixed(fracao.length);
    if (inteira.length > 1 && inteira.startsWith('0')) {
      const [parteInteira = '', resto] = novo.split('.');
      novo = parteInteira.padStart(inteira.length, '0') + (resto === undefined ? '' : `.${resto}`);
    }
    if (separador !== undefined) novo = novo.replace('.', separador);
    return prefixo + sinal + novo;
  }

  /** Nome de pessoa ou profissional: membro → alias do membro; outro → `Dr. Alias N`. */
  private pessoa(texto: string): string {
    const aparado = texto.trim();
    if (aparado === '') return texto;
    const alias = this.aliasDeId.get(aparado);
    if (alias !== undefined) return alias;
    if (ehNomeDeMembro(aparado, this.chavesMembros)) return this.generico(texto);
    const chave = chaveDeTerceiro(aparado);
    if (chave === undefined) return this.generico(texto);
    let n = this.indiceDeTerceiro.get(chave);
    if (n === undefined) {
      n = this.indiceDeTerceiro.size + 1;
      this.indiceDeTerceiro.set(chave, n);
    }
    return `Dr. Alias ${n}`;
  }

  private local(texto: string): string {
    const chave = normalizarParaBusca(texto);
    if (chave === '') return texto;
    let n = this.locais.get(chave);
    if (n === undefined) {
      n = this.locais.size + 1;
      this.locais.set(chave, n);
    }
    return `Local ${n}`;
  }

  /** Valor de célula (ou de escalar YAML) conforme o tipo da coluna. */
  valor(texto: string, tipo: TipoColuna): string {
    const aparado = texto.trim();
    if (aparado === '') return texto;
    if (ehData(aparado)) return this.generico(aparado);
    const numero = this.perturbar(aparado);
    if (numero !== undefined) return numero;
    switch (tipo) {
      case 'livre':
        return this.livre(texto);
      case 'profissional':
      case 'pessoa':
        return this.pessoa(texto);
      case 'local':
        return this.local(texto);
      default:
        return this.generico(texto);
    }
  }

  // ---- YAML ---------------------------------------------------------------------------------

  /** YAML anonimizado (com o fim de linha dominante da fonte), ou `undefined` se não for YAML válido. */
  yaml(fonte: string): string | undefined {
    const doc = parseDocument(fonte, { prettyErrors: false, schema: 'core' });
    if (doc.errors.length > 0) return undefined;
    this.anonimizarDocumentoYaml(doc, fonte);
    const texto = doc.toString(OPCOES_YAML);
    return detectarEol(fonte) === 'CRLF' ? texto.replace(/\r?\n/g, '\r\n') : texto;
  }

  private anonimizarDocumentoYaml(doc: Document, fonte: string): void {
    const escalar = (no: Scalar, chaves: readonly string[]): void => {
      const valor = no.value;
      if (typeof valor === 'string') {
        no.value = this.textoYaml(valor, chaves);
      } else if (typeof valor === 'number' && Number.isFinite(valor)) {
        if (/versao|version/.test(ultimaChave(chaves))) return;
        const original = no.range === undefined || no.range === null ? String(valor) : fonte.slice(no.range[0], no.range[1]).trim();
        const novo = this.perturbar(original);
        if (novo === undefined) return;
        no.value = Number(novo.replace(',', '.'));
        no.minFractionDigits = /[.,](\d+)$/.exec(novo)?.[1]?.length ?? 0;
      }
    };
    const andar = (no: unknown, chaves: readonly string[]): void => {
      if (isMap(no)) {
        for (const par of no.items) {
          const chave = isScalar(par.key) ? String(par.key.value) : '';
          if (isScalar(par.key)) {
            if (typeof par.key.value === 'string') par.key.value = this.chaveYaml(par.key.value);
          } else {
            andar(par.key, chaves);
          }
          if (isScalar(par.value)) escalar(par.value, [...chaves, chave]);
          else andar(par.value, [...chaves, chave]);
        }
      } else if (isSeq(no)) {
        for (const item of no.items) {
          if (isScalar(item)) escalar(item, [...chaves, '[]']);
          else andar(item, [...chaves, '[]']);
        }
      } else if (isScalar(no)) {
        escalar(no, chaves);
      }
    };
    andar(doc.contents, []);
    // Comentário não tem valor estrutural: todo comentário (linha inteira ou no fim da linha), em
    // qualquer nó, vira texto anonimizado. O `yaml` já separa o `#` de um comentário do `#` dentro
    // de um texto entre aspas, então este último fica como está.
    const comentar = (no: { commentBefore?: string | null; comment?: string | null }): void => {
      if (typeof no.commentBefore === 'string') no.commentBefore = this.comentario(no.commentBefore);
      if (typeof no.comment === 'string') no.comment = this.comentario(no.comment);
    };
    comentar(doc);
    visit(doc, {
      Node: (_chave, no) => {
        comentar(no);
      },
    });
  }

  /** Cada linha do comentário (o texto depois do `#`) vira texto anonimizado; a indentação fica. */
  private comentario(texto: string): string {
    return texto
      .split('\n')
      .map((linha) => (linha.trim() === '' ? linha : (/^\s*/.exec(linha)?.[0] ?? '') + this.livre(linha)))
      .join('\n');
  }

  private chaveYaml(chave: string): string {
    return this.aliasDeId.get(chave) ?? this.generico(chave);
  }

  /** Escalar de texto do YAML, pelo caminho das chaves. */
  textoYaml(valor: string, chaves: readonly string[]): string {
    if (valor.trim() === '') return valor;
    const ultima = ultimaChave(chaves);
    if (chaves.length === 1 && ultima === 'familia') return FAMILIA;
    const alias = this.aliasDeId.get(valor.trim());
    if (alias !== undefined) return alias;
    if (CHAVES_LIVRES.has(ultima)) return this.livre(valor);
    if (CHAVES_PROFISSIONAIS.has(ultima) || CHAVES_PESSOAS.has(ultima)) return this.valor(valor, 'pessoa');
    return this.valor(valor, 'generico');
  }

  // ---- JSON ---------------------------------------------------------------------------------

  json(fonte: string): string | undefined {
    let dados: unknown;
    try {
      dados = JSON.parse(fonte) as unknown;
    } catch {
      return undefined;
    }
    const andar = (valor: unknown, chaves: readonly string[]): unknown => {
      if (Array.isArray(valor)) return valor.map((item) => andar(item, [...chaves, '[]']));
      if (typeof valor === 'object' && valor !== null) {
        return Object.fromEntries(
          Object.entries(valor).map(([chave, filho]) => [this.chaveYaml(chave), andar(filho, [...chaves, chave])]),
        );
      }
      if (typeof valor === 'string') return this.textoYaml(valor, chaves);
      if (typeof valor === 'number' && Number.isFinite(valor) && !/versao|version/.test(ultimaChave(chaves))) {
        const novo = this.perturbar(String(valor));
        return novo === undefined ? valor : Number(novo);
      }
      return valor;
    };
    const indentacao = /\n([ \t]+)"/.exec(fonte)?.[1] ?? '';
    let texto = JSON.stringify(andar(dados, []), null, indentacao);
    if (/\r?\n$/.test(fonte)) texto += '\n';
    return detectarEol(fonte) === 'CRLF' ? texto.replace(/\r?\n/g, '\r\n') : texto;
  }

  // ---- texto e Markdown ---------------------------------------------------------------------

  /** Cada linha com texto vira texto anonimizado (a indentação fica); linhas e fins de linha iguais. */
  linhas(fonte: string): string {
    const { linhas, eols } = dividirLinhas(fonte);
    return linhas.map((linha, i) => this.linhaLivre(linha) + (eols[i] ?? '')).join('');
  }

  private linhaLivre(linha: string): string {
    if (linha.trim() === '') return linha;
    const indentacao = /^\s*/.exec(linha)?.[0] ?? '';
    return indentacao + this.livre(linha);
  }

  /** Aplica `f` a cada linha de `trecho`, mantendo os fins de linha. */
  private porLinha(trecho: string, f: (linha: string, indice: number, total: number) => string): string {
    const { linhas, eols } = dividirLinhas(trecho);
    return linhas.map((linha, i) => f(linha, i, linhas.length) + (eols[i] ?? '')).join('');
  }

  markdown(fonte: string): string {
    let blocos;
    try {
      blocos = blocosMarkdown(fonte);
    } catch {
      return this.linhas(fonte);
    }
    let saida = '';
    let cursor = 0;
    for (const bloco of blocos) {
      saida += this.lacuna(fonte.slice(cursor, bloco.inicio));
      const trecho = fonte.slice(bloco.inicio, bloco.fim);
      saida += this.bloco(bloco.tipo, trecho, fonte);
      cursor = bloco.fim;
    }
    return saida + this.lacuna(fonte.slice(cursor));
  }

  /** Entre blocos só há espaço em branco; se houver outra coisa, vira texto anonimizado. */
  private lacuna(trecho: string): string {
    return /\S/.test(trecho) ? this.porLinha(trecho, (l) => this.linhaLivre(l)) : trecho;
  }

  private bloco(tipo: string, trecho: string, fonte: string): string {
    switch (tipo) {
      case 'yaml':
        return this.frontmatter(trecho, fonte);
      case 'heading':
        return this.cabecalho(trecho);
      case 'paragraph':
        return this.porLinha(trecho, (l) => this.linhaDeParagrafo(l));
      case 'list':
        return this.porLinha(trecho, (l) => this.linhaDeLista(l));
      case 'table':
        return this.tabela(trecho);
      case 'thematicBreak':
        return trecho;
      case 'code':
        return this.codigo(trecho);
      case 'html':
        return this.porLinha(trecho, (l) =>
          l.trim() === '' ? l : `${/^\s*/.exec(l)?.[0] ?? ''}<!-- ${this.livre(l)} -->`,
        );
      case 'blockquote':
        return this.porLinha(trecho, (l) => {
          const m = /^(\s*(?:>\s?)+)(.*)$/.exec(l);
          if (m === null) return this.linhaLivre(l);
          const resto = m[2] ?? '';
          return resto.trim() === '' ? l : (m[1] ?? '') + this.livre(resto);
        });
      default:
        return this.porLinha(trecho, (l) => this.linhaLivre(l));
    }
  }

  private frontmatter(trecho: string, fonte: string): string {
    const { linhas, eols } = dividirLinhas(trecho);
    const abertura = (linhas[0] ?? '---') + (eols[0] ?? '\n');
    const fechamento = linhas.at(-1) ?? '---';
    const interno = linhas
      .slice(1, -1)
      .map((l, i) => l + (eols[i + 1] ?? ''))
      .join('');
    if (interno.trim() === '') return trecho;
    const yaml = this.yaml(interno);
    if (yaml === undefined) return abertura + this.linhas(interno) + fechamento;
    const eol = detectarEol(fonte) === 'CRLF' ? '\r\n' : '\n';
    const corpo = yaml.replace(/\r?\n/g, eol);
    return abertura + (corpo.endsWith(eol) ? corpo : corpo + eol) + fechamento;
  }

  private cabecalho(trecho: string): string {
    return this.porLinha(trecho, (linha, i, total) => {
      const atx = /^(\s{0,3}#{1,6})(.*)$/.exec(linha);
      if (atx !== null) return (atx[1] ?? '') + this.generico(atx[2] ?? '');
      // cabeçalho setext: o texto nas primeiras linhas, o sublinhado (=== ou ---) na última
      return i === total - 1 ? linha : this.generico(linha);
    });
  }

  /** `**Rótulo:** texto` → o rótulo fica, o texto vira anonimizado; sem rótulo, a linha inteira. */
  private linhaDeParagrafo(linha: string): string {
    if (linha.trim() === '') return linha;
    const m = /^(\s*)(\*\*|__)(.+?)\2(:?)(\s*)(.*)$/.exec(linha);
    if (m !== null) {
      const [, indentacao = '', marca = '', rotulo = '', doisPontos = '', espaco = '', resto = ''] = m;
      if ((rotulo.trimEnd().endsWith(':') || doisPontos === ':') && ehRotuloCurto(rotulo)) {
        const prefixo = indentacao + this.generico(`${marca}${rotulo}${marca}${doisPontos}`);
        return resto.trim() === '' ? prefixo + espaco + resto : `${prefixo} ${this.livre(resto)}`;
      }
    }
    return this.linhaLivre(linha);
  }

  /**
   * Linha de lista: marcador, `[ ]`/`[x]`, `**data**` ou `**Rótulo:**` e `[tipo]` ficam; o resto vira
   * texto anonimizado. Linha sem marcador (continuação) vira texto anonimizado com a indentação.
   */
  private linhaDeLista(linha: string): string {
    if (linha.trim() === '') return linha;
    const marcador = /^(\s*)([-*+]|\d{1,9}[.)])(\s+|$)/.exec(linha);
    if (marcador === null) return this.linhaLivre(linha);
    let prefixo = marcador[0];
    let resto = linha.slice(prefixo.length);
    const tarefa = /^\[[ xX]\]\s*/.exec(resto);
    if (tarefa !== null) {
      prefixo += tarefa[0];
      resto = resto.slice(tarefa[0].length);
    }
    const negrito = /^(\*\*|__)(.+?)\1(:?)(\s*)/.exec(resto);
    if (negrito !== null) {
      const interno = (negrito[2] ?? '').trim();
      if (ehData(interno) || ((interno.endsWith(':') || negrito[3] === ':') && ehRotuloCurto(interno))) {
        prefixo += this.generico(negrito[0]);
        resto = resto.slice(negrito[0].length);
      }
    }
    const tipo = /^\[[a-z_]+\]\s*/.exec(resto);
    if (tipo !== null) {
      prefixo += tipo[0];
      resto = resto.slice(tipo[0].length);
    }
    if (resto.trim() === '') return prefixo + resto;
    return `${prefixo}${/\s$/.test(prefixo) ? '' : ' '}${this.livre(resto)}`;
  }

  /** Tabela: cabeçalho e delimitador ficam (com os nomes trocados); cada célula pelo tipo da coluna. */
  private tabela(trecho: string): string {
    const tipos: TipoColuna[] = [];
    return this.porLinha(trecho, (linha, i) => {
      const celulas = celulasDaLinha(linha);
      if (i === 1) return linha;
      if (i === 0) {
        tipos.push(...celulas.map(tipoDeColuna));
        const novas = celulas.map((c) => this.generico(c));
        return this.linhaDeTabela(linha, celulas, novas);
      }
      // Linha colada logo abaixo da tabela, sem `|`: pelo GFM vira uma linha de uma célula, mas é
      // texto livre (uma frase, uma fonte) e não um valor de coluna.
      if (!/(?<!\\)\|/.test(linha)) return this.linhaLivre(linha);
      if (celulas.every((c) => c === '')) return linha;
      const novas = celulas.map((c, k) => this.valor(c, tipos[k] ?? 'livre'));
      return this.linhaDeTabela(linha, celulas, novas);
    });
  }

  private linhaDeTabela(original: string, celulas: readonly string[], novas: readonly string[]): string {
    if (novas.every((c, k) => c === celulas[k])) return original;
    const indentacao = /^\s*/.exec(original)?.[0] ?? '';
    return `${indentacao}|${novas.map((c) => (c === '' ? ' ' : ` ${escaparCelula(c)} `)).join('|')}|`;
  }

  /** Bloco de código: as cercas ficam; as linhas de dentro viram texto anonimizado. */
  private codigo(trecho: string): string {
    const cerca = /^\s*(`{3,}|~{3,})/.exec(trecho)?.[1];
    return this.porLinha(trecho, (linha, i, total) => {
      if (cerca === undefined) return this.linhaLivre(linha);
      if (i === 0) return this.generico(linha);
      if (i === total - 1 && linha.trim().startsWith(cerca)) return linha;
      return this.linhaLivre(linha);
    });
  }

  /** Conteúdo anonimizado de um arquivo de texto, pela extensão (o BOM fica de fora). */
  arquivo(extensao: string, texto: string): string {
    switch (extensao) {
      case '.md':
        return this.markdown(texto);
      case '.yaml':
      case '.yml':
        return this.yaml(texto) ?? this.linhas(texto);
      case '.json':
        return this.json(texto) ?? this.linhas(texto);
      default:
        return this.linhas(texto);
    }
  }

  /** Nome de pasta ou arquivo tratado (nunca vazio, `.`, `..` nem com separador). */
  nomeDeArquivo(nome: string): string {
    const tratado = this.generico(nome, true).replace(/[\\/]/g, '_');
    return tratado === '' || tratado === '.' || tratado === '..' ? '_' : tratado;
  }
}

/** Lança se a semente não for um inteiro não negativo seguro; sem semente, sorteia uma. */
function escolherSemente(semente: number | undefined): number {
  if (semente === undefined) return Math.floor(Math.random() * 2 ** 31);
  if (!Number.isSafeInteger(semente) || semente < 0) throw new Error(`Semente inválida: ${semente}`);
  return semente;
}

/**
 * Grava em `destino` a cópia anonimizada de `origem` e devolve o relatório. Lança (antes de ler ou
 * gravar qualquer coisa) se `origem` não é uma pasta, se uma pasta está dentro da outra ou se
 * `destino` existe e não é uma pasta vazia.
 */
export function anonimizar(origem: string, destino: string, opcoes: OpcoesAnonimizacao = {}): RelatorioAnonimizacao {
  const semente = escolherSemente(opcoes.semente);
  const raiz = exigirPasta(origem);
  const alvo = resolve(destino);
  const realOrigem = caminhoReal(raiz);
  const realDestino = caminhoReal(alvo);
  if (dentroDe(realDestino, realOrigem) || dentroDe(realOrigem, realDestino)) {
    throw new Error('O destino não pode ficar dentro da origem, nem a origem dentro do destino (nem serem a mesma pasta).');
  }
  if (existsSync(alvo)) {
    if (!lstatSync(alvo).isDirectory()) throw new Error(`O destino existe e não é uma pasta: ${alvo}`);
    if (readdirSync(alvo).length > 0) throw new Error(`A pasta de destino não está vazia: ${alvo}`);
  }

  const { entradas, ignorados } = percorrer(raiz);
  const textos = new Map<string, string>();
  const bons = new Set<string>();
  for (const entrada of entradas) {
    if (entrada.tipo !== 'arquivo' || !ehArquivoDeTexto(entrada.rel)) continue;
    const { texto, bom } = lerTexto(join(raiz, entrada.rel));
    textos.set(entrada.rel, texto);
    if (bom) bons.add(entrada.rel);
  }

  const pastasDePerfil = entradas
    .filter((e) => e.tipo === 'pasta' && /^Perfis\/[^/]+$/.test(e.rel))
    .map((e) => e.rel.slice('Perfis/'.length));
  const nomes = coletarNomes(pastasDePerfil, textos);
  const terceiros = coletarTerceiros(textos, nomes.membros);
  const termos = construirTermos(nomes, terceiros, {
    membro: (i) => `Membro ${letra(i)}`,
    idDeMembro: (i) => `membro-${letra(i).toLowerCase()}`,
    terceiro: (j) => `Alias ${j + 1}`,
  });
  const aliasDeId = new Map<string, string>();
  const aliasDePasta = new Map<string, string>();
  nomes.membros.forEach((membro, i) => {
    for (const id of membro.ids) if (!aliasDeId.has(id)) aliasDeId.set(id, `membro-${letra(i).toLowerCase()}`);
    if (membro.pasta !== undefined) aliasDePasta.set(membro.pasta, `Membro ${letra(i)}`);
  });

  const sortear = mulberry32(semente);
  const deslocamentoDias = 100 + Math.floor(sortear() * 801);
  const anonimizador = new Anonimizador(
    termos,
    aliasDeId,
    chavesDeMembros(nomes.membros),
    terceiros,
    deslocamentoDias,
    sortear,
  );

  const destinoDe = (rel: string): string =>
    rel
      .split('/')
      .map((parte, k, partes) => {
        const alias = k === 1 && partes[0] === 'Perfis' ? aliasDePasta.get(parte) : undefined;
        return alias ?? anonimizador.nomeDeArquivo(parte);
      })
      .join('/');
  const ocupados = new Set<string>([ARQUIVO_RELATORIO.toLowerCase()]);
  const reservar = (rel: string): string => {
    let candidato = rel;
    const extensao = extname(rel);
    for (let n = 2; ocupados.has(candidato.toLowerCase()); n++) {
      candidato = `${rel.slice(0, rel.length - extensao.length)} (${n})${extensao}`;
    }
    ocupados.add(candidato.toLowerCase());
    return candidato;
  };
  const gravar = (rel: string, conteudo: string): void => {
    const caminho = resolve(alvo, rel);
    if (!dentroDe(caminho, alvo)) throw new Error('caminho de destino fora da pasta de destino');
    mkdirSync(dirname(caminho), { recursive: true });
    writeFileSync(caminho, conteudo, { flag: 'wx' });
  };

  mkdirSync(alvo, { recursive: true });
  let arquivosTexto = 0;
  let binarios = 0;
  for (const entrada of entradas) {
    const relDestino = destinoDe(entrada.rel);
    if (entrada.tipo === 'pasta') {
      const caminho = resolve(alvo, relDestino);
      if (!dentroDe(caminho, alvo)) throw new Error('caminho de destino fora da pasta de destino');
      mkdirSync(caminho, { recursive: true });
      continue;
    }
    const texto = textos.get(entrada.rel);
    if (texto === undefined) {
      gravar(reservar(relDestino), '');
      binarios++;
      continue;
    }
    const conteudo = anonimizador.arquivo(extname(entrada.rel).toLowerCase(), texto);
    gravar(reservar(relDestino), (bons.has(entrada.rel) ? '﻿' : '') + conteudo);
    arquivosTexto++;
  }

  const relatorio: RelatorioAnonimizacao = {
    semente,
    deslocamentoDias,
    membros: nomes.membros.length,
    arquivosTexto,
    binarios,
    ignorados,
  };
  gravar(ARQUIVO_RELATORIO, textoDoRelatorio(relatorio));
  return relatorio;
}

function textoDoRelatorio(r: RelatorioAnonimizacao): string {
  return [
    '# Anonimização',
    '',
    'Cópia anonimizada gerada por `salus-ai anonimizar`. O mapa de nomes não é gravado em lugar nenhum.',
    '',
    `- Semente: ${r.semente}`,
    `- Deslocamento de datas: ${r.deslocamentoDias} dias`,
    `- Membros: ${r.membros}`,
    `- Arquivos de texto: ${r.arquivosTexto}`,
    `- Binários (gravados vazios): ${r.binarios}`,
    `- Ignorados (links simbólicos e junções, não seguidos): ${r.ignorados}`,
    '',
  ].join('\n');
}

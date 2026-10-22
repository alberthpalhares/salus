/**
 * Tipos compartilhados pelos codecs por arquivo: o resultado de `ler` e o `EstadoArquivo`, que guarda
 * tudo o que `escrever` precisa para gravar por *splice* (ADR-0003) sem reler nem re-serializar.
 */
import type { Document } from 'yaml';
import type { Documento, Faixa } from '../documento.js';
import type { ItemEvento } from '../lista.js';
import type { Problema } from '../problema.js';
import type { LinhaOpaca, Tabela } from '../tabela.js';

/**
 * Linha opaca que o `doctor` lista: célula a mais (`celulas-a-mais`), linha solta na tabela
 * (`sem-barra`) ou item do histórico fora da gramática (`fora-da-gramatica`). As opacas `vazia`
 * (linha de modelo `| | |`, linha em branco na lista) são ignoradas na leitura e não entram aqui.
 */
export type Opaca = { arquivo: string; linha: number; motivo: string };

/** Registro como foi lido (cópia), para `escrever` saber o que mudou. */
export type RegistroLido = Readonly<Record<string, unknown>>;

/**
 * Tabela gerenciada lida. `chave` é o campo do modelo que ela alimenta (`emUso`, `marcadores`…);
 * várias regiões podem ter a mesma chave (cada `## <Exame>` é uma região de `marcadores`), e o
 * modelo devolvido por `ler` traz os registros delas na ordem do arquivo.
 */
export type RegiaoTabela = {
  tipo: 'tabela';
  chave: string;
  /** Título da seção como está escrito. */
  titulo: string;
  faixa: Faixa;
  tabela: Tabela;
  /**
   * Para cada registro do modelo, na ordem, a posição dele em `tabela.linhas`. Linhas que não
   * passaram no schema ficam em `tabela.linhas` (voltam cruas) mas fora daqui: nunca são regeneradas.
   */
  indices: number[];
  lidos: RegistroLido[];
};

/** Lista de eventos lida (`## Eventos` do `Historico.md`), no mesmo molde da tabela. */
export type RegiaoLista = {
  tipo: 'lista';
  chave: string;
  titulo: string;
  faixa: Faixa;
  itens: ItemEvento[];
  opacas: LinhaOpaca[];
  /** Para cada evento do modelo, a posição dele em `itens`. */
  indices: number[];
  lidos: RegistroLido[];
};

export type Regiao = RegiaoTabela | RegiaoLista;

/** Frontmatter lido (`Ficha.md`, `Genetica.md`). */
export type FrontmatterLido = {
  documento: Document;
  /** Faixa do bloco `---` … `---` inteiro, como `escreverFrontmatter` espera. */
  faixa: Faixa;
  /**
   * O frontmatter do modelo devolvido por `ler` (cópia). Ausente quando o YAML é legível mas o
   * frontmatter não deu um modelo (um campo obrigatório inválido): então não se grava por cima.
   */
  lido?: RegistroLido;
};

/**
 * Tudo o que `escrever` precisa. `escrever` não altera o estado: a mesma leitura pode ser gravada
 * várias vezes, com dados diferentes.
 */
export type EstadoArquivo = {
  arquivo: string;
  /** Texto do arquivo **sem o BOM**: todos os offsets se referem a ele; a gravação parte dele. */
  fonte: string;
  tinhaBom: boolean;
  /** Fim de linha dominante da fonte: o das linhas regravadas e acrescentadas. */
  eol: '\n' | '\r\n';
  /** Estrutura do documento (vazia, sem seções, quando o arquivo tem CR solto e não foi analisado). */
  documento: Documento;
  /** Regiões gerenciadas lidas, na ordem de leitura. Seção ausente ou ignorada não tem região. */
  regioes: Regiao[];
  frontmatter?: FrontmatterLido;
};

export type ContextoLeitura = { arquivo: string };

/** Resultado de `ler`: o modelo, os problemas e as opacas (ordenados por linha) e o estado. */
export type ResultadoLeitura<T, E = EstadoArquivo> = {
  dados: T;
  problemas: Problema[];
  opacas: Opaca[];
  estado: E;
};

/**
 * Contrato de um codec de arquivo de verdade. Declarado com sintaxe de método para que um codec de
 * `T` concreto sirva onde se espera `Codec<unknown>` (laços sobre todos os arquivos).
 */
export type Codec<T> = {
  ler(fonte: string, contexto: ContextoLeitura): ResultadoLeitura<T>;
  escrever(estado: EstadoArquivo, dados: T): string;
};

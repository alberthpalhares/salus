/**
 * Peças comuns de leitura e escrita dos codecs: a descrição de uma tabela gerenciada (colunas do
 * FORMATO.md ↔ campos da entidade), a tradução das *issues* do Zod para mensagens em pt-BR e
 * utilidades sobre registros (`Record<string, unknown>`).
 */
import type { z } from 'zod';

type CampoDe<E> = Extract<keyof E, string>;

/**
 * Tabela gerenciada: as colunas na ordem do FORMATO.md (títulos literais) e o campo da entidade
 * de cada uma. `secao` é o cabeçalho `##` canônico; as tabelas de exame não têm (a seção é qualquer
 * `##` não canônico) e preenchem `campoDoTitulo` (o `exame` do marcador) com o título da seção.
 */
export type SpecTabela<E extends object> = {
  readonly chave: string;
  readonly secao?: string;
  readonly colunas: readonly { readonly titulo: string; readonly campo: CampoDe<E> }[];
  readonly schema: z.ZodType<E>;
  readonly campoDoTitulo?: CampoDe<E>;
};

/** A mesma descrição sem o tipo da entidade, para a escrita genérica. */
export type SpecQualquer = {
  readonly chave: string;
  readonly secao?: string;
  readonly colunas: readonly { readonly titulo: string; readonly campo: string }[];
  readonly schema: z.ZodType;
  readonly campoDoTitulo?: string;
};

export type IssueZod = z.core.$ZodIssue;

export function ehObjeto(x: unknown): x is Readonly<Record<string, unknown>> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Valor de `chave` em `x`, ou `undefined` se `x` não é objeto. */
export function campoDe(x: unknown, chave: string): unknown {
  return ehObjeto(x) ? x[chave] : undefined;
}

/** Valor no caminho de uma issue (objetos e listas), ou `undefined` se o caminho não existe. */
export function valorEm(x: unknown, caminho: readonly PropertyKey[]): unknown {
  let atual = x;
  for (const passo of caminho) {
    if (Array.isArray(atual) && typeof passo === 'number') atual = atual[passo];
    else if (ehObjeto(atual) && typeof passo === 'string') atual = atual[passo];
    else return undefined;
  }
  return atual;
}

/** Igualdade estrutural de valores lidos: textos, `null`, listas e objetos simples. */
export function iguais(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => iguais(x, b[i]));
  }
  if (ehObjeto(a) && ehObjeto(b)) {
    const chaves = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...chaves].every((chave) => iguais(a[chave], b[chave]));
  }
  return false;
}

/**
 * `true` se `registro` difere do que foi lido em algum campo do registro lido (campos a mais em
 * `registro` são ignorados; um campo que falta conta como mudança).
 */
export function mudou(lido: Readonly<Record<string, unknown>>, registro: unknown): boolean {
  return !ehObjeto(registro) || Object.keys(lido).some((chave) => !iguais(lido[chave], registro[chave]));
}

/** A issue do `Marcador` que o codec do `Exames.md` transforma no problema `faixa_obrigatoria`. */
export function ehFaixaObrigatoria(issue: IssueZod): boolean {
  return issue.code === 'custom' && issue.params?.['codigo'] === 'faixa_obrigatoria';
}

/**
 * Mensagem em pt-BR de uma issue. As mensagens dos schemas do Salus já são em pt-BR e não citam o
 * valor; as mensagens padrão do Zod (em inglês) são trocadas por uma frase própria. `valor` é o
 * valor no caminho da issue: `undefined` ou `null` (chave YAML sem valor) quer dizer campo obrigatório
 * ausente ou vazio. Nunca inclui o valor.
 */
export function descreverIssue(issue: IssueZod, valor: unknown): string {
  if (valor === undefined || valor === null) return 'campo obrigatório ausente ou vazio';
  switch (issue.code) {
    case 'custom':
    case 'invalid_format':
    case 'too_small':
      return issue.message;
    case 'invalid_value':
      return `valor fora da lista aceita (${issue.values.map((v) => (v === '' ? 'vazio' : String(v))).join(', ')})`;
    case 'invalid_type':
      if (issue.expected === 'string') return 'deveria ser texto (números e datas vão entre aspas)';
      if (issue.expected === 'array') return 'deveria ser uma lista de textos';
      return 'tipo de valor inválido';
    case 'invalid_union':
      return 'valor em formato inválido';
    default:
      return 'valor inválido';
  }
}

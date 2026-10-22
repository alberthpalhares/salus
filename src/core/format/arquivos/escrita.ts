/**
 * Motor de escrita dos codecs: compara o modelo recebido com o que foi lido (guardado no
 * `EstadoArquivo`), marca como `modificada` só as linhas que mudaram, acrescenta as novas no fim da
 * região e monta as `Edicao`s; `gravar` aplica o *splice* sobre a fonte sem BOM (ADR-0003). Nada é
 * re-serializado: sem mudança numa região, não há edição nela; sem mudança nenhuma, a saída é a fonte.
 *
 * Os registros são casados com os lidos **pela posição** dentro da chave (`emUso[i]` é o i-ésimo
 * registro válido lido de `## Em uso`). Mais registros que os lidos = acréscimo no fim; menos =
 * remoção, que esta fase não suporta (lança; a Fase 1B traz a remoção com posição exata das opacas).
 */
import { type Document, isNode, isScalar, isSeq, type Node, Scalar, YAMLSeq } from 'yaml';
import type { z } from 'zod';
import { FORMATO_DATA } from '../../schema/comuns.js';
import { Evento } from '../../schema/evento.js';
import { escreverFrontmatter } from '../frontmatter.js';
import { emitirListaEventos, type ItemEvento } from '../lista.js';
import { aplicarEdicoes, type Edicao } from '../splice.js';
import { emitirTabela, type LinhaTabela } from '../tabela.js';
import { normalizarCabecalho } from '../texto.js';
import type { EstadoArquivo, RegiaoLista, RegiaoTabela } from './estado.js';
import { campoDe, descreverIssue, ehObjeto, iguais, mudou, type SpecQualquer, valorEm } from './validacao.js';

export const ERRO_REMOCAO = 'remoção de linhas chega na Fase 1B';

/** Aplica as edições à fonte do estado (sem BOM; o fim de linha de cada trecho já vem certo). */
export function gravar(estado: EstadoArquivo, edicoes: readonly Edicao[]): string {
  return aplicarEdicoes(estado.fonte, edicoes);
}

/**
 * Valida o registro a gravar; lança dizendo a posição e o campo (nunca o valor) se não passar.
 */
export function validar<E>(schema: z.ZodType<E>, registro: unknown, onde: string): E {
  const r = schema.safeParse(registro);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  const detalhe =
    issue === undefined
      ? 'valor inválido'
      : `campo '${String(issue.path[0] ?? '')}': ${descreverIssue(issue, valorEm(registro, issue.path))}`;
  throw new Error(`${onde} não passa no schema: ${detalhe}`);
}

/** `validar` para os registros de tabela e o frontmatter, que são objetos. */
export function validarObjeto(schema: z.ZodType, registro: unknown, onde: string): Readonly<Record<string, unknown>> {
  const valido = validar(schema, registro, onde);
  if (!ehObjeto(valido)) throw new Error(`${onde} não passa no schema: não é um objeto`);
  return valido;
}

function celulasDe(spec: SpecQualquer, registro: Readonly<Record<string, unknown>>): string[] {
  return spec.colunas.map((coluna) => {
    const valor = registro[coluna.campo];
    return typeof valor === 'string' ? valor : '';
  });
}

/** O registro pertence à seção `titulo`? (o `exame` do marcador × o título do `## <Exame>`) */
function daSecao(registro: Readonly<Record<string, unknown>>, campo: string, titulo: string): boolean {
  const valor = registro[campo];
  return typeof valor === 'string' && normalizarCabecalho(valor) === normalizarCabecalho(titulo);
}

type Pendente = { linhas: LinhaTabela[]; novas: string[][] };

/**
 * Edições das tabelas das `specs`. `dados[spec.chave]` é a lista do modelo; a chave ausente vale
 * lista vazia. As regiões da mesma chave (os `## <Exame>`) são percorridas na ordem de leitura;
 * um marcador novo vai para a seção do seu `exame`. Lança: remoção de registro, registro inválido,
 * registro novo sem região onde entrar (seção ausente ou ignorada na leitura) e marcador lido que
 * mudou de exame.
 */
export function edicoesDasTabelas(
  estado: EstadoArquivo,
  specs: readonly SpecQualquer[],
  dados: Readonly<Record<string, readonly object[] | undefined>>,
): Edicao[] {
  const edicoes: Edicao[] = [];
  for (const spec of specs) {
    const registros = dados[spec.chave] ?? [];
    const regioes = estado.regioes.filter((r): r is RegiaoTabela => r.tipo === 'tabela' && r.chave === spec.chave);
    const lidos = regioes.reduce((total, r) => total + r.lidos.length, 0);
    if (registros.length < lidos) {
      throw new Error(`${ERRO_REMOCAO}: '${spec.chave}' tem ${lidos} registros lidos e ${registros.length} a gravar`);
    }
    const pendentes = new Map<RegiaoTabela, Pendente>();
    const pendente = (regiao: RegiaoTabela): Pendente => {
      let p = pendentes.get(regiao);
      if (p === undefined) {
        p = { linhas: regiao.tabela.linhas.map((linha) => ({ ...linha })), novas: [] };
        pendentes.set(regiao, p);
      }
      return p;
    };

    let i = 0; // posição do próximo registro do modelo
    for (const regiao of regioes) {
      regiao.lidos.forEach((lido, j) => {
        const registro = registros[i];
        i++;
        if (!mudou(lido, registro)) return;
        const valido = validarObjeto(spec.schema, registro, `o registro ${i} de '${spec.chave}'`);
        if (spec.campoDoTitulo !== undefined && !daSecao(valido, spec.campoDoTitulo, regiao.titulo)) {
          throw new Error(
            `o registro ${i} de '${spec.chave}' mudou de exame: mover um registro para outra seção chega na Fase 1B`,
          );
        }
        const p = pendente(regiao);
        const k = regiao.indices[j];
        const linha = k === undefined ? undefined : p.linhas[k];
        if (k === undefined || linha === undefined) throw new Error(`estado inconsistente em '${spec.chave}'`);
        p.linhas[k] = { ...linha, celulas: celulasDe(spec, valido), modificada: true };
      });
    }
    for (; i < registros.length; i++) {
      const onde = `o registro ${i + 1} de '${spec.chave}'`;
      const valido = validarObjeto(spec.schema, registros[i], onde);
      const campo = spec.campoDoTitulo;
      const regiao = campo === undefined ? regioes[0] : regioes.find((r) => daSecao(valido, campo, r.titulo));
      if (regiao === undefined) {
        throw new Error(
          campo === undefined
            ? `não há onde gravar ${onde}: a seção '## ${spec.secao ?? spec.chave}' não existe no arquivo ` +
                'ou a tabela dela foi ignorada na leitura (veja os problemas)'
            : `não há seção de exame com o título de ${onde}: criar a seção de um exame novo chega na Fase 1B`,
        );
      }
      pendente(regiao).novas.push(celulasDe(spec, valido));
    }

    for (const [regiao, p] of pendentes) {
      const tabela = { ...regiao.tabela, linhas: p.linhas, eolPadrao: estado.eol };
      edicoes.push({ inicio: regiao.faixa.inicio, fim: regiao.faixa.fim, texto: emitirTabela(tabela, p.novas) });
    }
  }
  return edicoes;
}

/**
 * Edição da lista de eventos `chave` (seção `## <titulo>`): eventos alterados são regenerados e os
 * novos vão para o fim, com o fim de linha do arquivo. Sem região (seção ausente ou ainda sem lista),
 * só uma lista vazia é aceita: acrescentar o primeiro evento chega na Fase 1B.
 */
export function edicaoDaLista(
  estado: EstadoArquivo,
  chave: string,
  titulo: string,
  registros: readonly object[],
): Edicao | undefined {
  const regiao = estado.regioes.find((r): r is RegiaoLista => r.tipo === 'lista' && r.chave === chave);
  if (regiao === undefined) {
    if (registros.length === 0) return undefined;
    throw new Error(
      `a seção '## ${titulo}' não existe ou ainda não tem lista: acrescentar o primeiro item chega na Fase 1B`,
    );
  }
  const lidos = regiao.lidos.length;
  if (registros.length < lidos) {
    throw new Error(`${ERRO_REMOCAO}: '${chave}' tem ${lidos} itens lidos e ${registros.length} a gravar`);
  }
  const itens: ItemEvento[] = regiao.itens.map((item) => ({ ...item }));
  let alterou = false;
  for (const [j, lido] of regiao.lidos.entries()) {
    const registro = registros[j];
    if (!mudou(lido, registro)) continue;
    const evento = validar(Evento, registro, `o item ${j + 1} de '${chave}'`);
    const k = regiao.indices[j];
    const item = k === undefined ? undefined : itens[k];
    if (k === undefined || item === undefined) throw new Error(`estado inconsistente em '${chave}'`);
    itens[k] = { ...item, data: evento.data, tipo: evento.tipo, texto: evento.texto, modificada: true };
    alterou = true;
  }
  const novos = registros
    .slice(lidos)
    .map((registro, j) => validar(Evento, registro, `o item ${lidos + j + 1} de '${chave}'`));
  if (!alterou && novos.length === 0) return undefined;
  return {
    inicio: regiao.faixa.inicio,
    fim: regiao.faixa.fim,
    texto: emitirListaEventos(itens, regiao.opacas, novos, estado.eol),
  };
}

/**
 * Edição do frontmatter: só as chaves que mudaram em relação ao lido são trocadas, num clone do
 * `YAML.Document` (comentários, ordem, chaves desconhecidas e estilo das demais preservados); sem
 * chave mudada → `undefined` e o bloco não é tocado. Lança se o frontmatter não deu modelo na
 * leitura (YAML inválido, campo obrigatório inválido, ausente) ou se o novo não passa no schema.
 */
export function edicaoDoFrontmatter(estado: EstadoArquivo, novo: object, schema: z.ZodType): Edicao | undefined {
  const frontmatter = estado.frontmatter;
  const lido = frontmatter?.lido;
  if (frontmatter === undefined || lido === undefined) {
    throw new Error('o frontmatter não foi lido (veja os problemas da leitura): corrija-o à mão antes de gravar');
  }
  const mudadas = Object.keys(lido).filter((chave) => !iguais(lido[chave], campoDe(novo, chave)));
  if (mudadas.length === 0) return undefined;
  const valido = validarObjeto(schema, novo, 'o frontmatter');
  const documento = frontmatter.documento.clone();
  for (const chave of mudadas) definirChave(documento, chave, valido[chave]);
  return escreverFrontmatter(estado.fonte, frontmatter.faixa, documento, true);
}


/**
 * Troca o valor de uma chave de primeiro nível preservando o que der do nó atual: escalar mantém o
 * estilo de aspas, lista mantém o fluxo (`[a, b]`) e o estilo dos itens, e os comentários do nó são
 * levados para o nó novo quando o tipo muda (`null` → lista). Data ISO nova vai entre aspas (para
 * continuar texto em qualquer leitor YAML); o `yaml` põe aspas sozinho no texto que seria lido como
 * outro tipo (`"985112000123456"`, `"true"`).
 */
export function definirChave(documento: Document, chave: string, valor: unknown): void {
  const atual = documento.get(chave, true);
  if ((typeof valor === 'string' || typeof valor === 'number') && isScalar(atual) && atual.value !== null) {
    atual.value = valor;
    const semAspas = atual.type === undefined || atual.type === Scalar.PLAIN;
    if (typeof valor === 'string' && FORMATO_DATA.test(valor) && semAspas) atual.type = Scalar.QUOTE_DOUBLE;
    return;
  }
  if (Array.isArray(valor) && isSeq(atual)) {
    const estilo = atual.items.find(isScalar)?.type;
    atual.items = valor.map((item: unknown) => {
      const escalar = new Scalar(item);
      if (estilo !== undefined) escalar.type = estilo;
      return escalar;
    });
    return;
  }
  let novo: Node;
  if (Array.isArray(valor)) {
    const lista = new YAMLSeq();
    lista.flow = true;
    lista.items = valor.map((item: unknown) => new Scalar(item));
    novo = lista;
  } else {
    const escalar = new Scalar(valor);
    if (typeof valor === 'string' && FORMATO_DATA.test(valor)) escalar.type = Scalar.QUOTE_DOUBLE;
    novo = escalar;
  }
  if (isNode(atual)) {
    novo.comment = atual.comment;
    novo.commentBefore = atual.commentBefore;
    novo.spaceBefore = atual.spaceBefore;
  }
  documento.set(chave, novo);
}

/**
 * Motor de leitura dos codecs Markdown: prepara a fonte (BOM, fim de linha, CR solto), acha as
 * regiões gerenciadas, valida cada linha com o schema e junta problemas, opacas e o `EstadoArquivo`.
 * Nunca lança por conteúdo: o que não se encaixa vira `Problema` e a linha fica crua na fonte.
 */
import { type Document, isMap, isScalar } from 'yaml';
import type { z } from 'zod';
import { Evento } from '../../schema/evento.js';
import { type Documento, parseDocumento, type Secao } from '../documento.js';
import { ErroFrontmatter, inicioDoYaml, lerFrontmatter } from '../frontmatter.js';
import { parseListaEventos } from '../lista.js';
import type { CodigoProblema, Problema } from '../problema.js';
import { contarLinhas, type LinhaOpaca, parseTabela } from '../tabela.js';
import { detectarEol, linhaDoOffset, normalizarCabecalho, removerBom } from '../texto.js';
import type { EstadoArquivo, FrontmatterLido, Opaca, Regiao, RegistroLido, ResultadoLeitura } from './estado.js';
import {
  descreverIssue,
  ehFaixaObrigatoria,
  ehObjeto,
  type IssueZod,
  type SpecTabela,
  valorEm,
} from './validacao.js';

export const MENSAGEM_BOM =
  'o arquivo começa com BOM (U+FEFF): é ignorado na leitura e removido na próxima gravação';

/** Linha da chave de primeiro nível `chave` num YAML que começa no offset `inicioYaml` de `fonte`. */
export function linhaDaChave(
  documento: Document,
  fonte: string,
  inicioYaml: number,
  chave: string,
): number | undefined {
  const mapa = documento.contents;
  if (!isMap(mapa)) return undefined;
  for (const par of mapa.items) {
    if (isScalar(par.key) && par.key.value === chave && par.key.range) {
      return linhaDoOffset(fonte, inicioYaml + par.key.range[0]);
    }
  }
  return undefined;
}

/** Linha da chave de primeiro nível `chave` do frontmatter de um arquivo já lido, se ele a tem. */
export function linhaDaChaveNoFrontmatter(estado: EstadoArquivo, chave: string): number | undefined {
  const frontmatter = estado.frontmatter;
  if (frontmatter === undefined) return undefined;
  const inicioYaml = inicioDoYaml(estado.fonte, frontmatter.faixa.inicio);
  return linhaDaChave(frontmatter.documento, estado.fonte, inicioYaml, chave);
}

/** Rótulo dos campos do evento nas mensagens. */
const ROTULO_EVENTO: Readonly<Record<string, string>> = { data: 'a data', tipo: 'o [tipo]', texto: 'o texto' };

/** Acumula a leitura de um arquivo Markdown; cada codec chama as regiões dele e depois `resultado`. */
export class Leitura {
  readonly arquivo: string;
  /** Texto sem o BOM. */
  readonly fonte: string;
  readonly documento: Documento;
  /** `false` quando a fonte tem CR solto: nada é analisado e só o problema `cr_solto` sai. */
  readonly legivel: boolean;
  private readonly tinhaBom: boolean;
  private readonly eol: '\n' | '\r\n';
  private readonly problemas: Problema[] = [];
  private readonly opacas: Opaca[] = [];
  private readonly regioes: Regiao[] = [];
  /** Títulos canônicos já procurados (normalizados): a duplicata de cada um é apontada uma vez só. */
  private readonly procuradas = new Set<string>();
  private frontmatterLido: FrontmatterLido | undefined;

  constructor(fonteBruta: string, arquivo: string) {
    const { texto, tinhaBom } = removerBom(fonteBruta);
    this.arquivo = arquivo;
    this.fonte = texto;
    this.tinhaBom = tinhaBom;
    this.eol = detectarEol(texto) === 'CRLF' ? '\r\n' : '\n';
    if (tinhaBom) this.problema('bom', MENSAGEM_BOM, 1);
    const crSolto = texto.search(/\r(?!\n)/);
    this.legivel = crSolto === -1;
    if (this.legivel) {
      this.documento = parseDocumento(texto);
    } else {
      // O remark leria o CR como quebra de linha e as faixas não bateriam com as linhas do resto do
      // `format/`: o arquivo fica sem análise até o fim de linha ser corrigido.
      this.documento = { secoes: [] };
      this.problema(
        'cr_solto',
        'há um CR solto (\\r sem \\n): converta os fins de linha para LF ou CRLF; o arquivo não foi lido',
        linhaDoOffset(texto, crSolto),
      );
    }
  }

  problema(codigo: CodigoProblema, mensagem: string, linha?: number): void {
    const { arquivo } = this;
    this.problemas.push(linha === undefined ? { arquivo, codigo, mensagem } : { arquivo, linha, codigo, mensagem });
  }

  /** Lista a opaca para o `doctor`; as `vazia` são ignoradas na leitura. `primeira` = linha do trecho 0. */
  private opaca(primeira: number, opaca: LinhaOpaca): void {
    if (opaca.motivo !== 'vazia') {
      this.opacas.push({ arquivo: this.arquivo, linha: primeira + opaca.indice, motivo: opaca.motivo });
    }
  }

  linhaDe(offset: number): number {
    return linhaDoOffset(this.fonte, offset);
  }

  /**
   * Primeira seção `##` com o título canônico dado (comparação de `normalizarCabecalho`). Cada
   * repetição do mesmo título vira `secao_duplicada` na linha do cabeçalho dela: só a primeira é a
   * região gerenciada, e as linhas das outras não entram no modelo (ficam intactas na fonte).
   */
  secao(titulo: string): Secao | undefined {
    const procurado = normalizarCabecalho(titulo);
    const [primeira, ...repetidas] = this.documento.secoes.filter(
      (s) => s.nivel === 2 && s.tituloNormalizado === procurado,
    );
    if (!this.procuradas.has(procurado)) {
      this.procuradas.add(procurado);
      repetidas.forEach((repetida, i) => {
        const mensagem =
          `a seção '## ${titulo}' aparece de novo (repetição ${i + 2}); só a primeira é lida: ` +
          'junte as linhas nela e apague o título repetido';
        this.problema('secao_duplicada', mensagem, this.linhaDe(repetida.inicio));
      });
    }
    return primeira;
  }

  /**
   * Região canônica `## <spec.secao>`: ausente → `secao_ausente` e lista vazia; presente sem nenhuma
   * linha que comece com `|` → `secao_ausente` na linha do cabeçalho; presente com linhas `|` que o
   * GFM não reconhece como tabela (sem a linha `|---|`, ou com ela de outro tamanho) →
   * `tabela_nao_reconhecida` na linha do cabeçalho. Seção `opcional` (`## Antiparasitários`, só de
   * animais): ausente, ou sem linha `|`, não é problema (lista vazia); com linhas `|` não reconhecidas
   * é `tabela_nao_reconhecida` como numa seção obrigatória, para os registros não sumirem em silêncio.
   */
  regiao<E extends object>(spec: SpecTabela<E>, opcional = false): E[] {
    const titulo = spec.secao ?? '';
    if (!this.legivel) return [];
    const secao = this.secao(titulo);
    if (secao === undefined) {
      if (!opcional) this.problema('secao_ausente', `falta a seção '## ${titulo}'`);
      return [];
    }
    if (secao.tabela === undefined) {
      const tentouTabela = this.temLinhaDeTabela(secao);
      const linha = this.linhaDe(secao.inicio);
      if (tentouTabela) {
        const mensagem =
          `a seção '## ${titulo}' tem linhas com '|', mas a tabela não foi reconhecida ` +
          '(confira o cabeçalho e a linha |---| logo abaixo dele)';
        this.problema('tabela_nao_reconhecida', mensagem, linha);
      } else if (!opcional) {
        this.problema('secao_ausente', `a seção '## ${titulo}' não tem a tabela`, linha);
      }
      return [];
    }
    return this.tabela(secao, spec, `de '## ${titulo}'`);
  }

  /** `true` se alguma linha da seção, depois de aparada, começa com `|` (uma tentativa de tabela). */
  private temLinhaDeTabela(secao: Secao): boolean {
    return this.fonte
      .slice(secao.inicio, secao.fim)
      .split('\n')
      .some((linha) => linha.trim().startsWith('|'));
  }

  /**
   * Lê a tabela da seção. Cabeçalho ou delimitador fora do formato → `cabecalho_invalido` e a tabela
   * inteira é ignorada (nada dela entra no modelo nem pode ser regravado). Linha que não passa no
   * schema → `linha_invalida`/`faixa_obrigatoria` com a linha, e ela fica fora do modelo (crua na
   * fonte, nunca regenerada). `descricao` completa as mensagens: "a tabela <descricao>".
   */
  tabela<E extends object>(secao: Secao, spec: SpecTabela<E>, descricao: string): E[] {
    const faixa = secao.tabela;
    if (faixa === undefined) return [];
    const trecho = this.fonte.slice(faixa.inicio, faixa.fim);
    const { tabela, problemas } = parseTabela(
      trecho,
      spec.colunas.map((c) => c.titulo),
    );
    const primeira = this.linhaDe(faixa.inicio);
    if (problemas.length > 0) {
      const motivo = problemas.join('; ');
      const mensagem = `a tabela ${descricao} não segue o formato (${motivo}); ignorada até ser corrigida à mão`;
      this.problema('cabecalho_invalido', mensagem, primeira);
      return [];
    }

    const indicesOpacos = new Set(tabela.opacas.map((o) => o.indice));
    for (const opaca of tabela.opacas) this.opaca(primeira, opaca);
    // Linha do arquivo de cada linha de dados: as posições do trecho, depois do delimitador, que não são opacas.
    const linhasDosDados: number[] = [];
    for (let i = 2; i < contarLinhas(trecho); i++) if (!indicesOpacos.has(i)) linhasDosDados.push(primeira + i);

    const rotulo = (campo: string): string => {
      if (campo === spec.campoDoTitulo) return 'o título da seção';
      const coluna = spec.colunas.find((c) => c.campo === campo);
      return coluna === undefined ? `o campo '${campo}'` : `coluna '${coluna.titulo}'`;
    };
    const registros: E[] = [];
    const indices: number[] = [];
    const lidos: RegistroLido[] = [];
    tabela.linhas.forEach((linha, k) => {
      const entrada: Record<string, unknown> = {};
      spec.colunas.forEach((coluna, i) => {
        entrada[coluna.campo] = linha.celulas[i] ?? '';
      });
      if (spec.campoDoTitulo !== undefined) entrada[spec.campoDoTitulo] = secao.titulo;
      const registro = this.validar(spec.schema, entrada, linhasDosDados[k], `linha da tabela ${descricao}`, rotulo);
      if (registro === undefined) return;
      registros.push(registro);
      indices.push(k);
      lidos.push(copia(registro));
    });
    this.regioes.push({ tipo: 'tabela', chave: spec.chave, titulo: secao.titulo, faixa, tabela, indices, lidos });
    return registros;
  }

  /**
   * Lista de eventos da seção `## <titulo>`. Seção ausente → `secao_ausente`; seção sem lista (o
   * modelo novo) → nenhum evento, sem problema. Linha em branco (opaca `vazia`) é ignorada; item fora
   * da gramática vai para `opacas`; item que não passa no schema → `linha_invalida`.
   */
  lista(titulo: string, chave: string): Evento[] {
    if (!this.legivel) return [];
    const secao = this.secao(titulo);
    if (secao === undefined) {
      this.problema('secao_ausente', `falta a seção '## ${titulo}'`);
      return [];
    }
    const faixa = secao.lista;
    if (faixa === undefined) return [];
    const trecho = this.fonte.slice(faixa.inicio, faixa.fim);
    const { itens, opacas } = parseListaEventos(trecho);
    const primeira = this.linhaDe(faixa.inicio);
    for (const opaca of opacas) this.opaca(primeira, opaca);

    const indicesOpacos = new Set(opacas.map((o) => o.indice));
    const eventos: Evento[] = [];
    const indices: number[] = [];
    const lidos: RegistroLido[] = [];
    let posicao = 0; // linha do trecho onde começa o próximo item
    itens.forEach((item, k) => {
      while (indicesOpacos.has(posicao)) posicao++;
      const linha = primeira + posicao;
      posicao += contarLinhas(item.raw);
      const entrada = { data: item.data, tipo: item.tipo, texto: item.texto };
      const evento = this.validar(Evento, entrada, linha, `item de '## ${titulo}'`, (c) => ROTULO_EVENTO[c] ?? c);
      if (evento === undefined) return;
      eventos.push(evento);
      indices.push(k);
      lidos.push(copia(evento));
    });
    this.regioes.push({ tipo: 'lista', chave, titulo: secao.titulo, faixa, itens, opacas, indices, lidos });
    return eventos;
  }

  /**
   * Frontmatter validado com `schema`. Sem frontmatter → `frontmatter_ausente`; YAML inválido →
   * `yaml_invalido` com a linha. Campo inválido → `id_invalido` (no `id`) ou `linha_invalida`, na
   * linha da chave; se for um dos `obrigatorios`, não há modelo (`undefined`); senão o campo vale o
   * padrão do schema e o resto é lido. Chaves desconhecidas e comentários ficam no `YAML.Document`.
   */
  frontmatter<E extends object>(schema: z.ZodType<E>, obrigatorios: readonly string[]): E | undefined {
    if (!this.legivel) return undefined;
    if (this.documento.frontmatter === undefined) {
      this.problema('frontmatter_ausente', 'falta o frontmatter (o bloco --- no início do arquivo)', 1);
      return undefined;
    }
    let lido: { documento: Document; faixa: { inicio: number; fim: number } } | undefined;
    try {
      lido = lerFrontmatter(this.documento, this.fonte);
    } catch (erro) {
      if (!(erro instanceof ErroFrontmatter)) throw erro;
      // A mensagem do `yaml` (em inglês) fica de fora: pode citar o conteúdo.
      const mensagem = `o frontmatter tem YAML inválido na linha ${erro.linha}; corrija à mão`;
      this.problema('yaml_invalido', mensagem, erro.linha);
      return undefined;
    }
    if (lido === undefined) return undefined;
    const { documento, faixa } = lido;
    const conteudo = documento.contents;
    if (conteudo !== null && !isMap(conteudo)) {
      const mensagem = 'o frontmatter deve ser um mapa de chaves (chave: valor)';
      this.problema('yaml_invalido', mensagem, this.linhaDe(faixa.inicio));
      return undefined;
    }
    const estado: FrontmatterLido = { documento, faixa };
    this.frontmatterLido = estado;

    let valor: unknown;
    try {
      valor = documento.toJS();
    } catch (erro) {
      // `toJS` lança `ReferenceError` para alias sem âncora ou em excesso, que o `parseDocument` não
      // aponta como erro. É conteúdo do arquivo: vira problema, e o texto do erro (que cita o alias) fica
      // de fora. Qualquer outro `Error` da conversão também é do conteúdo, mas sem motivo conhecido:
      // a mensagem não o inventa. O que não é `Error` não é nosso para engolir.
      if (!(erro instanceof Error)) throw erro;
      this.problema(
        'yaml_invalido',
        erro instanceof ReferenceError
          ? 'o frontmatter usa um alias (*nome) sem âncora, ou alias demais; corrija à mão'
          : 'o YAML do frontmatter não pôde ser convertido; corrija à mão',
        this.linhaDe(faixa.inicio),
      );
      return undefined;
    }
    const entrada = ehObjeto(valor) ? valor : {};
    const r = schema.safeParse(entrada);
    if (r.success) {
      estado.lido = copia(r.data);
      return r.data;
    }
    const inicioYaml = inicioDoYaml(this.fonte, faixa.inicio);
    const invalidas = new Set<string>();
    for (const issue of r.error.issues) {
      const chave = String(issue.path[0] ?? '');
      invalidas.add(chave);
      this.problema(
        chave === 'id' ? 'id_invalido' : 'linha_invalida',
        `campo '${chave}' do frontmatter: ${descreverIssue(issue, valorEm(entrada, issue.path))}`,
        linhaDaChave(documento, this.fonte, inicioYaml, chave) ?? this.linhaDe(faixa.inicio),
      );
    }
    if (obrigatorios.some((c) => invalidas.has(c))) return undefined;
    const semInvalidas = Object.fromEntries(Object.entries(entrada).filter(([chave]) => !invalidas.has(chave)));
    const r2 = schema.safeParse(semInvalidas);
    if (!r2.success) return undefined;
    estado.lido = copia(r2.data);
    return r2.data;
  }

  resultado<T>(dados: T): ResultadoLeitura<T> {
    const porLinha = (a: { linha?: number }, b: { linha?: number }) => (a.linha ?? 0) - (b.linha ?? 0);
    const estado = {
      arquivo: this.arquivo,
      fonte: this.fonte,
      tinhaBom: this.tinhaBom,
      eol: this.eol,
      documento: this.documento,
      regioes: this.regioes,
      ...(this.frontmatterLido === undefined ? {} : { frontmatter: this.frontmatterLido }),
    };
    return {
      dados,
      problemas: [...this.problemas].sort(porLinha),
      opacas: [...this.opacas].sort(porLinha),
      estado,
    };
  }

  /**
   * `schema.safeParse(entrada)`; se falhar, registra os problemas da linha (a issue de faixa vira
   * `faixa_obrigatoria`, as outras juntas viram `linha_invalida`) e devolve `undefined`.
   */
  private validar<E>(
    schema: z.ZodType<E>,
    entrada: Readonly<Record<string, unknown>>,
    linha: number | undefined,
    onde: string,
    rotulo: (campo: string) => string,
  ): E | undefined {
    const r = schema.safeParse(entrada);
    if (r.success) return r.data;
    const parte = (issue: IssueZod): string =>
      `${rotulo(String(issue.path[0] ?? ''))}: ${descreverIssue(issue, valorEm(entrada, issue.path))}`;
    const daFaixa = r.error.issues.filter(ehFaixaObrigatoria);
    const outras = r.error.issues.filter((issue) => !ehFaixaObrigatoria(issue));
    if (daFaixa.length > 0) this.problema('faixa_obrigatoria', `${onde}: ${daFaixa.map(parte).join('; ')}`, linha);
    if (outras.length > 0) this.problema('linha_invalida', `${onde}: ${outras.map(parte).join('; ')}`, linha);
    return undefined;
  }
}

/** Cópia profunda do registro lido, guardada no estado (quem chama pode alterar o modelo à vontade). */
function copia(registro: object): RegistroLido {
  return structuredClone({ ...registro });
}

import { parseArgs } from 'node:util';

/** Uma opção de linha de comando: `boolean` (só presença) ou `string` (leva um valor). */
export type EspecOpcao = { tipo: 'boolean' | 'string'; curto?: string };

/** Um comando do CLI: nome, apelidos, posicionais (na ordem) e as opções que ele declara. */
export type EspecComando = {
  nome: string;
  aliases?: string[];
  posicionais: { nome: string; obrigatorio: boolean }[];
  opcoes: Record<string, EspecOpcao>;
};

export type ErroDeArgumentos = {
  tipo: 'opcao_desconhecida' | 'valor_faltando' | 'comando_desconhecido' | 'posicional_faltando';
  /**
   * `opcao_desconhecida`: as opções, separadas por vírgula; `valor_faltando`: a opção (`--cofre`);
   * `comando_desconhecido`: o texto digitado; `posicional_faltando`: o nome do argumento.
   */
  detalhe: string;
};

export type Argumentos = {
  /** Nome oficial do comando (um alias vira o nome do comando a que pertence). */
  comando?: string;
  /** Posicionais depois do comando, na ordem em que vieram. */
  posicionais: string[];
  /** Opções por nome longo, sem os hífens: `string` para as que levam valor, `true` para as demais. */
  opcoes: Record<string, string | boolean>;
  erro?: ErroDeArgumentos;
};

/** Opções que valem em qualquer comando. */
const OPCOES_GLOBAIS: Record<string, EspecOpcao> = {
  version: { tipo: 'boolean', curto: 'v' },
  help: { tipo: 'boolean', curto: 'h' },
};

/**
 * Globais ∪ opções de todos os comandos: uma opção de outro comando é aceita (e ignorada). A mesma opção
 * em dois lugares tem de ter o mesmo `tipo` e o mesmo `curto`: se não, é erro de programação (lança).
 */
function opcoesConhecidas(specs: ReadonlyArray<EspecComando>): Record<string, EspecOpcao> {
  const todas: Record<string, EspecOpcao> = { ...OPCOES_GLOBAIS };
  for (const spec of specs) {
    for (const [nome, opcao] of Object.entries(spec.opcoes)) {
      const existente = Object.hasOwn(todas, nome) ? todas[nome] : undefined;
      if (existente === undefined) {
        todas[nome] = opcao;
      } else if (existente.tipo !== opcao.tipo || existente.curto !== opcao.curto) {
        throw new Error(`Registro de comandos inconsistente: --${nome} declarada com tipo ou forma curta diferente em '${spec.nome}'`);
      }
    }
  }
  return todas;
}

/** Lança se o registro declara a mesma opção com `tipo` ou `curto` diferentes (chamar ao montar o registro). */
export function validarRegistro(specs: ReadonlyArray<EspecComando>): void {
  opcoesConhecidas(specs);
}

/** Parece o início de outra opção (e não um valor)? `-` sozinho é valor, como em qualquer CLI. */
function pareceOpcao(arg: string): boolean {
  return arg.startsWith('-') && arg !== '-';
}

type Varredura = {
  /** `argv` com cada opção de valor sem valor trocada por `--nome=` (o `parseArgs` não a engole). */
  args: string[];
  desconhecidas: string[];
};

/**
 * Lê `argv` de ponta a ponta antes do `parseArgs`: acha TODAS as opções desconhecidas (o `parseArgs`
 * estrito só acusa a primeira, e uma opção de valor engoliria a seguinte) e marca as de valor sem
 * valor. Valem as mesmas regras de antes: uma opção é o argumento inteiro (`--nome`, `--nome=valor` ou
 * `-x` com `curto` declarado); depois de `--` tudo é posicional.
 */
function varrer(argv: ReadonlyArray<string>, opcoes: Record<string, EspecOpcao>): Varredura {
  const porCurto = new Map<string, string>();
  for (const [nome, opcao] of Object.entries(opcoes)) {
    if (opcao.curto !== undefined) porCurto.set(opcao.curto, nome);
  }
  const args: string[] = [];
  const desconhecidas = new Set<string>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';
    if (arg === '--') {
      args.push(...argv.slice(i));
      break;
    }
    if (!pareceOpcao(arg)) {
      args.push(arg);
      continue;
    }
    const comValor = arg.includes('=') && arg.startsWith('--');
    const bruto = comValor ? arg.slice(0, arg.indexOf('=')) : arg;
    const nome = bruto.startsWith('--') ? bruto.slice(2) : arg.length === 2 ? porCurto.get(arg.slice(1)) : undefined;
    const opcao = nome === undefined ? undefined : Object.hasOwn(opcoes, nome) ? opcoes[nome] : undefined;
    if (nome === undefined || opcao === undefined) {
      desconhecidas.add(arg);
      continue;
    }
    if (opcao.tipo === 'boolean') {
      // `--force=false` não é válido para quem não leva valor (e não pode virar `--force`): é desconhecida, como antes.
      if (comValor) desconhecidas.add(arg);
      else args.push(`--${nome}`);
      continue;
    }
    if (comValor) {
      args.push(arg);
      continue;
    }
    const proximo = argv[i + 1];
    if (proximo === undefined || pareceOpcao(proximo)) {
      args.push(`--${nome}=`); // valor vazio: vira `valor_faltando` adiante; o próximo argumento segue sozinho
    } else {
      args.push(`--${nome}=${proximo}`);
      i++;
    }
  }
  return { args, desconhecidas: [...desconhecidas] };
}

function resolverComando(texto: string, specs: ReadonlyArray<EspecComando>): EspecComando | undefined {
  return specs.find((s) => s.nome === texto || s.aliases?.includes(texto) === true);
}

/**
 * Interpreta `argv` (sem `node` e o script) contra o registro de comandos. Opções valem em qualquer
 * posição; o 1º posicional é o comando e os seguintes são os argumentos dele. Só devolve `erro` pela
 * ordem: opção desconhecida > valor ausente > (`--version`, `--help` ou sem comando: nenhum erro, quem
 * chama mostra a versão ou a ajuda) > comando desconhecido > posicional obrigatório ausente.
 */
export function parseArgumentos(argv: ReadonlyArray<string>, specs: ReadonlyArray<EspecComando>): Argumentos {
  const conhecidas = opcoesConhecidas(specs);
  const { args, desconhecidas } = varrer(argv, conhecidas);
  if (desconhecidas.length > 0) {
    return { posicionais: [], opcoes: {}, erro: { tipo: 'opcao_desconhecida', detalhe: desconhecidas.join(', ') } };
  }

  // Depois da varredura os argumentos são válidos: cada opção é conhecida e as de valor trazem `=`.
  const { values, positionals } = parseArgs({
    args,
    options: Object.fromEntries(
      Object.entries(conhecidas).map(([nome, { tipo }]) => [nome, { type: tipo }] as const),
    ),
    strict: true,
    allowPositionals: true,
  });
  const opcoes: Record<string, string | boolean> = {};
  for (const [nome, valor] of Object.entries(values)) {
    if (valor === undefined || Array.isArray(valor)) continue;
    opcoes[nome] = valor;
  }

  const semValor = Object.entries(opcoes).find(([, valor]) => valor === '');
  if (semValor !== undefined) {
    return { posicionais: positionals, opcoes, erro: { tipo: 'valor_faltando', detalhe: `--${semValor[0]}` } };
  }

  const [texto, ...posicionais] = positionals;
  const spec = texto === undefined ? undefined : resolverComando(texto, specs);
  const resultado: Argumentos = { comando: spec?.nome ?? texto, posicionais, opcoes };
  if (texto === undefined || opcoes.version === true || opcoes.help === true) return resultado;

  if (spec === undefined) {
    return { ...resultado, erro: { tipo: 'comando_desconhecido', detalhe: texto } };
  }
  const faltando = spec.posicionais.find((p, indice) => p.obrigatorio && posicionais[indice] === undefined);
  if (faltando !== undefined) {
    return { ...resultado, erro: { tipo: 'posicional_faltando', detalhe: faltando.nome } };
  }
  return resultado;
}

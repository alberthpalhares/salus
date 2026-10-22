import { doctor } from '../core/framework/doctor.js';
import { init } from '../core/framework/init.js';
import { packageVersion } from '../core/framework/manifest.js';
import { update } from '../core/framework/update.js';
import { type EspecComando, parseArgumentos, validarRegistro } from './args.js';
import { especAnonimizar, executarAnonimizar } from './comandos/anonimizar.js';
import { ehConsulta, especsConsultas, executarConsulta } from './comandos/consultas.js';
import { especInspecionar, executarInspecionar } from './comandos/inspecionar.js';
import { helpText } from './help.js';
import { ansi, type Io } from './io.js';

const { reset, red } = ansi;

/**
 * Registro dos comandos: é daqui que vêm os comandos, os posicionais e as opções válidas do CLI
 * (uma opção de outro comando é aceita e ignorada). Um comando novo entra no fim da lista e no despacho de `main`.
 */
export const comandos: EspecComando[] = [
  {
    nome: 'init',
    posicionais: [{ nome: 'pasta', obrigatorio: false }],
    opcoes: { force: { tipo: 'boolean', curto: 'f' } },
    aceitaExtras: true,
  },
  { nome: 'update', posicionais: [{ nome: 'pasta', obrigatorio: false }], opcoes: {}, aceitaExtras: true },
  {
    nome: 'doctor',
    aliases: ['check', 'status'],
    posicionais: [{ nome: 'pasta', obrigatorio: false }],
    opcoes: {},
    aceitaExtras: true,
  },
  ...especsConsultas,
  especInspecionar,
  especAnonimizar,
];

// Opção repetida com tipo ou forma curta diferentes é erro de programação: falha já ao carregar o módulo.
validarRegistro(comandos);

/**
 * Ponto de entrada do CLI: interpreta `argv` (sem `node` e o script) e devolve o código de saída.
 * Opções valem em qualquer posição; o 1º posicional é o comando e os seguintes, os argumentos dele.
 * Ordem: opção desconhecida > valor ausente > `--version` > `--help`/sem comando > comando desconhecido
 * > argumento obrigatório ausente > argumento a mais > comando.
 */
export async function main(
  argv: string[],
  io: Io,
  cwd: string = process.cwd(),
): Promise<number> {
  const { comando, posicionais, opcoes, erro } = parseArgumentos(argv, comandos);
  const version = packageVersion();

  if (erro?.tipo === 'opcao_desconhecida') {
    io.err(`${red}Opção desconhecida:${reset} ${erro.detalhe}`);
    io.out(helpText(version));
    return 1;
  }
  if (erro?.tipo === 'valor_faltando') {
    io.err(`${red}Valor ausente para ${erro.detalhe}${reset}`);
    return 1;
  }
  if (opcoes.version === true) {
    io.out(`v${version}`);
    return 0;
  }
  if (opcoes.help === true || comando === undefined) {
    io.out(helpText(version));
    return 0;
  }
  if (erro?.tipo === 'comando_desconhecido') {
    io.out(`${red}Comando desconhecido:${reset} ${comando}`);
    io.out(helpText(version));
    return 1;
  }
  if (erro?.tipo === 'posicional_faltando') {
    io.err(`${red}Argumento obrigatório ausente:${reset} ${erro.detalhe}`);
    return 1;
  }
  if (erro?.tipo === 'argumento_extra') {
    io.err(`${red}Argumento a mais:${reset} ${erro.detalhe} (use aspas para texto com espaços)`);
    return 1;
  }

  const targetDirName = posicionais[0];
  switch (comando) {
    case 'init':
      try {
        // --force/-f só têm efeito aqui
        const force = opcoes.force === true;
        return await init({ cwd, targetDirName, force, io });
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : String(err);
        io.err(`${red}Erro ao inicializar o Salus:${reset} ${mensagem}`);
        return 1;
      }
    case 'update':
      return update({ cwd, targetDirName, io });
    case 'doctor':
      return doctor({ cwd, targetDirName, io });
    case 'inspecionar':
      return executarInspecionar(posicionais, opcoes, io, cwd);
    case 'anonimizar':
      return executarAnonimizar(posicionais, opcoes, io, cwd);
    default:
      if (ehConsulta(comando)) return executarConsulta(comando, posicionais, opcoes, io, cwd);
      // Está no registro mas não no despacho: erro de programação, não de uso.
      throw new Error(`comando registrado sem despacho: ${comando}`);
  }
}

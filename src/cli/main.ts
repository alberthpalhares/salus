import { doctor } from '../core/framework/doctor.js';
import { init } from '../core/framework/init.js';
import { KNOWN_FLAGS, packageVersion } from '../core/framework/manifest.js';
import { update } from '../core/framework/update.js';
import { helpText } from './help.js';
import { ansi, type Io } from './io.js';

const { reset, red } = ansi;

/**
 * Ponto de entrada do CLI: interpreta `argv` (sem `node` e o script) e devolve o código de saída.
 * Flags valem em qualquer posição; o 1º posicional é o comando e o 2º, a pasta.
 * Ordem: opção desconhecida (erro) > `--version` > `--help`/sem comando > comando.
 */
export async function main(
  argv: string[],
  io: Io,
  cwd: string = process.cwd(),
): Promise<number> {
  const flags = new Set(argv.filter((a) => a.startsWith('-')));
  const unknownFlags = [...flags].filter((f) => !KNOWN_FLAGS.has(f));
  const positional = argv.filter((a) => !a.startsWith('-'));
  const command = positional[0];
  const targetDirName = positional[1];
  const version = packageVersion();

  if (unknownFlags.length > 0) {
    io.err(`${red}Opção desconhecida:${reset} ${unknownFlags.join(', ')}`);
    io.out(helpText(version));
    return 1;
  }
  if (flags.has('--version') || flags.has('-v')) {
    io.out(`v${version}`);
    return 0;
  }
  if (flags.has('--help') || flags.has('-h') || !command) {
    io.out(helpText(version));
    return 0;
  }

  switch (command) {
    case 'init':
      try {
        // --force/-f só têm efeito aqui
        const force = flags.has('--force') || flags.has('-f');
        return await init({ cwd, targetDirName, force, io });
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : String(err);
        io.err(`${red}Erro ao inicializar o Salus:${reset} ${mensagem}`);
        return 1;
      }
    case 'update':
      return update({ cwd, targetDirName, io });
    case 'doctor':
    case 'check':
    case 'status':
      return doctor({ cwd, targetDirName, io });
    default:
      io.out(`${red}Comando desconhecido:${reset} ${command}`);
      io.out(helpText(version));
      return 1;
  }
}

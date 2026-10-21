import * as path from 'node:path';
import { ansi, type Io } from '../../cli/io.js';
import { findInitCollisions, isAlreadyInitialized } from './detect.js';
import { copyItemRecursiveSync, ensureDirSync } from './fs.js';
import { frameworkRoot, INIT_ITEMS, packageVersion } from './manifest.js';

const { reset, bold, cyan, green, yellow, red, dim } = ansi;

/**
 * Copia o framework para a pasta de destino (ou `cwd`) e devolve o código de saída.
 * Cria a pasta de destino antes de checar colisões; havendo colisão sem `force`,
 * só segue com confirmação num terminal interativo.
 */
export async function init(opts: {
  cwd: string;
  targetDirName?: string;
  force: boolean;
  io: Io;
}): Promise<number> {
  const { cwd, targetDirName, force, io } = opts;
  const rootDir = frameworkRoot();
  const version = packageVersion();
  let targetDir = cwd;

  if (targetDirName) {
    targetDir = path.resolve(cwd, targetDirName);
    ensureDirSync(targetDir);
  }

  const alreadyInitialized = isAlreadyInitialized(targetDir);
  const collisions = findInitCollisions(targetDir);

  if ((alreadyInitialized || collisions.length > 0) && !force) {
    if (alreadyInitialized) {
      io.out(`\n${yellow}⚠️  Atenção: Esta pasta já contém um Salus inicializado para uma família!${reset}`);
      io.out(`   Se você apenas quer atualizar as skills e o protocolo clínico sem perder o cérebro atual, use:`);
      io.out(`   ${bold}${cyan}npx salus-ai update${targetDirName ? ' ' + targetDirName : ''}${reset}\n`);
    } else {
      io.out(`\n${yellow}⚠️  Atenção: Esta pasta já contém arquivos que o init sobrescreveria ou mesclaria:${reset}`);
    }
    for (const item of collisions) {
      io.out(`   ${dim}•${reset} ${item}`);
    }
    io.out('');

    if (!io.isTTY) {
      io.out(`${red}✖ Sem terminal interativo para confirmar. Nenhum arquivo foi alterado.${reset}`);
      io.out(`  Use ${bold}--force${reset} para sobrescrever, ou ${bold}npx salus-ai update${reset} para atualizar sem tocar nos perfis.\n`);
      return 1;
    }

    const confirmed = await io.confirm(
      `${yellow}Deseja realmente sobrescrever estes arquivos? (s/N): ${reset}`,
    );
    if (!confirmed) {
      io.out(`\n${dim}Operação cancelada. Nenhum arquivo foi alterado.${reset}\n`);
      return 1;
    }
  }

  io.out(`\n${bold}${cyan}🩺 Inicializando o Salus v${version}...${reset}\n`);

  try {
    for (const item of INIT_ITEMS) {
      copyItemRecursiveSync(path.join(rootDir, item), path.join(targetDir, item));
    }

    // Garantir que as pastas Perfis e _Caixa de Entrada existam
    ensureDirSync(path.join(targetDir, 'Perfis'));
    ensureDirSync(path.join(targetDir, '_Caixa de Entrada'));

    io.out(`${green}✅ Framework Salus copiado com sucesso!${reset}\n`);
    io.out(`${bold}Próximos passos:${reset}`);
    io.out(`  1. Abra esta pasta (${dim}${targetDir}${reset}) no seu assistente de IA (Claude, Gemini, Cursor, Codex, etc.).`);
    io.out(`  2. Diga no chat: ${bold}${yellow}"Quero montar meu Salus"${reset}`);
    io.out(`  3. A IA conduzirá a entrevista de onboarding para criar os perfis da sua família!\n`);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    io.err(`${red}Erro ao inicializar o Salus:${reset} ${mensagem}`);
    return 1;
  }
  return 0;
}

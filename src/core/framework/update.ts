import * as fs from 'node:fs';
import * as path from 'node:path';
import { ansi, type Io } from '../../cli/io.js';
import { looksLikeSalus } from './detect.js';
import { copyItemRecursiveSync, ensureDirSync } from './fs.js';
import { frameworkRoot, packageVersion, UPDATE_ITEMS } from './manifest.js';

const { reset, bold, cyan, green, red, dim } = ansi;

/**
 * Atualiza skills, protocolos e guia de um Salus existente e devolve o código de saída.
 * Nunca toca em `Perfis/`, `Familia/` nem no `AGENTS.md` da família.
 */
export function update(opts: { cwd: string; targetDirName?: string; io: Io }): number {
  const { cwd, targetDirName, io } = opts;
  const rootDir = frameworkRoot();
  const version = packageVersion();
  const targetDir = targetDirName ? path.resolve(cwd, targetDirName) : cwd;

  if (!fs.existsSync(targetDir)) {
    io.err(`${red}Erro: A pasta especificada não existe (${targetDir}).${reset}`);
    return 1;
  }

  if (!looksLikeSalus(targetDir)) {
    io.err(`${red}Erro: Esta pasta não parece conter um Salus (não há AGENTS.md nem .agents/).${reset}`);
    io.err(`  Pasta analisada: ${dim}${targetDir}${reset}`);
    io.err(`  Para criar um Salus novo, use: ${bold}npx salus-ai init [pasta]${reset}\n`);
    return 1;
  }

  io.out(`\n${bold}${cyan}🔄 Atualizando o Salus para a v${version}...${reset}\n`);

  try {
    for (const item of UPDATE_ITEMS) {
      copyItemRecursiveSync(path.join(rootDir, item), path.join(targetDir, item));
      io.out(`  ${green}✔${reset} Atualizado: ${bold}${item}${reset}`);
    }

    // Atualizar o LEIA-ME da Caixa de Entrada sem tocar nos documentos do usuário
    const leiaMeSrc = path.join(rootDir, '_Caixa de Entrada', 'LEIA-ME.md');
    const leiaMeDest = path.join(targetDir, '_Caixa de Entrada', 'LEIA-ME.md');
    if (fs.existsSync(leiaMeSrc)) {
      copyItemRecursiveSync(leiaMeSrc, leiaMeDest);
      io.out(`  ${green}✔${reset} Atualizado: ${bold}_Caixa de Entrada/LEIA-ME.md${reset}`);
    }

    // Garantir diretórios base
    ensureDirSync(path.join(targetDir, 'Perfis'));
    ensureDirSync(path.join(targetDir, '_Caixa de Entrada'));

    io.out(`\n${green}✅ Salus atualizado com sucesso para a v${version}!${reset}`);
    io.out(`${dim}Seus perfis (Perfis/), dados familiares (Familia/) e cérebro (AGENTS.md) foram preservados.${reset}\n`);
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : String(err);
    io.err(`${red}Erro ao atualizar o Salus:${reset} ${mensagem}`);
    return 1;
  }
  return 0;
}

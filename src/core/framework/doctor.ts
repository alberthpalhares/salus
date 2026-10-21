import * as fs from 'node:fs';
import * as path from 'node:path';
import { ansi, type Io } from '../../cli/io.js';
import { isAlreadyInitialized } from './detect.js';
import { packageVersion, PROFILE_REQUIRED_FILES } from './manifest.js';

const { reset, bold, cyan, green, yellow, red, dim } = ansi;

/**
 * Diagnostica a integridade de um Salus e devolve o código de saída:
 * 1 só se a pasta não existe; 0 nos demais casos, mesmo com alertas.
 */
export function doctor(opts: { cwd: string; targetDirName?: string; io: Io }): number {
  const { cwd, targetDirName, io } = opts;
  const version = packageVersion();
  const targetDir = targetDirName ? path.resolve(cwd, targetDirName) : cwd;
  io.out(`\n${bold}${cyan}🩺 Salus Doctor — Diagnóstico de Integridade (v${version})${reset}`);
  io.out(`${dim}Pasta analisada: ${targetDir}${reset}\n`);

  if (!fs.existsSync(targetDir)) {
    io.err(`${red}✖ A pasta especificada não existe.${reset}\n`);
    return 1;
  }

  let warnings = 0;

  // 1. Verificar estrutura base do framework
  const corePaths = [
    '.agents/skills',
    'Frameworks/PROTOCOLO_CLINICO.md',
    '_Caixa de Entrada',
    'Perfis',
    'AGENTS.md',
  ];

  io.out(`${bold}1. Estrutura do Framework:${reset}`);
  for (const rel of corePaths) {
    const full = path.join(targetDir, rel);
    if (fs.existsSync(full)) {
      io.out(`   ${green}✔${reset} ${rel}`);
    } else {
      // update não recria AGENTS.md (é o cérebro da família); só o init o copia
      const hint = rel === 'AGENTS.md'
        ? 'rode "npx salus-ai init" (ele pergunta antes de sobrescrever)'
        : 'rode "npx salus-ai update"';
      io.out(`   ${red}✖${reset} ${rel} ${dim}(ausente — ${hint})${reset}`);
      warnings++;
    }
  }

  // 2. Verificar status de inicialização da família
  io.out(`\n${bold}2. Inicialização da Família:${reset}`);
  const initialized = isAlreadyInitialized(targetDir);
  const indexYaml = path.join(targetDir, 'Familia', '_index.yaml');
  const agendaMd = path.join(targetDir, 'Familia', 'Agenda.md');
  const metaMd = path.join(targetDir, 'Familia', 'META.md');

  if (!initialized) {
    io.out(`   ${yellow}ℹ${reset} O Salus ainda não foi inicializado para uma família nesta pasta.`);
    io.out(`     Abra no seu assistente de IA e diga: ${bold}"Quero montar meu Salus"${reset}`);
  } else {
    io.out(`   ${green}✔${reset} Sistema inicializado (AGENTS.md customizado)`);
    const arquivosDaFamilia: ReadonlyArray<readonly [string, string]> = [
      ['Familia/_index.yaml', indexYaml],
      ['Familia/Agenda.md', agendaMd],
      ['Familia/META.md', metaMd],
    ];
    for (const [label, filePath] of arquivosDaFamilia) {
      if (fs.existsSync(filePath)) {
        io.out(`   ${green}✔${reset} ${label}`);
      } else {
        const hint = filePath === indexYaml
          ? 'peça à IA: "reconstruir o índice do Salus"'
          : 'peça à IA: "revisar salus"';
        io.out(`   ${yellow}⚠${reset} ${label} ${dim}(ausente — ${hint})${reset}`);
        warnings++;
      }
    }
  }

  // 3. Verificar Perfis
  io.out(`\n${bold}3. Perfis Cadastrados:${reset}`);
  const perfisDir = path.join(targetDir, 'Perfis');
  if (fs.existsSync(perfisDir)) {
    const entries = fs.readdirSync(perfisDir).filter((name) => {
      if (name.startsWith('.')) return false;
      return fs.statSync(path.join(perfisDir, name)).isDirectory();
    });

    if (entries.length === 0) {
      io.out(`   ${dim}• Nenhum perfil encontrado em Perfis/${reset}`);
    } else {
      for (const profileName of entries) {
        const pDir = path.join(perfisDir, profileName);
        const missing = PROFILE_REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(pDir, f)));
        if (missing.length === 0) {
          io.out(`   ${green}✔${reset} ${bold}${profileName}${reset} (todos os 5 arquivos base presentes)`);
        } else {
          io.out(`   ${yellow}⚠${reset} ${bold}${profileName}${reset} — faltando: ${missing.join(', ')}`);
          warnings++;
        }
      }
    }
  }

  // 4. Verificar Caixa de Entrada
  io.out(`\n${bold}4. Caixa de Entrada:${reset}`);
  const caixaDir = path.join(targetDir, '_Caixa de Entrada');
  if (fs.existsSync(caixaDir)) {
    const pending = fs.readdirSync(caixaDir).filter(
      (name) => !name.startsWith('.') && name.toLowerCase() !== 'leia-me.md',
    );
    if (pending.length === 0) {
      io.out(`   ${green}✔${reset} Caixa de Entrada limpa (0 documentos aguardando triagem)`);
    } else {
      io.out(`   ${yellow}📄 ${pending.length} documento(s) aguardando triagem:${reset} ${pending.join(', ')}`);
      io.out(`      Diga para a IA: ${bold}"organiza a caixa de entrada"${reset}`);
    }
  }

  io.out('');
  if (warnings === 0) {
    io.out(`${green}✅ Tudo certo com a estrutura do seu Salus!${reset}\n`);
  } else {
    io.out(`${yellow}⚠️  Diagnóstico concluído com ${warnings} alerta(s).${reset}\n`);
  }
  return 0;
}

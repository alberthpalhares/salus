#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Formatadores ANSI para saída visual no terminal
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const dim = '\x1b[2m';

const PKG_PATH = path.join(__dirname, '..', 'package.json');
let VERSION = '0.4.0';
try {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  VERSION = pkg.version || VERSION;
} catch (e) {}

// Allowlist explícita de arquivos/pastas distribuídos pelo framework
const INIT_ITEMS = [
  '.agents',
  'Frameworks',
  '_Caixa de Entrada',
  'COMECE_AQUI.md',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CODEX.md',
  '.cursorrules'
];

// Itens que podem ser atualizados com segurança sem sobrescrever dados ou o cérebro da família
const UPDATE_ITEMS = [
  '.agents',
  'Frameworks',
  'COMECE_AQUI.md'
];

const PROFILE_REQUIRED_FILES = [
  'Ficha.md',
  'Medicamentos.md',
  'Genetica.md',
  'Historico.md',
  'Exames.md'
];

const KNOWN_FLAGS = new Set(['--force', '-f', '--help', '-h', '--version', '-v']);

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('-')));
const unknownFlags = [...flags].filter((f) => !KNOWN_FLAGS.has(f));
const positional = args.filter((a) => !a.startsWith('-'));
const command = positional[0];

function printHelp() {
  console.log(`
${bold}${cyan}🩺 Salus CLI — Central de Inteligência de Saúde da Família${reset} (v${VERSION})

${bold}USO:${reset}
  $ npx salus-ai <comando> [nome-da-pasta] [opções]

${bold}COMANDOS:${reset}
  ${green}init [pasta]${reset}     Inicializa a estrutura do Salus na pasta especificada ou na pasta atual.
  ${green}update [pasta]${reset}   Atualiza skills, protocolos e guia preservando os perfis e o AGENTS.md da família.
  ${green}doctor [pasta]${reset}   Verifica a integridade da estrutura, perfis e pendências na Caixa de Entrada
                   (aliases: ${green}check${reset}, ${green}status${reset}).

${bold}OPÇÕES:${reset}
  ${green}--force, -f${reset}      Sobrescreve sem perguntar os arquivos de inicialização que já existirem (init).
  ${green}--help, -h${reset}       Exibe esta mensagem de ajuda.
  ${green}--version, -v${reset}    Exibe a versão atual do CLI.

${bold}EXEMPLOS:${reset}
  $ npx salus-ai init
  $ npx salus-ai init MinhaSaude
  $ npx salus-ai update
  $ npx salus-ai doctor
`);
}

function printVersion() {
  console.log(`v${VERSION}`);
}

function copyItemRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    for (const childItemName of fs.readdirSync(src)) {
      if (childItemName === '.DS_Store' || childItemName === 'Thumbs.db') continue;
      copyItemRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

function isAlreadyInitialized(targetDir) {
  const indexYaml = path.join(targetDir, 'Familia', '_index.yaml');
  if (fs.existsSync(indexYaml)) return true;

  const agentsMd = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(agentsMd)) {
    try {
      const content = fs.readFileSync(agentsMd, 'utf8');
      if (!content.includes('ainda não foi inicializado')) {
        return true;
      }
    } catch (e) {}
  }
  return false;
}

// Itens de inicialização que já existem na pasta de destino (seriam sobrescritos/mesclados pelo init)
function findInitCollisions(targetDir) {
  return INIT_ITEMS.filter((item) => fs.existsSync(path.join(targetDir, item)));
}

function looksLikeSalus(targetDir) {
  return (
    fs.existsSync(path.join(targetDir, 'AGENTS.md')) ||
    fs.existsSync(path.join(targetDir, '.agents'))
  );
}

function askConfirmation(question) {
  if (!process.stdin.isTTY) {
    return Promise.resolve(false);
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const normalized = (answer || '').trim().toLowerCase();
      resolve(normalized === 's' || normalized === 'sim' || normalized === 'y' || normalized === 'yes');
    });
  });
}

async function init(targetDirName) {
  const rootDir = path.join(__dirname, '..');
  let targetDir = process.cwd();

  if (targetDirName) {
    targetDir = path.resolve(process.cwd(), targetDirName);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  const force = flags.has('--force') || flags.has('-f');
  const alreadyInitialized = isAlreadyInitialized(targetDir);
  const collisions = findInitCollisions(targetDir);

  if ((alreadyInitialized || collisions.length > 0) && !force) {
    if (alreadyInitialized) {
      console.log(`\n${yellow}⚠️  Atenção: Esta pasta já contém um Salus inicializado para uma família!${reset}`);
      console.log(`   Se você apenas quer atualizar as skills e o protocolo clínico sem perder o cérebro atual, use:`);
      console.log(`   ${bold}${cyan}npx salus-ai update${targetDirName ? ' ' + targetDirName : ''}${reset}\n`);
    } else {
      console.log(`\n${yellow}⚠️  Atenção: Esta pasta já contém arquivos que o init sobrescreveria ou mesclaria:${reset}`);
    }
    for (const item of collisions) {
      console.log(`   ${dim}•${reset} ${item}`);
    }
    console.log('');

    if (!process.stdin.isTTY) {
      console.log(`${red}✖ Sem terminal interativo para confirmar. Nenhum arquivo foi alterado.${reset}`);
      console.log(`  Use ${bold}--force${reset} para sobrescrever, ou ${bold}npx salus-ai update${reset} para atualizar sem tocar nos perfis.\n`);
      process.exit(1);
    }

    const confirmed = await askConfirmation(
      `${yellow}Deseja realmente sobrescrever estes arquivos? (s/N): ${reset}`
    );
    if (!confirmed) {
      console.log(`\n${dim}Operação cancelada. Nenhum arquivo foi alterado.${reset}\n`);
      process.exit(1);
    }
  }

  console.log(`\n${bold}${cyan}🩺 Inicializando o Salus v${VERSION}...${reset}\n`);

  try {
    for (const item of INIT_ITEMS) {
      copyItemRecursiveSync(path.join(rootDir, item), path.join(targetDir, item));
    }

    // Garantir que as pastas Perfis e _Caixa de Entrada existam
    const perfisDir = path.join(targetDir, 'Perfis');
    const caixaDir = path.join(targetDir, '_Caixa de Entrada');
    if (!fs.existsSync(perfisDir)) fs.mkdirSync(perfisDir, { recursive: true });
    if (!fs.existsSync(caixaDir)) fs.mkdirSync(caixaDir, { recursive: true });

    console.log(`${green}✅ Framework Salus copiado com sucesso!${reset}\n`);
    console.log(`${bold}Próximos passos:${reset}`);
    console.log(`  1. Abra esta pasta (${dim}${targetDir}${reset}) no seu assistente de IA (Claude, Gemini, Cursor, Codex, etc.).`);
    console.log(`  2. Diga no chat: ${bold}${yellow}"Quero montar meu Salus"${reset}`);
    console.log(`  3. A IA conduzirá a entrevista de onboarding para criar os perfis da sua família!\n`);
  } catch (err) {
    console.error(`${red}Erro ao inicializar o Salus:${reset}`, err.message);
    process.exit(1);
  }
}

function update(targetDirName) {
  const rootDir = path.join(__dirname, '..');
  const targetDir = targetDirName ? path.resolve(process.cwd(), targetDirName) : process.cwd();

  if (!fs.existsSync(targetDir)) {
    console.error(`${red}Erro: A pasta especificada não existe (${targetDir}).${reset}`);
    process.exit(1);
  }

  if (!looksLikeSalus(targetDir)) {
    console.error(`${red}Erro: Esta pasta não parece conter um Salus (não há AGENTS.md nem .agents/).${reset}`);
    console.error(`  Pasta analisada: ${dim}${targetDir}${reset}`);
    console.error(`  Para criar um Salus novo, use: ${bold}npx salus-ai init [pasta]${reset}\n`);
    process.exit(1);
  }

  console.log(`\n${bold}${cyan}🔄 Atualizando o Salus para a v${VERSION}...${reset}\n`);

  try {
    for (const item of UPDATE_ITEMS) {
      copyItemRecursiveSync(path.join(rootDir, item), path.join(targetDir, item));
      console.log(`  ${green}✔${reset} Atualizado: ${bold}${item}${reset}`);
    }

    // Atualizar o LEIA-ME da Caixa de Entrada sem tocar nos documentos do usuário
    const leiaMeSrc = path.join(rootDir, '_Caixa de Entrada', 'LEIA-ME.md');
    const leiaMeDest = path.join(targetDir, '_Caixa de Entrada', 'LEIA-ME.md');
    if (fs.existsSync(leiaMeSrc)) {
      copyItemRecursiveSync(leiaMeSrc, leiaMeDest);
      console.log(`  ${green}✔${reset} Atualizado: ${bold}_Caixa de Entrada/LEIA-ME.md${reset}`);
    }

    // Garantir diretórios base
    const perfisDir = path.join(targetDir, 'Perfis');
    const caixaDir = path.join(targetDir, '_Caixa de Entrada');
    if (!fs.existsSync(perfisDir)) fs.mkdirSync(perfisDir, { recursive: true });
    if (!fs.existsSync(caixaDir)) fs.mkdirSync(caixaDir, { recursive: true });

    console.log(`\n${green}✅ Salus atualizado com sucesso para a v${VERSION}!${reset}`);
    console.log(`${dim}Seus perfis (Perfis/), dados familiares (Familia/) e cérebro (AGENTS.md) foram preservados.${reset}\n`);
  } catch (err) {
    console.error(`${red}Erro ao atualizar o Salus:${reset}`, err.message);
    process.exit(1);
  }
}

function doctor(targetDirName) {
  const targetDir = targetDirName ? path.resolve(process.cwd(), targetDirName) : process.cwd();
  console.log(`\n${bold}${cyan}🩺 Salus Doctor — Diagnóstico de Integridade (v${VERSION})${reset}`);
  console.log(`${dim}Pasta analisada: ${targetDir}${reset}\n`);

  if (!fs.existsSync(targetDir)) {
    console.error(`${red}✖ A pasta especificada não existe.${reset}\n`);
    process.exit(1);
  }

  let warnings = 0;

  // 1. Verificar estrutura base do framework
  const corePaths = [
    '.agents/skills',
    'Frameworks/PROTOCOLO_CLINICO.md',
    '_Caixa de Entrada',
    'Perfis',
    'AGENTS.md'
  ];

  console.log(`${bold}1. Estrutura do Framework:${reset}`);
  for (const rel of corePaths) {
    const full = path.join(targetDir, rel);
    if (fs.existsSync(full)) {
      console.log(`   ${green}✔${reset} ${rel}`);
    } else {
      // update não recria AGENTS.md (é o cérebro da família); só o init o copia
      const hint = rel === 'AGENTS.md'
        ? 'rode "npx salus-ai init" (ele pergunta antes de sobrescrever)'
        : 'rode "npx salus-ai update"';
      console.log(`   ${red}✖${reset} ${rel} ${dim}(ausente — ${hint})${reset}`);
      warnings++;
    }
  }

  // 2. Verificar status de inicialização da família
  console.log(`\n${bold}2. Inicialização da Família:${reset}`);
  const initialized = isAlreadyInitialized(targetDir);
  const indexYaml = path.join(targetDir, 'Familia', '_index.yaml');
  const agendaMd = path.join(targetDir, 'Familia', 'Agenda.md');
  const metaMd = path.join(targetDir, 'Familia', 'META.md');

  if (!initialized) {
    console.log(`   ${yellow}ℹ${reset} O Salus ainda não foi inicializado para uma família nesta pasta.`);
    console.log(`     Abra no seu assistente de IA e diga: ${bold}"Quero montar meu Salus"${reset}`);
  } else {
    console.log(`   ${green}✔${reset} Sistema inicializado (AGENTS.md customizado)`);
    for (const [label, filePath] of [
      ['Familia/_index.yaml', indexYaml],
      ['Familia/Agenda.md', agendaMd],
      ['Familia/META.md', metaMd]
    ]) {
      if (fs.existsSync(filePath)) {
        console.log(`   ${green}✔${reset} ${label}`);
      } else {
        const hint = filePath === indexYaml
          ? 'peça à IA: "reconstruir o índice do Salus"'
          : 'peça à IA: "revisar salus"';
        console.log(`   ${yellow}⚠${reset} ${label} ${dim}(ausente — ${hint})${reset}`);
        warnings++;
      }
    }
  }

  // 3. Verificar Perfis
  console.log(`\n${bold}3. Perfis Cadastrados:${reset}`);
  const perfisDir = path.join(targetDir, 'Perfis');
  if (fs.existsSync(perfisDir)) {
    const entries = fs.readdirSync(perfisDir).filter((name) => {
      if (name.startsWith('.')) return false;
      return fs.statSync(path.join(perfisDir, name)).isDirectory();
    });

    if (entries.length === 0) {
      console.log(`   ${dim}• Nenhum perfil encontrado em Perfis/${reset}`);
    } else {
      for (const profileName of entries) {
        const pDir = path.join(perfisDir, profileName);
        const missing = PROFILE_REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(pDir, f)));
        if (missing.length === 0) {
          console.log(`   ${green}✔${reset} ${bold}${profileName}${reset} (todos os 5 arquivos base presentes)`);
        } else {
          console.log(`   ${yellow}⚠${reset} ${bold}${profileName}${reset} — faltando: ${missing.join(', ')}`);
          warnings++;
        }
      }
    }
  }

  // 4. Verificar Caixa de Entrada
  console.log(`\n${bold}4. Caixa de Entrada:${reset}`);
  const caixaDir = path.join(targetDir, '_Caixa de Entrada');
  if (fs.existsSync(caixaDir)) {
    const pending = fs.readdirSync(caixaDir).filter(
      (name) => !name.startsWith('.') && name.toLowerCase() !== 'leia-me.md'
    );
    if (pending.length === 0) {
      console.log(`   ${green}✔${reset} Caixa de Entrada limpa (0 documentos aguardando triagem)`);
    } else {
      console.log(`   ${yellow}📄 ${pending.length} documento(s) aguardando triagem:${reset} ${pending.join(', ')}`);
      console.log(`      Diga para a IA: ${bold}"organiza a caixa de entrada"${reset}`);
    }
  }

  console.log('');
  if (warnings === 0) {
    console.log(`${green}✅ Tudo certo com a estrutura do seu Salus!${reset}\n`);
  } else {
    console.log(`${yellow}⚠️  Diagnóstico concluído com ${warnings} alerta(s).${reset}\n`);
  }
}

if (unknownFlags.length > 0) {
  console.error(`${red}Opção desconhecida:${reset} ${unknownFlags.join(', ')}`);
  printHelp();
  process.exit(1);
} else if (flags.has('--version') || flags.has('-v')) {
  printVersion();
} else if (flags.has('--help') || flags.has('-h') || !command) {
  printHelp();
} else if (command === 'init') {
  init(positional[1]).catch((err) => {
    console.error(`${red}Erro ao inicializar o Salus:${reset}`, err.message);
    process.exit(1);
  });
} else if (command === 'update') {
  update(positional[1]);
} else if (command === 'doctor' || command === 'check' || command === 'status') {
  doctor(positional[1]);
} else {
  console.log(`${red}Comando desconhecido:${reset} ${command}`);
  printHelp();
  process.exit(1);
}

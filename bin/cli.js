#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Formatadores ANSI para saida visual no terminal
const reset = '\x1b[0m';
const bold = '\x1b[1m';
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const dim = '\x1b[2m';

const PKG_PATH = path.join(__dirname, '..', 'package.json');
let VERSION = '0.2.0';
try {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  VERSION = pkg.version || VERSION;
} catch (e) {}

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
${bold}${cyan}🩺 Salus CLI — Central de Inteligencia de Saude da Familia${reset} (v${VERSION})

${bold}USO:${reset}
  $ npx salus-ai init [nome-da-pasta]
  $ npx salus init [nome-da-pasta]

${bold}COMANDOS:${reset}
  ${green}init [pasta]${reset}   Inicializa a estrutura do Salus na pasta especificada ou na pasta atual.
  ${green}--help, -h${reset}     Exibe esta mensagem de ajuda.
  ${green}--version, -v${reset}  Exibe a versao atual do CLI.

${bold}EXEMPLOS:${reset}
  $ npx salus-ai init
  $ npx salus-ai init MinhaSaude
  $ npx salus init "Saude da Familia"
`);
}

function printVersion() {
  console.log(`v${VERSION}`);
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  // Ignorar pastas/arquivos de desenvolvimento
  const baseName = path.basename(src);
  if (
    baseName === '.git' ||
    baseName === 'node_modules' ||
    baseName === 'graphify-out' ||
    baseName === 'package.json' ||
    baseName === 'package-lock.json' ||
    baseName === 'bin' ||
    baseName === 'README.md' ||
    baseName === 'CHANGELOG.md' ||
    baseName === 'LICENSE'
  ) {
    return;
  }

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
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

  console.log(`\n${bold}${cyan}🩺 Inicializando o Salus v${VERSION}...${reset}\n`);

  try {
    copyRecursiveSync(rootDir, targetDir);

    // Garantir que as pastas Perfis e _Caixa de Entrada existam
    const perfisDir = path.join(targetDir, 'Perfis');
    const caixaDir = path.join(targetDir, '_Caixa de Entrada');
    if (!fs.existsSync(perfisDir)) fs.mkdirSync(perfisDir, { recursive: true });
    if (!fs.existsSync(caixaDir)) fs.mkdirSync(caixaDir, { recursive: true });

    console.log(`${green}✅ Framework Salus copiado com sucesso!${reset}\n`);
    console.log(`${bold}Proximos passos:${reset}`);
    console.log(`  1. Abra esta pasta (${dim}${targetDir}${reset}) no seu assistente de IA (Claude, Gemini, Cursor, Codex, etc.).`);
    console.log(`  2. Diga no chat: ${bold}${yellow}"Quero montar meu Salus"${reset}`);
    console.log(`  3. A IA conduzira a entrevista de onboarding para criar os perfis da sua familia!\n`);
  } catch (err) {
    console.error(`${red}Erro ao inicializar o Salus:${reset}`, err.message);
    process.exit(1);
  }
}

if (!command || command === '--help' || command === '-h') {
  printHelp();
} else if (command === '--version' || command === '-v') {
  printVersion();
} else if (command === 'init') {
  const targetFolder = args[1];
  init(targetFolder);
} else {
  console.log(`${red}Comando desconhecido:${reset} ${command}`);
  printHelp();
  process.exit(1);
}

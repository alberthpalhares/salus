import { ansi } from './io.js';

const { reset, bold, cyan, green } = ansi;

/** Texto da ajuda do CLI, com as cores ANSI (começa e termina com quebra de linha). */
export function helpText(version: string): string {
  return `
${bold}${cyan}🩺 Salus CLI — Central de Inteligência de Saúde da Família${reset} (v${version})

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
`;
}

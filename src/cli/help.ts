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
  ${green}membros${reset}          Lista os membros do cofre e os problemas de leitura.
  ${green}perfil <id>${reset}      Mostra o perfil de um membro; ${green}--secao${reset} escolhe as seções.
  ${green}agenda${reset}           O que vence: vencido, até 30 dias, de 31 a 90 dias e sem data.
  ${green}buscar <texto>${reset}   Procura o texto nos arquivos dos membros (sem distinguir acento nem caixa).
  ${green}marcador <id> <nome>${reset}
                   Série de um marcador de exame (ex.: "Colesterol total") por data.
                   Os comandos de leitura exigem ${green}--json${reset} por enquanto.
  ${green}inspecionar [pasta]${reset}
                   Mostra a estrutura da pasta (pastas, arquivos, seções, colunas, chaves) sem
                   nenhum valor; ${green}--json${reset} para a saída em JSON.
  ${green}anonimizar <origem> <destino>${reset}
                   Grava em <destino> (pasta nova ou vazia) uma cópia anonimizada de <origem>:
                   nomes, datas, telefones, e-mails e textos livres trocados. Rode numa cópia.

${bold}OPÇÕES:${reset}
  ${green}--force, -f${reset}      Sobrescreve sem perguntar os arquivos de inicialização que já existirem (init).
  ${green}--cofre <pasta>${reset}  Pasta do cofre nos comandos de leitura (padrão: a pasta atual).
  ${green}--json${reset}           Saída em JSON (obrigatória nos comandos de leitura).
  ${green}--secao <a,b>${reset}    Seções do perfil: ficha, medicamentos, vacinas, exames, historico,
                   pendencias, doses, genetica (padrão: todas).
  ${green}--hoje <data>${reset}    Data de referência da agenda, AAAA-MM-DD (padrão: hoje).
  ${green}--semente <n>${reset}    Semente do anonimizar (inteiro ≥ 0): a mesma semente repete a mesma cópia.
  ${green}--help, -h${reset}       Exibe esta mensagem de ajuda.
  ${green}--version, -v${reset}    Exibe a versão atual do CLI.

${bold}EXEMPLOS:${reset}
  $ npx salus-ai init
  $ npx salus-ai init MinhaSaude
  $ npx salus-ai update
  $ npx salus-ai doctor
  $ npx salus-ai membros --cofre MinhaSaude --json
  $ npx salus-ai perfil ana --secao medicamentos,exames --json
  $ npx salus-ai agenda --hoje 2026-10-21 --json
  $ npx salus-ai inspecionar MinhaSaude
  $ npx salus-ai anonimizar "Cópia da MinhaSaude" Anonimizada --semente 7
`;
}

import * as path from 'node:path';
import { anonimizar, type RelatorioAnonimizacao } from '../../core/inspecao/anonimizar.js';
import type { EspecComando } from '../args.js';
import { ansi, type Io } from '../io.js';
import { mensagemDeErro } from './inspecionar.js';

const { reset, red, green, bold } = ansi;

/** `anonimizar <origem> <destino> [--semente n]`: cópia anonimizada e determinística do cofre. */
export const especAnonimizar: EspecComando = {
  nome: 'anonimizar',
  posicionais: [
    { nome: 'origem', obrigatorio: true },
    { nome: 'destino', obrigatorio: true },
  ],
  opcoes: { semente: { tipo: 'string' } },
};

/**
 * Executa `anonimizar` e devolve o código de saída: 0 ok; 1 para semente inválida, origem que não
 * existe, destino com conteúdo ou uma pasta dentro da outra (a mensagem vai para o stderr, sem pilha).
 */
export function executarAnonimizar(
  posicionais: ReadonlyArray<string>,
  opcoes: Readonly<Record<string, string | boolean>>,
  io: Io,
  cwd: string,
): number {
  let semente: number | undefined;
  if (typeof opcoes.semente === 'string') {
    semente = /^\d+$/.test(opcoes.semente) ? Number(opcoes.semente) : Number.NaN;
    if (!Number.isSafeInteger(semente)) {
      io.err(`${red}Semente inválida: ${opcoes.semente}${reset} (use um inteiro não negativo)`);
      return 1;
    }
  }
  const [origem = '', destino = ''] = posicionais;
  const pastaDestino = path.resolve(cwd, destino);
  let relatorio: RelatorioAnonimizacao;
  try {
    relatorio = anonimizar(path.resolve(cwd, origem), pastaDestino, semente === undefined ? {} : { semente });
  } catch (err) {
    io.err(`${red}${mensagemDeErro(err)}${reset}`);
    return 1;
  }
  io.out(`${green}✅ Cópia anonimizada gravada em${reset} ${pastaDestino}`);
  io.out(`   ${bold}Semente:${reset} ${relatorio.semente} (use --semente ${relatorio.semente} para repetir)`);
  io.out(`   ${bold}Deslocamento de datas:${reset} ${relatorio.deslocamentoDias} dias`);
  io.out(
    `   Membros: ${relatorio.membros} · Arquivos de texto: ${relatorio.arquivosTexto} · ` +
      `Binários (vazios): ${relatorio.binarios} · Ignorados (links): ${relatorio.ignorados}`,
  );
  io.out('   Confira a cópia antes de compartilhá-la: nomes de quem não tem perfil podem ter ficado em títulos.');
  return 0;
}

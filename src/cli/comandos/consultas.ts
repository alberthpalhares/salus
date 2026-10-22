import * as path from 'node:path';
import { calcularAgenda } from '../../core/queries/agenda.js';
import { buscar } from '../../core/queries/buscar.js';
import { exigirDataValida, hojeIso } from '../../core/queries/datas.js';
import { serieMarcador } from '../../core/queries/marcador.js';
import { listarMembros } from '../../core/queries/membros.js';
import { ehSecao, lerPerfil, SECOES, type Secao } from '../../core/queries/perfil.js';
import { Vault } from '../../core/vault/Vault.js';
import type { EspecComando, EspecOpcao } from '../args.js';
import { ansi, type Io } from '../io.js';

const { reset, red } = ansi;

const COFRE: EspecOpcao = { tipo: 'string' };
const JSON_: EspecOpcao = { tipo: 'boolean' };

/** Os comandos de leitura: cada um abre o cofre em `--cofre` (padrão: a pasta atual) e responde em JSON. */
export const especsConsultas: EspecComando[] = [
  { nome: 'membros', posicionais: [], opcoes: { cofre: COFRE, json: JSON_ } },
  {
    nome: 'perfil',
    posicionais: [{ nome: 'id', obrigatorio: true }],
    opcoes: { cofre: COFRE, secao: { tipo: 'string' }, json: JSON_ },
  },
  { nome: 'agenda', posicionais: [], opcoes: { cofre: COFRE, hoje: { tipo: 'string' }, json: JSON_ } },
  { nome: 'buscar', posicionais: [{ nome: 'texto', obrigatorio: true }], opcoes: { cofre: COFRE, json: JSON_ } },
  {
    nome: 'marcador',
    posicionais: [
      { nome: 'id', obrigatorio: true },
      { nome: 'nome', obrigatorio: true },
    ],
    opcoes: { cofre: COFRE, json: JSON_ },
  },
];

/** `nome` é um comando de leitura deste módulo? */
export function ehConsulta(nome: string): boolean {
  return especsConsultas.some((spec) => spec.nome === nome);
}

const SAIDA_OK = 0;
const SAIDA_ERRO_DE_USO = 1;
const SAIDA_NAO_ENCONTRADO = 2;

function erroDeUso(io: Io, mensagem: string): number {
  io.err(`${red}${mensagem}${reset}`);
  return SAIDA_ERRO_DE_USO;
}

function imprimirJson(io: Io, valor: unknown): void {
  io.out(JSON.stringify(valor, null, 2));
}

function naoEncontrado(io: Io, detalhes: Record<string, string>): number {
  imprimirJson(io, { erro: 'nao_encontrado', ...detalhes });
  return SAIDA_NAO_ENCONTRADO;
}

/** As seções de `--secao a,b`; `undefined` sem a opção (perfil inteiro); texto com nome desconhecido sai como erro. */
function lerSecoes(texto: string | boolean | undefined): { secoes?: Secao[]; erro?: string } {
  if (typeof texto !== 'string') return {};
  const nomes = texto
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n !== '');
  const secoes: Secao[] = [];
  for (const nome of nomes.length > 0 ? nomes : [texto]) {
    if (!ehSecao(nome)) return { erro: `Seção desconhecida: ${nome} (válidas: ${SECOES.join(', ')})` };
    secoes.push(nome);
  }
  return { secoes };
}

/**
 * Executa um comando de leitura e devolve o código de saída: 0 ok, 1 uso errado (sem `--json`, seção ou
 * data inválida, cofre inexistente), 2 id ou marcador que não existe (a resposta é `{"erro":"nao_encontrado",…}`).
 * `posicionais` já vêm validados por `parseArgumentos`. Nesta fase só há saída `--json`.
 */
export function executarConsulta(
  nome: string,
  posicionais: ReadonlyArray<string>,
  opcoes: Readonly<Record<string, string | boolean>>,
  io: Io,
  cwd: string,
): number {
  if (opcoes.json !== true) return erroDeUso(io, 'Use --json (saída em texto chega na Fase 2)');

  // validações de opção antes de abrir o cofre
  const { secoes, erro: erroDeSecao } = nome === 'perfil' ? lerSecoes(opcoes.secao) : {};
  if (erroDeSecao !== undefined) return erroDeUso(io, erroDeSecao);
  const hoje = typeof opcoes.hoje === 'string' ? opcoes.hoje : hojeIso();
  if (nome === 'agenda') {
    try {
      exigirDataValida(hoje);
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      return erroDeUso(io, `Data inválida em --hoje: ${hoje} (use AAAA-MM-DD)`);
    }
  }

  let vault: Vault;
  try {
    const pasta = typeof opcoes.cofre === 'string' ? path.resolve(cwd, opcoes.cofre) : cwd;
    vault = Vault.abrir(pasta);
  } catch (err) {
    return erroDeUso(io, err instanceof Error ? err.message : String(err));
  }

  const [id = '', segundo = ''] = posicionais;
  switch (nome) {
    case 'membros':
      imprimirJson(io, { membros: listarMembros(vault), problemas: vault.problemas });
      return SAIDA_OK;
    case 'perfil': {
      const perfil = lerPerfil(vault, id, secoes);
      if (perfil === undefined) return naoEncontrado(io, { id });
      imprimirJson(io, perfil);
      return SAIDA_OK;
    }
    case 'agenda':
      imprimirJson(io, calcularAgenda(vault, hoje));
      return SAIDA_OK;
    case 'buscar':
      imprimirJson(io, buscar(vault, id));
      return SAIDA_OK;
    case 'marcador': {
      const pontos = vault.membro(id) === undefined ? [] : serieMarcador(vault, id, segundo);
      if (pontos.length === 0) return naoEncontrado(io, { id, marcador: segundo });
      imprimirJson(io, pontos);
      return SAIDA_OK;
    }
    default:
      return erroDeUso(io, `Comando de leitura desconhecido: ${nome}`);
  }
}

import * as path from 'node:path';
import { type ArquivoInspecionado, type Inspecao, inspecionar } from '../../core/inspecao/inspecionar.js';
import type { EspecComando } from '../args.js';
import { ansi, type Io } from '../io.js';

const { reset, red } = ansi;

/** `inspecionar [pasta] [--json]`: a estrutura do cofre, sem nenhum valor. */
export const especInspecionar: EspecComando = {
  nome: 'inspecionar',
  posicionais: [{ nome: 'pasta', obrigatorio: false }],
  opcoes: { json: { tipo: 'boolean' } },
};

/** Mensagem de erro sem caminho de arquivo do cofre (o código do Node basta para saber o que houve). */
export function mensagemDeErro(err: unknown): string {
  if (err instanceof Error) {
    const codigo = (err as NodeJS.ErrnoException).code;
    return typeof codigo === 'string' ? `Erro ao ler ou gravar arquivos (${codigo}).` : err.message;
  }
  return String(err);
}

function descreverArquivo(arquivo: ArquivoInspecionado): string {
  const partes = [`${arquivo.eol}${arquivo.bom ? ' BOM' : ''}`];
  if (arquivo.frontmatter_chaves !== undefined) partes.push(`frontmatter: ${arquivo.frontmatter_chaves.join(', ')}`);
  if (arquivo.yaml_chaves !== undefined) partes.push(`chaves: ${arquivo.yaml_chaves.join(', ')}`);
  for (const secao of arquivo.secoes ?? []) {
    let texto = `${'#'.repeat(secao.nivel)} ${secao.titulo}`;
    if (secao.tabela_colunas !== undefined) {
      texto += ` [${secao.tabela_colunas.join(' | ')}] (${secao.linhas ?? 0} ${secao.linhas === 1 ? 'linha' : 'linhas'})`;
    }
    if (secao.itens_lista !== undefined) {
      texto += ` (${secao.itens_lista} ${secao.itens_lista === 1 ? 'item' : 'itens'})`;
    }
    partes.push(texto);
  }
  return partes.join(' · ');
}

/** A inspeção em texto: cada pasta numa linha e, abaixo dela, uma linha por arquivo de texto. */
export function formatarInspecao(inspecao: Inspecao): string {
  const porPasta = new Map<string, ArquivoInspecionado[]>();
  for (const pasta of ['', ...inspecao.pastas]) porPasta.set(pasta, []);
  for (const arquivo of inspecao.arquivos) {
    const corte = arquivo.caminho.lastIndexOf('/');
    const pasta = corte < 0 ? '' : arquivo.caminho.slice(0, corte);
    const lista = porPasta.get(pasta) ?? [];
    lista.push(arquivo);
    porPasta.set(pasta, lista);
  }
  const linhas = [
    `Inspeção da estrutura (sem valores) — versão detectada: ${inspecao.versao_detectada}`,
    `${inspecao.pastas.length} pastas · ${inspecao.arquivos.length} arquivos de texto · ${inspecao.binarios} binários`,
    '',
  ];
  for (const [pasta, arquivos] of porPasta) {
    if (pasta === '' && arquivos.length === 0) continue;
    linhas.push(pasta === '' ? './' : `${pasta}/`);
    for (const arquivo of arquivos) {
      const nome = arquivo.caminho.slice(arquivo.caminho.lastIndexOf('/') + 1);
      linhas.push(`  ${nome}  ${descreverArquivo(arquivo)}`);
    }
  }
  return linhas.join('\n');
}

/** Executa `inspecionar`: 0 ok; 1 se a pasta não existe ou não pode ser lida. */
export function executarInspecionar(
  posicionais: ReadonlyArray<string>,
  opcoes: Readonly<Record<string, string | boolean>>,
  io: Io,
  cwd: string,
): number {
  const pasta = path.resolve(cwd, posicionais[0] ?? '.');
  let inspecao: Inspecao;
  try {
    inspecao = inspecionar(pasta);
  } catch (err) {
    io.err(`${red}${mensagemDeErro(err)}${reset}`);
    return 1;
  }
  io.out(opcoes.json === true ? JSON.stringify(inspecao, null, 2) : formatarInspecao(inspecao));
  return 0;
}

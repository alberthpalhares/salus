import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Allowlist explícita de arquivos/pastas distribuídos pelo framework
export const INIT_ITEMS: readonly string[] = [
  '.agents',
  'Frameworks',
  '_Caixa de Entrada',
  'COMECE_AQUI.md',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CODEX.md',
  '.cursorrules',
];

// Itens que podem ser atualizados com segurança sem sobrescrever dados ou o cérebro da família
export const UPDATE_ITEMS: readonly string[] = [
  '.agents',
  'Frameworks',
  'COMECE_AQUI.md',
];

export const PROFILE_REQUIRED_FILES: readonly string[] = [
  'Ficha.md',
  'Medicamentos.md',
  'Genetica.md',
  'Historico.md',
  'Exames.md',
];

const NOME_DO_PACOTE = 'salus-ai';
const VERSAO_PADRAO = '0.0.0';

type PackageJson = { name?: unknown; version?: unknown };

/** Lê um package.json; devolve `undefined` se o arquivo não existe ou não é JSON de objeto. */
function lerPackageJson(arquivo: string): PackageJson | undefined {
  try {
    const conteudo: unknown = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
    if (typeof conteudo === 'object' && conteudo !== null) {
      return conteudo as PackageJson;
    }
  } catch {
    // inexistente ou inválido: o chamador segue subindo os diretórios
  }
  return undefined;
}

/**
 * Raiz do pacote `salus-ai`: sobe a partir deste arquivo até achar um package.json
 * com `name === 'salus-ai'`. Funciona a partir de `src/` (Vitest) e de `dist/cli.js` empacotado.
 */
export function packageRoot(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const pkg = lerPackageJson(path.join(dir, 'package.json'));
    if (pkg?.name === NOME_DO_PACOTE) return dir;

    const pai = path.dirname(dir);
    if (pai === dir) {
      throw new Error('package.json do salus-ai não encontrado');
    }
    dir = pai;
  }
}

/** Pasta `framework/` distribuída no pacote (espelha o layout do cofre). */
export function frameworkRoot(): string {
  return path.join(packageRoot(), 'framework');
}

/** Versão do pacote, lida do package.json; `0.0.0` se não for possível ler. */
export function packageVersion(): string {
  try {
    const pkg = lerPackageJson(path.join(packageRoot(), 'package.json'));
    if (typeof pkg?.version === 'string' && pkg.version !== '') {
      return pkg.version;
    }
  } catch {
    // package.json não encontrado: cai na versão padrão
  }
  return VERSAO_PADRAO;
}

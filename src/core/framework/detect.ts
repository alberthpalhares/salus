import * as fs from 'node:fs';
import * as path from 'node:path';
import { INIT_ITEMS } from './manifest.js';

/** Frase do stub pré-onboarding: enquanto o AGENTS.md a contém, a família ainda não foi configurada. */
export const SENTINELA_NAO_INICIALIZADO = 'ainda não foi inicializado';

/** A pasta já tem um Salus configurado para uma família (índice presente ou AGENTS.md personalizado). */
export function isAlreadyInitialized(targetDir: string): boolean {
  const indexYaml = path.join(targetDir, 'Familia', '_index.yaml');
  if (fs.existsSync(indexYaml)) return true;

  const agentsMd = path.join(targetDir, 'AGENTS.md');
  if (fs.existsSync(agentsMd)) {
    try {
      const content = fs.readFileSync(agentsMd, 'utf8');
      if (!content.includes(SENTINELA_NAO_INICIALIZADO)) {
        return true;
      }
    } catch {
      // ilegível: trata como não inicializado
    }
  }
  return false;
}

/** Itens de inicialização que já existem na pasta de destino (seriam sobrescritos/mesclados pelo init). */
export function findInitCollisions(targetDir: string): string[] {
  return INIT_ITEMS.filter((item) => fs.existsSync(path.join(targetDir, item)));
}

/** A pasta tem cara de Salus (AGENTS.md ou .agents/), inicializada ou não. */
export function looksLikeSalus(targetDir: string): boolean {
  return (
    fs.existsSync(path.join(targetDir, 'AGENTS.md')) ||
    fs.existsSync(path.join(targetDir, '.agents'))
  );
}

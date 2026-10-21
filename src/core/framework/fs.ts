import * as fs from 'node:fs';
import * as path from 'node:path';

const NOMES_IGNORADOS: ReadonlySet<string> = new Set(['.DS_Store', 'Thumbs.db']);

/** Cria a pasta (e os pais) se ainda não existir. */
export function ensureDirSync(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Copia arquivo ou pasta recursivamente, criando os pais do destino.
 * Ignora `.DS_Store` e `Thumbs.db`; não faz nada se `src` não existe.
 */
export function copyItemRecursiveSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    ensureDirSync(dest);
    for (const childItemName of fs.readdirSync(src)) {
      if (NOMES_IGNORADOS.has(childItemName)) continue;
      copyItemRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    }
  } else {
    ensureDirSync(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

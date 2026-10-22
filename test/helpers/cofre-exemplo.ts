import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** O cofre de exemplo (somente leitura): Ana, Bruno e Mia (gata). */
export const EXEMPLO = fileURLToPath(new URL('../fixtures/vaults/v2-exemplo/', import.meta.url));

const temporarias: string[] = [];

/** Cópia do cofre de exemplo numa pasta temporária, para o teste estragar à vontade (`removerCopias` apaga). */
export function copiaDoExemplo(): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'salus-consultas-')), 'Cofre');
  temporarias.push(dir);
  cpSync(EXEMPLO, dir, { recursive: true });
  return dir;
}

/** Apaga as cópias criadas por `copiaDoExemplo` (chamar num `afterAll`). */
export function removerCopias(): void {
  for (const dir of temporarias.splice(0)) rmSync(join(dir, '..'), { recursive: true, force: true, maxRetries: 5 });
}

/** Troca `de` por `para` no arquivo (caminho relativo ao cofre); falha se `de` não está lá: nada de troca silenciosa. */
export function substituir(dir: string, relativo: string, de: string, para: string): void {
  const caminho = join(dir, relativo);
  const texto = readFileSync(caminho, 'utf8');
  if (!texto.includes(de)) throw new Error(`o texto a trocar não está em ${relativo}`);
  writeFileSync(caminho, texto.replace(de, () => para));
}

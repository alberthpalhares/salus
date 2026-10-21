import { execFile } from 'node:child_process';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Raiz do repositório (dois níveis acima de test/helpers). */
export const REPO_ROOT: string = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

/** CLI sob teste; `SALUS_CLI` permite apontar para outra implementação. */
export const CLI_PATH: string =
  process.env.SALUS_CLI ?? path.join(REPO_ROOT, 'bin', 'cli.js');

/** Pasta que contém o framework distribuído (.agents, Frameworks, ...). */
export const FRAMEWORK_SRC: string = process.env.SALUS_FRAMEWORK ?? REPO_ROOT;

export type CliResult = {
  code: number;
  stdout: string;
  stderr: string;
  /** stdout + stderr, sem sequências ANSI. */
  out: string;
};

/** Remove sequências ANSI de cor/estilo (o CLI sempre as emite, mesmo em pipe). */
export function stripAnsi(s: string): string {
  return s.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Executa o CLI como processo filho, sem TTY (stdin fechado).
 * Nunca lança: o código de saída vem de `error.code` do execFile.
 */
export function runCli(
  args: string[],
  opts: { cwd?: string } = {},
): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [CLI_PATH, ...args],
      { cwd: opts.cwd, windowsHide: true, encoding: 'utf8' },
      (error, stdout, stderr) => {
        let code = 0;
        let err = stderr;
        if (error) {
          if (typeof error.code === 'number') {
            code = error.code;
          } else {
            // Falha ao iniciar o processo ou morte por sinal: não é um exit code do CLI.
            code = -1;
            err = `${stderr}${error.message}\n`;
          }
        }
        resolve({ code, stdout, stderr: err, out: stripAnsi(stdout + err) });
      },
    );
    // execFile não aceita `stdio`; fechar o stdin garante "sem TTY" e nenhum prompt pendente.
    child.stdin?.end();
  });
}

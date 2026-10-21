import * as readline from 'node:readline';

/** Formatadores ANSI para saída visual no terminal. */
export const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
} as const;

/** Entrada e saída do CLI, injetável para que os comandos sejam testáveis sem processo filho. */
export interface Io {
  out(text: string): void;
  err(text: string): void;
  readonly isTTY: boolean;
  confirm(question: string): Promise<boolean>;
}

const RESPOSTAS_AFIRMATIVAS: ReadonlySet<string> = new Set(['s', 'sim', 'y', 'yes']);

/** Io real: console, stdin e readline. Sem TTY, `confirm` devolve `false` sem perguntar. */
export function nodeIo(): Io {
  return {
    out: (text) => {
      console.log(text);
    },
    err: (text) => {
      console.error(text);
    },
    isTTY: Boolean(process.stdin.isTTY),
    confirm: (question) => {
      if (!process.stdin.isTTY) {
        return Promise.resolve(false);
      }
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      return new Promise<boolean>((resolve) => {
        rl.question(question, (answer) => {
          rl.close();
          resolve(RESPOSTAS_AFIRMATIVAS.has(answer.trim().toLowerCase()));
        });
      });
    },
  };
}

/**
 * Io em memória para testes: acumula `out`/`err` e responde `confirm` com `answers`,
 * em ordem; quando as respostas acabam, devolve `false`.
 */
export function memoryIo(
  opts: { isTTY?: boolean; answers?: boolean[] } = {},
): Io & { stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const respostas = [...(opts.answers ?? [])];
  return {
    stdout,
    stderr,
    isTTY: opts.isTTY ?? false,
    out: (text) => {
      stdout.push(text);
    },
    err: (text) => {
      stderr.push(text);
    },
    confirm: () => Promise.resolve(respostas.shift() ?? false),
  };
}

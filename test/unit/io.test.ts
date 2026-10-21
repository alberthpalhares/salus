import * as readline from 'node:readline';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ansi, memoryIo, nodeIo } from '../../src/cli/io.js';

// Só o readline é simulado (para exercitar `confirm` com TTY sem terminal de verdade).
vi.mock('node:readline', () => ({ createInterface: vi.fn() }));

const isTTYOriginal = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');

/** Faz o `process.stdin` parecer (ou não) um terminal e programa a resposta digitada. */
function simularTerminal(opts: { tty: boolean; resposta?: string }): {
  perguntas: string[];
  close: ReturnType<typeof vi.fn>;
} {
  Object.defineProperty(process.stdin, 'isTTY', {
    value: opts.tty,
    configurable: true,
  });
  const perguntas: string[] = [];
  const close = vi.fn();
  vi.mocked(readline.createInterface).mockReturnValue({
    question: (pergunta: string, aoResponder: (resposta: string) => void) => {
      perguntas.push(pergunta);
      aoResponder(opts.resposta ?? '');
    },
    close,
  } as unknown as readline.Interface);
  return { perguntas, close };
}

afterEach(() => {
  vi.mocked(readline.createInterface).mockReset();
  if (isTTYOriginal) {
    Object.defineProperty(process.stdin, 'isTTY', isTTYOriginal);
  } else {
    Reflect.deleteProperty(process.stdin, 'isTTY');
  }
});

describe('memoryIo', () => {
  it('acumula out e err separadamente', () => {
    const io = memoryIo();
    io.out('um');
    io.err('erro');
    io.out('dois');
    expect(io.stdout).toEqual(['um', 'dois']);
    expect(io.stderr).toEqual(['erro']);
  });

  it('confirm consome as respostas em ordem e devolve false quando acabam', async () => {
    const io = memoryIo({ answers: [true, false, true] });
    expect(await io.confirm('1?')).toBe(true);
    expect(await io.confirm('2?')).toBe(false);
    expect(await io.confirm('3?')).toBe(true);
    expect(await io.confirm('4?')).toBe(false);
    expect(await io.confirm('5?')).toBe(false);
  });

  it('confirm sem respostas devolve false', async () => {
    expect(await memoryIo().confirm('?')).toBe(false);
  });

  it('não é TTY por padrão e respeita isTTY: true', () => {
    expect(memoryIo().isTTY).toBe(false);
    expect(memoryIo({ isTTY: true }).isTTY).toBe(true);
  });

  it('não altera o array answers recebido', async () => {
    const answers = [true, false];
    const io = memoryIo({ answers });
    await io.confirm('1?');
    expect(answers).toEqual([true, false]);
  });
});

describe('nodeIo', () => {
  it('expõe out, err, confirm e isTTY', () => {
    const io = nodeIo();
    expect(typeof io.out).toBe('function');
    expect(typeof io.err).toBe('function');
    expect(typeof io.confirm).toBe('function');
    // O valor depende de como o runner foi invocado; só o tipo é garantido.
    expect(typeof io.isTTY).toBe('boolean');
  });

  it('confirm sem TTY devolve false sem abrir o readline', async () => {
    const { perguntas } = simularTerminal({ tty: false, resposta: 's' });
    expect(await nodeIo().confirm('Continuar? ')).toBe(false);
    expect(readline.createInterface).not.toHaveBeenCalled();
    expect(perguntas).toEqual([]);
  });

  it.each(['s', 'sim', 'y', 'yes', 'S', 'SIM', '  Yes  ', '\tsim\n'])(
    'confirm com TTY aceita %j como "sim"',
    async (resposta) => {
      const { perguntas, close } = simularTerminal({ tty: true, resposta });
      expect(await nodeIo().confirm('Continuar? ')).toBe(true);
      expect(perguntas).toEqual(['Continuar? ']);
      expect(close).toHaveBeenCalledOnce();
    },
  );

  it.each(['', 'n', 'não', 'nao', 'no', 'talvez', 'ss', 'simm'])(
    'confirm com TTY trata %j como "não"',
    async (resposta) => {
      const { close } = simularTerminal({ tty: true, resposta });
      expect(await nodeIo().confirm('Continuar? ')).toBe(false);
      expect(close).toHaveBeenCalledOnce();
    },
  );
});

describe('ansi', () => {
  it('usa os mesmos códigos do CLI atual', () => {
    expect(ansi).toEqual({
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      cyan: '\x1b[36m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      dim: '\x1b[2m',
    });
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { memoryIo } from '../../src/cli/io.js';
import { main } from '../../src/cli/main.js';
import { frameworkRoot, packageVersion } from '../../src/core/framework/manifest.js';
import { makeTempRoot, readTree, removeTempRoot } from '../helpers/vault.js';

// `main` exercitado em processo, com Io em memória: mesmo parse e despacho do CLI empacotado.

let tmp: string;

beforeEach(async () => {
  tmp = await makeTempRoot();
});

afterEach(async () => {
  await removeTempRoot(tmp);
});

function saida(linhas: string[]): string {
  return linhas.join('\n');
}

function agentsDoFramework(): Buffer {
  return fs.readFileSync(path.join(frameworkRoot(), 'AGENTS.md'));
}

/** `init Nova` em `tmp` (sem TTY) e devolve o caminho do vault. */
async function initNova(): Promise<string> {
  const io = memoryIo();
  expect(await main(['init', 'Nova'], io, tmp), saida(io.stderr)).toBe(0);
  return path.join(tmp, 'Nova');
}

describe('main: ajuda, versão e erros de uso', () => {
  it('--version devolve 0 e imprime v<versão>', async () => {
    const io = memoryIo();
    expect(await main(['--version'], io, tmp)).toBe(0);
    expect(io.stdout[0]).toBe('v' + packageVersion());
  });

  it('-v é alias de --version', async () => {
    const io = memoryIo();
    expect(await main(['-v'], io, tmp)).toBe(0);
    expect(io.stdout).toEqual(['v' + packageVersion()]);
  });

  it('sem argumentos mostra a ajuda e devolve 0', async () => {
    const io = memoryIo();
    expect(await main([], io, tmp)).toBe(0);
    expect(saida(io.stdout)).toContain('USO:');
    expect(io.stderr).toEqual([]);
  });

  it('--help e -h mostram a ajuda com a versão', async () => {
    for (const flag of ['--help', '-h']) {
      const io = memoryIo();
      expect(await main([flag], io, tmp), flag).toBe(0);
      expect(saida(io.stdout), flag).toContain('USO:');
      expect(saida(io.stdout), flag).toContain(`(v${packageVersion()})`);
    }
  });

  it('--version vence --help', async () => {
    const io = memoryIo();
    expect(await main(['--help', '--version'], io, tmp)).toBe(0);
    expect(io.stdout).toEqual(['v' + packageVersion()]);
  });

  it('opção desconhecida devolve 1, avisa no stderr e mostra a ajuda', async () => {
    const io = memoryIo();
    expect(await main(['--froce'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('Opção desconhecida');
    expect(saida(io.stderr)).toContain('--froce');
    expect(saida(io.stdout)).toContain('USO:');
  });

  it('opção desconhecida vence --version e não executa o comando', async () => {
    const io = memoryIo();
    expect(await main(['init', 'Nova', '--version', '--froce'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('Opção desconhecida');
    expect(fs.existsSync(path.join(tmp, 'Nova'))).toBe(false);
  });

  it('comando desconhecido devolve 1 e mostra a ajuda', async () => {
    const io = memoryIo();
    expect(await main(['foo'], io, tmp)).toBe(1);
    expect(saida(io.stdout)).toContain('Comando desconhecido');
    expect(saida(io.stdout)).toContain('foo');
    expect(saida(io.stdout)).toContain('USO:');
  });

  it('init --help mostra a ajuda sem criar nada', async () => {
    const io = memoryIo();
    expect(await main(['init', 'Nova', '--help'], io, tmp)).toBe(0);
    expect(saida(io.stdout)).toContain('USO:');
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});

describe('main: init', () => {
  it('init Nova cria a estrutura dentro de cwd e devolve 0', async () => {
    const io = memoryIo();
    expect(await main(['init', 'Nova'], io, tmp)).toBe(0);
    expect(fs.existsSync(path.join(tmp, 'Nova', 'AGENTS.md'))).toBe(true);
    expect(fs.statSync(path.join(tmp, 'Nova', 'Perfis')).isDirectory()).toBe(true);
    expect(saida(io.stdout)).toContain('Quero montar meu Salus');
  });

  it('init sem pasta usa o cwd recebido', async () => {
    const io = memoryIo();
    expect(await main(['init'], io, tmp)).toBe(0);
    expect(fs.existsSync(path.join(tmp, 'AGENTS.md'))).toBe(true);
  });

  it('init repetido sem TTY devolve 1 e não altera nada', async () => {
    const vault = await initNova();
    const antes = readTree(vault);

    const io = memoryIo({ isTTY: false });
    expect(await main(['init', 'Nova'], io, tmp)).toBe(1);
    expect(saida(io.stdout)).toContain('sobrescreveria ou mesclaria');
    expect(saida(io.stdout)).toContain('Sem terminal interativo');
    expect(readTree(vault)).toEqual(antes);
  });

  it('init repetido com TTY e confirmação aceita sobrescreve e devolve 0', async () => {
    const vault = await initNova();
    fs.writeFileSync(path.join(vault, 'AGENTS.md'), 'X');

    const io = memoryIo({ isTTY: true, answers: [true] });
    expect(await main(['init', 'Nova'], io, tmp)).toBe(0);
    expect(saida(io.stdout)).toContain('já contém um Salus inicializado');
    expect(fs.readFileSync(path.join(vault, 'AGENTS.md')).equals(agentsDoFramework())).toBe(true);
  });

  it('init repetido com TTY e confirmação recusada devolve 1 sem alterar nada', async () => {
    const vault = await initNova();
    fs.writeFileSync(path.join(vault, 'AGENTS.md'), 'X');
    const antes = readTree(vault);

    const io = memoryIo({ isTTY: true, answers: [false] });
    expect(await main(['init', 'Nova'], io, tmp)).toBe(1);
    expect(saida(io.stdout)).toContain('Operação cancelada');
    expect(readTree(vault)).toEqual(antes);
  });

  it('--force (ou -f) em qualquer posição sobrescreve sem perguntar', async () => {
    const vault = await initNova();
    for (const argv of [['--force', 'init', 'Nova'], ['init', 'Nova', '-f']]) {
      fs.writeFileSync(path.join(vault, 'AGENTS.md'), 'X');
      const io = memoryIo({ isTTY: true, answers: [false] });
      expect(await main(argv, io, tmp), argv.join(' ')).toBe(0);
      expect(fs.readFileSync(path.join(vault, 'AGENTS.md')).equals(agentsDoFramework())).toBe(true);
    }
  });

  it('erro ao criar a pasta de destino devolve 1 com a mensagem de erro do init', async () => {
    fs.writeFileSync(path.join(tmp, 'arquivo'), 'não sou pasta');

    const io = memoryIo();
    expect(await main(['init', 'arquivo/sub'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('Erro ao inicializar o Salus:');
  });

  it('erro ao copiar o framework devolve 1 com a mensagem de erro do init', async () => {
    fs.writeFileSync(path.join(tmp, 'arquivo'), 'não sou pasta');

    const io = memoryIo();
    expect(await main(['init', 'arquivo'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('Erro ao inicializar o Salus:');
  });
});

describe('main: update e doctor', () => {
  it('update Nova devolve 0 e preserva o AGENTS.md', async () => {
    const vault = await initNova();
    fs.writeFileSync(path.join(vault, 'AGENTS.md'), '# Cérebro da família\n');

    const io = memoryIo();
    expect(await main(['update', 'Nova'], io, tmp)).toBe(0);
    expect(saida(io.stdout)).toContain('foram preservados');
    expect(fs.readFileSync(path.join(vault, 'AGENTS.md'), 'utf8')).toBe('# Cérebro da família\n');
  });

  it('update em pasta inexistente devolve 1 com erro no stderr', async () => {
    const io = memoryIo();
    expect(await main(['update', 'NaoExiste'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('não existe');
  });

  it('update em pasta que não é Salus devolve 1 sem criar nada', async () => {
    fs.mkdirSync(path.join(tmp, 'Vazia'));

    const io = memoryIo();
    expect(await main(['update', 'Vazia'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('não parece conter um Salus');
    expect(fs.readdirSync(path.join(tmp, 'Vazia'))).toEqual([]);
  });

  it('erro ao copiar no update devolve 1 com a mensagem de erro do update', async () => {
    // `.agents` como arquivo: parece um Salus, mas a cópia das skills falha
    fs.mkdirSync(path.join(tmp, 'Quebrada'));
    fs.writeFileSync(path.join(tmp, 'Quebrada', '.agents'), 'não sou pasta');

    const io = memoryIo();
    expect(await main(['update', 'Quebrada'], io, tmp)).toBe(1);
    expect(saida(io.stderr)).toContain('Erro ao atualizar o Salus:');
  });

  it('doctor Nova devolve 0 e mostra o Salus Doctor', async () => {
    await initNova();

    const io = memoryIo();
    expect(await main(['doctor', 'Nova'], io, tmp)).toBe(0);
    expect(saida(io.stdout)).toContain('Salus Doctor');
    expect(saida(io.stdout)).toContain('Tudo certo');
  });

  it('check e status são aliases de doctor, e --force não muda nada', async () => {
    await initNova();

    for (const argv of [['check', 'Nova'], ['status', 'Nova'], ['doctor', '--force', 'Nova']]) {
      const io = memoryIo();
      expect(await main(argv, io, tmp), argv.join(' ')).toBe(0);
      expect(saida(io.stdout), argv.join(' ')).toContain('Salus Doctor');
    }
  });

  it('doctor com alertas continua devolvendo 0', async () => {
    const vault = await initNova();
    fs.rmSync(path.join(vault, 'AGENTS.md'));

    const io = memoryIo();
    expect(await main(['doctor', 'Nova'], io, tmp)).toBe(0);
    expect(saida(io.stdout)).toContain('1 alerta(s)');
  });

  it('doctor em pasta inexistente devolve 1', async () => {
    const io = memoryIo();
    expect(await main(['doctor', 'NaoExiste'], io, tmp)).toBe(1);
    expect(saida(io.stdout)).toContain('Salus Doctor');
    expect(saida(io.stderr)).toContain('A pasta especificada não existe');
  });
});

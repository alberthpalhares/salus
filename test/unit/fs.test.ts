import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  copyItemRecursiveSync,
  ensureDirSync,
} from '../../src/core/framework/fs.js';
import { makeTempRoot, readTree, removeTempRoot } from '../helpers/vault.js';

let root: string;

beforeEach(async () => {
  root = await makeTempRoot();
});

afterEach(async () => {
  await removeTempRoot(root);
});

function escrever(base: string, rel: string, conteudo: string): void {
  const alvo = path.join(base, ...rel.split('/'));
  fs.mkdirSync(path.dirname(alvo), { recursive: true });
  fs.writeFileSync(alvo, conteudo);
}

describe('copyItemRecursiveSync', () => {
  it('copia a árvore com subpastas e cria os pais inexistentes do destino', () => {
    const src = path.join(root, 'origem');
    escrever(src, 'a.md', 'A');
    escrever(src, 'sub/b.md', 'B');
    escrever(src, 'sub/fundo/c.md', 'C');

    const dest = path.join(root, 'nao', 'existe', 'ainda', 'destino');
    copyItemRecursiveSync(src, dest);

    const arvore = readTree(dest);
    expect([...arvore.keys()]).toEqual(['a.md', 'sub/b.md', 'sub/fundo/c.md']);
    expect(arvore.get('sub/fundo/c.md')?.toString('utf8')).toBe('C');
  });

  it('copia um arquivo único criando a pasta pai do destino', () => {
    const src = path.join(root, 'solto.md');
    fs.writeFileSync(src, 'solto');

    const dest = path.join(root, 'pasta', 'nova', 'solto.md');
    copyItemRecursiveSync(src, dest);

    expect(fs.readFileSync(dest, 'utf8')).toBe('solto');
  });

  it('ignora .DS_Store e Thumbs.db', () => {
    const src = path.join(root, 'origem');
    escrever(src, 'ok.md', 'ok');
    escrever(src, '.DS_Store', 'lixo');
    escrever(src, 'Thumbs.db', 'lixo');
    escrever(src, 'sub/.DS_Store', 'lixo');
    escrever(src, 'sub/Thumbs.db', 'lixo');
    escrever(src, 'sub/ok2.md', 'ok2');

    const dest = path.join(root, 'destino');
    copyItemRecursiveSync(src, dest);

    expect(fs.existsSync(path.join(dest, '.DS_Store'))).toBe(false);
    expect(fs.existsSync(path.join(dest, 'Thumbs.db'))).toBe(false);
    expect(fs.existsSync(path.join(dest, 'sub', '.DS_Store'))).toBe(false);
    expect(fs.existsSync(path.join(dest, 'sub', 'Thumbs.db'))).toBe(false);
    expect([...readTree(dest).keys()]).toEqual(['ok.md', 'sub/ok2.md']);
  });

  it('origem inexistente não lança e não cria o destino', () => {
    const dest = path.join(root, 'destino');
    expect(() =>
      copyItemRecursiveSync(path.join(root, 'nao-existe'), dest),
    ).not.toThrow();
    expect(fs.existsSync(dest)).toBe(false);
  });

  it('sobrescreve arquivos que já existem no destino e preserva os extras', () => {
    const src = path.join(root, 'origem');
    escrever(src, 'a.md', 'novo');
    const dest = path.join(root, 'destino');
    escrever(dest, 'a.md', 'velho');
    escrever(dest, 'extra.md', 'fica');

    copyItemRecursiveSync(src, dest);

    expect(fs.readFileSync(path.join(dest, 'a.md'), 'utf8')).toBe('novo');
    expect(fs.readFileSync(path.join(dest, 'extra.md'), 'utf8')).toBe('fica');
  });
});

describe('ensureDirSync', () => {
  it('cria a pasta e os pais; chamar de novo não falha', () => {
    const dir = path.join(root, 'a', 'b', 'c');
    ensureDirSync(dir);
    expect(fs.statSync(dir).isDirectory()).toBe(true);
    expect(() => ensureDirSync(dir)).not.toThrow();
  });
});

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../helpers/cli.js';

// O artefato publicado é o bundle gerado pelo `npm run build` (o `pretest` o regera).

const DIST_CLI = path.join(REPO_ROOT, 'dist', 'cli.js');

describe('dist/cli.js', () => {
  it('existe', () => {
    expect(fs.existsSync(DIST_CLI)).toBe(true);
  });

  it('a primeira linha é exatamente o shebang do node', () => {
    const primeiraLinha = fs.readFileSync(DIST_CLI, 'utf8').split('\n')[0];
    expect(primeiraLinha).toBe('#!/usr/bin/env node');
  });

  it('só importa módulos do Node (node:*): as bibliotecas de runtime vão inlinadas no bundle', () => {
    // Sem os comentários: as bibliotecas inlinadas trazem exemplos `import x from 'pacote'` na documentação.
    const fonte = fs
      .readFileSync(DIST_CLI, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const especificadores = [
      ...fonte.matchAll(/^[ \t]*(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]/gm),
      ...fonte.matchAll(/^[ \t]*import\s*['"]([^'"]+)['"]/gm),
      ...fonte.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
      ...fonte.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g),
    ].map((m) => m[1] ?? '');
    expect(especificadores.length).toBeGreaterThan(0);
    expect(especificadores.filter((spec) => !spec.startsWith('node:'))).toEqual([]);
  });

  it('o bundle não passa de 2 MB', () => {
    expect(fs.statSync(DIST_CLI).size).toBeLessThanOrEqual(2 * 1024 * 1024);
  });
});

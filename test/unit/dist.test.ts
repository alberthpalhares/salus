import * as fs from 'node:fs';
import { builtinModules } from 'node:module';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../helpers/cli.js';

// O artefato publicado é o bundle gerado pelo `npm run build` (o `pretest` o regera).

const DIST_CLI = path.join(REPO_ROOT, 'dist', 'cli.js');

const NATIVOS: ReadonlySet<string> = new Set(builtinModules);

/** Módulo do Node: `node:*` ou o nome de um módulo nativo (`process`, `buffer`, `fs/promises`…). */
function ehNativo(especificador: string): boolean {
  return especificador.startsWith('node:') || NATIVOS.has(especificador);
}

/**
 * Os especificadores que o bundle importa e que não são módulos do Node. Os `import … from` e
 * `export … from` estáticos só podem estar no cabeçalho (o texto antes do primeiro `//#region`: depois
 * dele vêm as bibliotecas inlinadas, com exemplos de import na documentação); `import('…')`,
 * `require('…')` e `__require('…')` (as bibliotecas CJS inlinadas) valem no bundle todo, sem comentários.
 */
function importsDeFora(bundle: string): { total: number; proibidos: string[] } {
  const marca = bundle.search(/^\/\/#region/m);
  const cabecalho = marca < 0 ? bundle : bundle.slice(0, marca);
  const semComentarios = bundle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const especificadores = [
    ...cabecalho.matchAll(/^[ \t]*(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]/gm),
    ...cabecalho.matchAll(/^[ \t]*import\s*['"]([^'"]+)['"]/gm),
    ...semComentarios.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
    ...semComentarios.matchAll(/(?:\b|_)require\(\s*['"]([^'"]+)['"]\s*\)/g),
  ].map((m) => m[1] ?? '');
  return { total: especificadores.length, proibidos: especificadores.filter((spec) => !ehNativo(spec)) };
}

describe('dist/cli.js', () => {
  it('existe', () => {
    expect(fs.existsSync(DIST_CLI)).toBe(true);
  });

  it('a primeira linha é exatamente o shebang do node', () => {
    const primeiraLinha = fs.readFileSync(DIST_CLI, 'utf8').split('\n')[0];
    expect(primeiraLinha).toBe('#!/usr/bin/env node');
  });

  it('só importa módulos do Node: as bibliotecas de runtime vão inlinadas no bundle', () => {
    const { total, proibidos } = importsDeFora(fs.readFileSync(DIST_CLI, 'utf8'));
    expect(total).toBeGreaterThan(0);
    expect(proibidos).toEqual([]);
  });

  it('o bundle não passa de 2 MB', () => {
    expect(fs.statSync(DIST_CLI).size).toBeLessThanOrEqual(2 * 1024 * 1024);
  });
});

describe('importsDeFora (o guard do bundle)', () => {
  it('recusa __require de pacote do npm e aceita __require de módulo nativo', () => {
    expect(importsDeFora('x = __require("lodash");').proibidos).toEqual(['lodash']);
    expect(importsDeFora('x = __require("process");')).toEqual({ total: 1, proibidos: [] });
    expect(importsDeFora('x = require("buffer"); y = __require("fs/promises");').proibidos).toEqual([]);
  });

  it('recusa import estático de pacote no cabeçalho e aceita node: e nativo', () => {
    expect(importsDeFora('import x from "zod";\n//#region a\n').proibidos).toEqual(['zod']);
    expect(importsDeFora('import * as fs from "node:fs";\nexport { y } from "node:path";\n//#region a\n')).toEqual({
      total: 2,
      proibidos: [],
    });
  });

  it('import estático depois do primeiro //#region (exemplo de documentação) não conta', () => {
    expect(importsDeFora('import a from "node:fs";\n//#region b\nimport x from "zod";\n')).toEqual({
      total: 1,
      proibidos: [],
    });
  });

  it('import() dinâmico de pacote é recusado; comentários não contam', () => {
    expect(importsDeFora('//#region a\nawait import("zod");').proibidos).toEqual(['zod']);
    expect(importsDeFora('//#region a\n/* require("zod") */\n// import("yaml")\n').total).toBe(0);
  });
});

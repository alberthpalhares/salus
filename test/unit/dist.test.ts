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

  it('não embute nada de node_modules/', () => {
    expect(fs.readFileSync(DIST_CLI, 'utf8')).not.toContain('node_modules/');
  });
});

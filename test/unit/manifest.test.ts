import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  frameworkRoot,
  INIT_ITEMS,
  packageRoot,
  packageVersion,
  PROFILE_REQUIRED_FILES,
  UPDATE_ITEMS,
} from '../../src/core/framework/manifest.js';
import { REPO_ROOT } from '../helpers/cli.js';

describe('manifest', () => {
  it('packageRoot aponta para a raiz do repositório', () => {
    expect(path.resolve(packageRoot())).toBe(path.resolve(REPO_ROOT));
  });

  it('frameworkRoot contém o AGENTS.md do produto', () => {
    expect(fs.existsSync(path.join(frameworkRoot(), 'AGENTS.md'))).toBe(true);
  });

  it('packageVersion bate com o package.json', () => {
    const pkg: { version: string } = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
    );
    expect(packageVersion()).toBe(pkg.version);
  });

  it('listas iguais às do CLI atual', () => {
    expect(INIT_ITEMS).toEqual([
      '.agents',
      'Frameworks',
      '_Caixa de Entrada',
      'COMECE_AQUI.md',
      'AGENTS.md',
      'CLAUDE.md',
      'GEMINI.md',
      'CODEX.md',
      '.cursorrules',
    ]);
    expect(UPDATE_ITEMS).toEqual(['.agents', 'Frameworks', 'COMECE_AQUI.md']);
    expect(PROFILE_REQUIRED_FILES).toEqual([
      'Ficha.md',
      'Medicamentos.md',
      'Genetica.md',
      'Historico.md',
      'Exames.md',
    ]);
  });
});

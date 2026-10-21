import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  findInitCollisions,
  isAlreadyInitialized,
  looksLikeSalus,
  SENTINELA_NAO_INICIALIZADO,
} from '../../src/core/framework/detect.js';
import { makeTempRoot, removeTempRoot } from '../helpers/vault.js';

let root: string;

beforeEach(async () => {
  root = await makeTempRoot();
});

afterEach(async () => {
  await removeTempRoot(root);
});

describe('detect', () => {
  it('pasta vazia não é Salus, não está inicializada e não tem colisões', () => {
    expect(isAlreadyInitialized(root)).toBe(false);
    expect(looksLikeSalus(root)).toBe(false);
    expect(findInitCollisions(root)).toEqual([]);
  });

  it('AGENTS.md com a sentinela: parece Salus, não inicializado, colide só em AGENTS.md', () => {
    fs.writeFileSync(
      path.join(root, 'AGENTS.md'),
      `# Salus\n\nEste Salus ${SENTINELA_NAO_INICIALIZADO} para a sua família.\n`,
    );
    expect(isAlreadyInitialized(root)).toBe(false);
    expect(looksLikeSalus(root)).toBe(true);
    expect(findInitCollisions(root)).toEqual(['AGENTS.md']);
  });

  it('AGENTS.md sem a sentinela conta como já inicializado', () => {
    fs.writeFileSync(
      path.join(root, 'AGENTS.md'),
      '# Cérebro da família Teste\n',
    );
    expect(isAlreadyInitialized(root)).toBe(true);
  });

  it('Familia/_index.yaml sem AGENTS.md conta como já inicializado', () => {
    fs.mkdirSync(path.join(root, 'Familia'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'Familia', '_index.yaml'),
      'familia: "Teste"\n',
    );
    expect(isAlreadyInitialized(root)).toBe(true);
  });

  it('só a pasta .agents já basta para parecer Salus', () => {
    fs.mkdirSync(path.join(root, '.agents'));
    expect(looksLikeSalus(root)).toBe(true);
    expect(isAlreadyInitialized(root)).toBe(false);
    expect(findInitCollisions(root)).toEqual(['.agents']);
  });

  it('colisões seguem a ordem de INIT_ITEMS', () => {
    fs.writeFileSync(path.join(root, '.cursorrules'), '');
    fs.mkdirSync(path.join(root, 'Frameworks'));
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), '');
    expect(findInitCollisions(root)).toEqual([
      'Frameworks',
      'CLAUDE.md',
      '.cursorrules',
    ]);
  });
});

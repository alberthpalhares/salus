import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { FRAMEWORK_SRC } from './cli.js';

// Cópias literais de bin/cli.js (a Tarefa 5 passa a importá-las de src/).
export const INIT_ITEMS = [
  '.agents',
  'Frameworks',
  '_Caixa de Entrada',
  'COMECE_AQUI.md',
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  'CODEX.md',
  '.cursorrules',
];

export const UPDATE_ITEMS = ['.agents', 'Frameworks', 'COMECE_AQUI.md'];

export const PROFILE_REQUIRED_FILES = [
  'Ficha.md',
  'Medicamentos.md',
  'Genetica.md',
  'Historico.md',
  'Exames.md',
];

const IGNORED_NAMES = new Set(['.DS_Store', 'Thumbs.db']);
const TEMP_PREFIX = 'salus-test-';

/**
 * Cria `<tmpdir>/salus-test-<8 hex>/Saúde da Família`.
 * Acento e espaços de propósito: o CLI precisa funcionar com esse tipo de caminho.
 */
export async function makeTempRoot(): Promise<string> {
  const root = path.join(
    os.tmpdir(),
    `${TEMP_PREFIX}${randomBytes(4).toString('hex')}`,
    'Saúde da Família',
  );
  await fs.promises.mkdir(root, { recursive: true });
  return root;
}

/** Remove a pasta de teste e o diretório `salus-test-*` que a contém. */
export async function removeTempRoot(root: string): Promise<void> {
  const parent = path.dirname(root);
  const alvo = path.basename(parent).startsWith(TEMP_PREFIX) ? parent : root;
  await fs.promises.rm(alvo, { recursive: true, force: true, maxRetries: 5 });
}

function copyFile(src: string, dest: string): void {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/**
 * Transforma um vault recém-inicializado (`init` já rodou) numa "família simulada":
 * índice, agenda, META, perfil "Teste", AGENTS.md customizado, um documento na
 * Caixa de Entrada e uma skill corrompida (para o `update` restaurar).
 */
export function simulateFamily(vaultDir: string): void {
  const templates = path.join(
    FRAMEWORK_SRC,
    '.agents',
    'skills',
    'salus-onboarding',
    'templates',
  );

  // 1. Familia/_index.yaml com o nome da família preenchido
  const indexTemplate = fs.readFileSync(
    path.join(templates, 'Familia', '_index.yaml'),
    'utf8',
  );
  const indexYaml = indexTemplate.replace(
    'familia: "[Sobrenome/identificação]"',
    'familia: "Teste"',
  );
  fs.mkdirSync(path.join(vaultDir, 'Familia'), { recursive: true });
  fs.writeFileSync(path.join(vaultDir, 'Familia', '_index.yaml'), indexYaml);

  // 2. Agenda.md e META.md copiados dos templates
  for (const nome of ['Agenda.md', 'META.md']) {
    copyFile(
      path.join(templates, 'Familia', nome),
      path.join(vaultDir, 'Familia', nome),
    );
  }

  // 3. Perfil "Teste" com os 5 arquivos obrigatórios
  for (const nome of PROFILE_REQUIRED_FILES) {
    copyFile(
      path.join(templates, 'Perfil_Humano', nome),
      path.join(vaultDir, 'Perfis', 'Teste', nome),
    );
  }

  // 4. AGENTS.md personalizado (sem a frase-sentinela "ainda não foi inicializado")
  fs.writeFileSync(
    path.join(vaultDir, 'AGENTS.md'),
    '# Cérebro da família Teste\n\nConteúdo personalizado.\n',
  );

  // 5. Um documento aguardando triagem
  fs.mkdirSync(path.join(vaultDir, '_Caixa de Entrada'), { recursive: true });
  fs.writeFileSync(
    path.join(vaultDir, '_Caixa de Entrada', 'exame.pdf'),
    '%PDF-1.4\n',
  );

  // 6. Skill corrompida, para verificar que o update a restaura
  fs.writeFileSync(
    path.join(vaultDir, '.agents', 'skills', 'cruzar', 'SKILL.md'),
    'CORROMPIDO\n',
  );
}

/**
 * Lê uma árvore de arquivos: caminho relativo (separador `/`) -> conteúdo.
 * Ordenada por caminho; ignora `.DS_Store` e `Thumbs.db`.
 */
export function readTree(dir: string): Map<string, Buffer> {
  const entradas: Array<[string, Buffer]> = [];

  const percorrer = (atual: string, prefixo: string): void => {
    for (const item of fs.readdirSync(atual, { withFileTypes: true })) {
      if (IGNORED_NAMES.has(item.name)) continue;
      const rel = prefixo === '' ? item.name : `${prefixo}/${item.name}`;
      const completo = path.join(atual, item.name);
      if (item.isDirectory()) {
        percorrer(completo, rel);
      } else {
        entradas.push([rel, fs.readFileSync(completo)]);
      }
    }
  };

  percorrer(dir, '');
  entradas.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(entradas);
}

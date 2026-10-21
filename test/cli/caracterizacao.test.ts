import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FRAMEWORK_SRC, REPO_ROOT, runCli } from '../helpers/cli.js';
import {
  makeTempRoot,
  readTree,
  removeTempRoot,
  simulateFamily,
} from '../helpers/vault.js';

// Suíte de caracterização: congela o comportamento ATUAL do CLI (bin/cli.js).
// O CLI é a referência; se um teste falhar, o teste está errado.

const VERSAO: string = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'),
).version;

const SKILLS = [
  'cruzar',
  'preparar-consulta',
  'raio-x',
  'registrar',
  'salus-organiza',
  'salus-revisao',
  'salus-onboarding',
];

let root: string;

beforeEach(async () => {
  root = await makeTempRoot();
});

afterEach(async () => {
  await removeTempRoot(root);
});

function existe(...partes: string[]): boolean {
  return fs.existsSync(path.join(...partes));
}

function ler(...partes: string[]): Buffer {
  return fs.readFileSync(path.join(...partes));
}

/** Roda `init` numa subpasta absoluta de `root` e devolve o caminho do vault. */
async function initVault(): Promise<string> {
  const vault = path.join(root, 'vault');
  const r = await runCli(['init', vault]);
  expect(r.code, r.out).toBe(0);
  return vault;
}

/** `init` + família simulada (AGENTS.md customizado, índice, perfil, caixa). */
async function initFamilia(): Promise<string> {
  const vault = await initVault();
  simulateFamily(vault);
  return vault;
}

describe('ajuda e versão', () => {
  it('--version imprime v<versão do package.json> e sai 0', async () => {
    const r = await runCli(['--version']);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe('v' + VERSAO);
  });

  it('-v é alias de --version', async () => {
    const r = await runCli(['-v']);
    expect(r.code).toBe(0);
    expect(r.stdout.trim()).toBe('v' + VERSAO);
  });

  it('--help sai 0 e mostra USO', async () => {
    const r = await runCli(['--help']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('USO:');
    expect(r.out).toContain('init [pasta]');
  });

  it('-h é alias de --help', async () => {
    const r = await runCli(['-h']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('USO:');
    expect(r.out).toContain('init [pasta]');
  });

  it('sem argumentos mostra ajuda e sai 0', async () => {
    const r = await runCli([]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('USO:');
    expect(r.out).toContain('init [pasta]');
  });

  it('init --help mostra ajuda sem criar nada', async () => {
    const r = await runCli(['init', '--help'], { cwd: root });
    expect(r.code).toBe(0);
    expect(r.out).toContain('USO:');
    expect(existe(root, 'AGENTS.md')).toBe(false);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it('flag desconhecida sai 1', async () => {
    const r = await runCli(['--froce']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Opção desconhecida');
  });

  it('flag desconhecida com comando sai 1 e não cria nada', async () => {
    const r = await runCli(['init', '--froce', 'Nova'], { cwd: root });
    expect(r.code).toBe(1);
    expect(r.out).toContain('Opção desconhecida');
    expect(existe(root, 'Nova')).toBe(false);
  });

  it('comando desconhecido sai 1', async () => {
    const r = await runCli(['foo']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Comando desconhecido');
  });
});

describe('init', () => {
  it('init em pasta nova cria a estrutura v1 e sai 0', async () => {
    const r = await runCli(['init', 'Minha Pasta'], { cwd: root });
    expect(r.code, r.out).toBe(0);

    const vault = path.join(root, 'Minha Pasta');
    for (const arquivo of [
      'AGENTS.md',
      'CLAUDE.md',
      'GEMINI.md',
      'CODEX.md',
      '.cursorrules',
      'COMECE_AQUI.md',
      path.join('Frameworks', 'PROTOCOLO_CLINICO.md'),
      path.join('_Caixa de Entrada', 'LEIA-ME.md'),
    ]) {
      expect(existe(vault, arquivo), arquivo).toBe(true);
    }
    expect(fs.statSync(path.join(vault, 'Perfis')).isDirectory()).toBe(true);
    for (const skill of SKILLS) {
      expect(existe(vault, '.agents', 'skills', skill, 'SKILL.md'), skill).toBe(
        true,
      );
    }
    expect(r.out).toContain('Quero montar meu Salus');
  });

  it('init copia .agents idêntico à origem', async () => {
    const vault = await initVault();
    expect(readTree(path.join(vault, '.agents'))).toEqual(
      readTree(path.join(FRAMEWORK_SRC, '.agents')),
    );
  });

  it('init sem argumento usa a pasta atual', async () => {
    const r = await runCli(['init'], { cwd: root });
    expect(r.code, r.out).toBe(0);
    expect(existe(root, 'AGENTS.md')).toBe(true);
    expect(existe(root, '.agents', 'skills', 'raio-x', 'SKILL.md')).toBe(true);
  });

  it('init com caminho absoluto respeita o caminho', async () => {
    const r = await runCli(['init', path.join(root, 'Abs')], {
      cwd: os.tmpdir(),
    });
    expect(r.code, r.out).toBe(0);
    expect(existe(root, 'Abs', 'AGENTS.md')).toBe(true);
  });

  it('init cria pasta aninhada inexistente', async () => {
    const r = await runCli(['init', 'a/b/c'], { cwd: root });
    expect(r.code, r.out).toBe(0);
    expect(existe(root, 'a', 'b', 'c', 'AGENTS.md')).toBe(true);
  });

  it('init repetido sem TTY sai 1, lista colisões e não altera nada', async () => {
    const vault = await initVault();
    const agentsAntes = ler(vault, 'AGENTS.md');

    const r = await runCli(['init', vault]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('sobrescreveria ou mesclaria');
    expect(r.out).toContain('AGENTS.md');
    expect(r.out).toContain('Sem terminal interativo');
    expect(ler(vault, 'AGENTS.md').equals(agentsAntes)).toBe(true);
  });

  it('init --force sobrescreve sem perguntar', async () => {
    const vault = await initVault();
    fs.writeFileSync(path.join(vault, 'AGENTS.md'), 'X');

    const r = await runCli(['init', '--force', vault]);
    expect(r.code, r.out).toBe(0);
    expect(
      ler(vault, 'AGENTS.md').equals(ler(FRAMEWORK_SRC, 'AGENTS.md')),
    ).toBe(true);
  });

  it('init em pasta já inicializada (AGENTS.md sem sentinela) sai 1 com a mensagem de família', async () => {
    const vault = await initFamilia();
    const agentsAntes = ler(vault, 'AGENTS.md');

    const r = await runCli(['init', vault]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('já contém um Salus inicializado');
    expect(r.out).toContain('npx salus-ai update');
    expect(ler(vault, 'AGENTS.md').equals(agentsAntes)).toBe(true);
  });

  it('init em pasta com CLAUDE.md próprio e sem AGENTS.md sai 1 e não copia nada', async () => {
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'meu');

    const r = await runCli(['init'], { cwd: root });
    expect(r.code).toBe(1);
    expect(r.out).toContain('CLAUDE.md');
    expect(existe(root, '.agents')).toBe(false);
    expect(ler(root, 'CLAUDE.md').toString('utf8')).toBe('meu');

    const forcado = await runCli(['init', '--force'], { cwd: root });
    expect(forcado.code, forcado.out).toBe(0);
    expect(
      ler(root, 'CLAUDE.md').equals(ler(FRAMEWORK_SRC, 'CLAUDE.md')),
    ).toBe(true);
  });
});

describe('update', () => {
  it('update preserva dados e restaura skills', async () => {
    const vault = await initFamilia();

    const r = await runCli(['update', vault]);
    expect(r.code, r.out).toBe(0);

    expect(ler(vault, 'AGENTS.md').toString('utf8')).toContain(
      '# Cérebro da família Teste',
    );
    expect(existe(vault, 'Perfis', 'Teste', 'Ficha.md')).toBe(true);
    expect(ler(vault, 'Familia', '_index.yaml').toString('utf8')).toContain(
      'familia: "Teste"',
    );
    expect(existe(vault, '_Caixa de Entrada', 'exame.pdf')).toBe(true);
    // a skill "cruzar" corrompida foi restaurada
    expect(readTree(path.join(vault, '.agents'))).toEqual(
      readTree(path.join(FRAMEWORK_SRC, '.agents')),
    );
    expect(r.out).toContain('foram preservados');
  });

  it('update sobrescreve COMECE_AQUI.md', async () => {
    // Comportamento atual, pinado: o update substitui o guia sem perguntar.
    const vault = await initVault();
    fs.writeFileSync(path.join(vault, 'COMECE_AQUI.md'), 'meu');

    const r = await runCli(['update', vault]);
    expect(r.code, r.out).toBe(0);
    expect(
      ler(vault, 'COMECE_AQUI.md').equals(ler(FRAMEWORK_SRC, 'COMECE_AQUI.md')),
    ).toBe(true);
  });

  it('update em pasta vazia sai 1 e não cria nada', async () => {
    fs.mkdirSync(path.join(root, 'Vazia'));

    const r = await runCli(['update', 'Vazia'], { cwd: root });
    expect(r.code).toBe(1);
    expect(r.out).toContain('não parece conter um Salus');
    expect(fs.readdirSync(path.join(root, 'Vazia')).length).toBe(0);
  });

  it('update em pasta inexistente sai 1', async () => {
    const r = await runCli(['update', 'NaoExiste'], { cwd: root });
    expect(r.code).toBe(1);
    expect(r.out).toContain('não existe');
  });

  it('update aceita pasta só com .agents', async () => {
    fs.mkdirSync(path.join(root, 'SoAgents', '.agents'), { recursive: true });

    const r = await runCli(['update', 'SoAgents'], { cwd: root });
    expect(r.code, r.out).toBe(0);
  });
});

describe('doctor', () => {
  it('doctor logo após init: não inicializado, 0 alertas, sai 0', async () => {
    const vault = await initVault();

    const r = await runCli(['doctor', vault]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('ainda não foi inicializado');
    expect(r.out).toContain('Tudo certo');
  });

  it('doctor na família simulada', async () => {
    const vault = await initFamilia();

    const r = await runCli(['doctor', vault]);
    expect(r.code).toBe(0);
    expect(r.out).toContain('Sistema inicializado');
    expect(r.out).toContain('Teste');
    expect(r.out).toContain('todos os 5 arquivos base presentes');
    expect(r.out).toContain('1 documento(s) aguardando triagem');
  });

  it('doctor sem _index.yaml sugere reconstruir o índice', async () => {
    const vault = await initFamilia();
    fs.rmSync(path.join(vault, 'Familia', '_index.yaml'));

    const r = await runCli(['doctor', vault]);
    // Comportamento atual: alertas não mudam o código de saída.
    expect(r.code).toBe(0);
    expect(r.out).toContain('reconstruir o índice');
    expect(r.out).toContain('1 alerta(s)');
  });

  it('doctor sem AGENTS.md sugere init', async () => {
    const vault = await initVault();
    fs.rmSync(path.join(vault, 'AGENTS.md'));

    const r = await runCli(['doctor', vault]);
    expect(r.out).toContain('npx salus-ai init');
  });

  it('doctor com perfil incompleto lista o que falta', async () => {
    const vault = await initFamilia();
    fs.rmSync(path.join(vault, 'Perfis', 'Teste', 'Exames.md'));

    const r = await runCli(['doctor', vault]);
    expect(r.out).toContain('faltando: Exames.md');
  });

  it('doctor conta subpasta da Caixa como documento', async () => {
    // Comportamento atual, pinado: qualquer entrada não oculta conta como documento.
    const vault = await initFamilia();
    fs.mkdirSync(path.join(vault, '_Caixa de Entrada', 'Sub'));

    const r = await runCli(['doctor', vault]);
    expect(r.out).toContain('2 documento(s)');
  });

  it('doctor em pasta inexistente sai 1', async () => {
    const r = await runCli(['doctor', path.join(root, 'NaoExiste')]);
    expect(r.code).toBe(1);
  });

  it('check e status são aliases de doctor', async () => {
    const vault = await initVault();

    for (const alias of ['check', 'status']) {
      const r = await runCli([alias, vault]);
      expect(r.code, alias).toBe(0);
      expect(r.out, alias).toContain('Salus Doctor');
    }
  });

  it('doctor ignora --force', async () => {
    const vault = await initVault();

    const r = await runCli(['doctor', '--force', vault]);
    expect(r.code).toBe(0);
  });
});

describe('pacote', () => {
  it('npm pack --dry-run só inclui a allowlist', async () => {
    // Comando como string e `args` vazio: no Windows o npm é um .cmd e exige shell,
    // e passar `args` junto com `shell: true` emite o aviso DEP0190 no Node 24.
    const stdout = await new Promise<string>((resolve, reject) => {
      execFile(
        'npm pack --dry-run --json',
        [],
        { cwd: REPO_ROOT, shell: true, encoding: 'utf8', windowsHide: true },
        (error, out, err) => (error ? reject(new Error(`${error.message}\n${err}`)) : resolve(out)),
      );
    });

    const [pacote] = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>;
    const caminhos = pacote.files.map((f) => f.path);

    const proibidosPorPrefixo = ['docs/', 'scripts/', 'test/', '.github/'];
    for (const prefixo of proibidosPorPrefixo) {
      expect(
        caminhos.filter((c) => c.startsWith(prefixo)),
        prefixo,
      ).toEqual([]);
    }
    for (const arquivo of ['STATUS.md', 'CONTRIBUTING.md', 'CHANGELOG.md']) {
      expect(caminhos, arquivo).not.toContain(arquivo);
    }

    for (const arquivo of ['README.md', 'LICENSE', 'package.json']) {
      expect(caminhos, arquivo).toContain(arquivo);
    }
    expect(caminhos).toContain('framework/.agents/skills/raio-x/SKILL.md');

    // O produto vive só sob framework/: nada dele pode ficar na raiz do pacote.
    const naRaiz = (c: string): boolean =>
      c.startsWith('.agents/') ||
      c.startsWith('Frameworks/') ||
      [
        'AGENTS.md',
        'CLAUDE.md',
        'GEMINI.md',
        'CODEX.md',
        '.cursorrules',
        'COMECE_AQUI.md',
      ].includes(c);
    expect(caminhos.filter(naRaiz), 'produto fora de framework/').toEqual([]);
  });
});

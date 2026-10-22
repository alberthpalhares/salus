import { afterAll, describe, expect, it } from 'vitest';
import { calcularAgenda } from '../../src/core/queries/agenda.js';
import { Vault } from '../../src/core/vault/Vault.js';
import { runCli } from '../helpers/cli.js';
import { copiaDoExemplo, EXEMPLO, removerCopias } from '../helpers/cofre-exemplo.js';

// Comandos de leitura com `--json`, pelo binário empacotado (processo filho), sobre uma cópia do v2-exemplo.

afterAll(removerCopias);

const cofre = copiaDoExemplo();

/** Roda o CLI e devolve o JSON do stdout (falha com a saída completa se não for JSON). */
async function json(args: string[], cwd?: string): Promise<{ code: number; dados: unknown; stderr: string }> {
  const r = await runCli(args, { cwd });
  let dados: unknown;
  try {
    dados = JSON.parse(r.stdout);
  } catch {
    throw new Error(`saída não é JSON (código ${r.code}):\n${r.out}`);
  }
  return { code: r.code, dados, stderr: r.stderr };
}

describe('membros', () => {
  it('lista os 3 membros e nenhum problema', async () => {
    const { code, dados } = await json(['membros', '--cofre', cofre, '--json']);
    expect(code).toBe(0);
    expect(dados).toMatchObject({ problemas: [] });
    const { membros } = dados as { membros: Array<{ id: string; nome: string }> };
    expect(membros.map((m) => m.id)).toEqual(['ana', 'bruno', 'mia']);
  });

  it('sem --cofre usa a pasta atual', async () => {
    const { code, dados } = await json(['membros', '--json'], cofre);
    expect(code).toBe(0);
    expect((dados as { membros: unknown[] }).membros).toHaveLength(3);
  });

  it('--cofre=<pasta> vale como --cofre <pasta>', async () => {
    const { code, dados } = await json([`--cofre=${cofre}`, 'membros', '--json']);
    expect(code).toBe(0);
    expect((dados as { membros: unknown[] }).membros).toHaveLength(3);
  });

  it('sem --json devolve 1 e explica', async () => {
    const r = await runCli(['membros', '--cofre', cofre]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Use --json');
    expect(r.stdout).toBe('');
  });

  it('cofre inexistente devolve 1 com "Cofre não encontrado" no stderr', async () => {
    const r = await runCli(['membros', '--cofre', '/nao/existe', '--json']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Cofre não encontrado');
    expect(r.stdout).toBe('');
  });

  it('--cofre sem valor devolve 1 com "Valor ausente para --cofre"', async () => {
    const r = await runCli(['membros', '--json', '--cofre']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Valor ausente para --cofre');
  });
});

describe('perfil', () => {
  it('--secao medicamentos devolve só os medicamentos', async () => {
    const { code, dados } = await json(['perfil', 'ana', '--cofre', cofre, '--secao', 'medicamentos', '--json']);
    expect(code).toBe(0);
    expect(Object.keys(dados as object)).toEqual(['medicamentos']);
  });

  it('--secao com várias seções traz as chaves de cada uma', async () => {
    const { dados } = await json(['perfil', 'ana', '--cofre', cofre, '--secao', 'medicamentos,exames', '--json']);
    expect(Object.keys(dados as object)).toEqual(['medicamentos', 'exames']);
  });

  it('sem --secao devolve o perfil inteiro', async () => {
    const { code, dados } = await json(['perfil', 'ana', '--cofre', cofre, '--json']);
    expect(code).toBe(0);
    expect(dados).toMatchObject({ id: 'ana', pasta: 'Ana' });
    expect(Object.keys(dados as object)).toEqual(expect.arrayContaining(['ficha', 'medicamentos', 'exames']));
  });

  it('id que não existe devolve 2 e {"erro":"nao_encontrado"}', async () => {
    const { code, dados } = await json(['perfil', 'zzz', '--cofre', cofre, '--json']);
    expect(code).toBe(2);
    expect(dados).toEqual({ erro: 'nao_encontrado', id: 'zzz' });
  });

  it('seção desconhecida devolve 1 e lista as válidas', async () => {
    const r = await runCli(['perfil', 'ana', '--cofre', cofre, '--secao', 'ficha,abc', '--json']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Seção desconhecida: abc (válidas: ficha, medicamentos');
    expect(r.stdout).toBe('');
  });

  it('sem o id devolve 1 com "Argumento obrigatório ausente: id"', async () => {
    const r = await runCli(['perfil', '--cofre', cofre, '--json']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Argumento obrigatório ausente: id');
  });
});

describe('agenda', () => {
  it('--hoje 2026-10-21 dá as mesmas faixas de calcularAgenda', async () => {
    const { code, dados } = await json(['agenda', '--cofre', cofre, '--hoje', '2026-10-21', '--json']);
    expect(code).toBe(0);
    expect(dados).toEqual(JSON.parse(JSON.stringify(calcularAgenda(Vault.abrir(EXEMPLO), '2026-10-21'))));
    const agenda = dados as { hoje: string; vencido: unknown[]; ate30: unknown[]; de31a90: unknown[]; semData: unknown[] };
    expect([agenda.hoje, agenda.vencido.length, agenda.ate30.length, agenda.de31a90.length, agenda.semData.length]).toEqual([
      '2026-10-21',
      1,
      3,
      1,
      1,
    ]);
  });

  it('sem --hoje usa a data de hoje (AAAA-MM-DD)', async () => {
    const { code, dados } = await json(['agenda', '--cofre', cofre, '--json']);
    expect(code).toBe(0);
    expect((dados as { hoje: string }).hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('--hoje inválido devolve 1 com a mensagem de data inválida', async () => {
    for (const hoje of ['2027-02-29', 'ontem']) {
      const r = await runCli(['agenda', '--cofre', cofre, '--hoje', hoje, '--json']);
      expect(r.code, hoje).toBe(1);
      expect(r.stderr, hoje).toContain(`Data inválida em --hoje: ${hoje} (use AAAA-MM-DD)`);
    }
  });
});

describe('buscar', () => {
  it('acha ocorrências sem distinguir caixa nem acento', async () => {
    const { code, dados } = await json(['buscar', 'dipirona', '--cofre', cofre, '--json']);
    expect(code).toBe(0);
    const ocorrencias = dados as Array<{ membro: string; arquivo: string; linha: number; trecho: string }>;
    expect(ocorrencias.length).toBeGreaterThanOrEqual(1);
    expect(ocorrencias.every((o) => o.membro === 'ana')).toBe(true);
    expect(ocorrencias[0]?.arquivo).toBe('Perfis/Ana/Ficha.md');
  });

  it('sem resultado devolve lista vazia e código 0', async () => {
    const { code, dados } = await json(['buscar', 'xyzxyzxyz', '--cofre', cofre, '--json']);
    expect(code).toBe(0);
    expect(dados).toEqual([]);
  });
});

describe('marcador', () => {
  it('Colesterol total da Ana tem 2 pontos', async () => {
    const { code, dados } = await json(['marcador', 'ana', 'Colesterol total', '--cofre', cofre, '--json']);
    expect(code).toBe(0);
    const pontos = dados as Array<{ data: string; valor: string }>;
    expect(pontos).toHaveLength(2);
    expect(pontos[0]?.data < (pontos[1]?.data ?? '')).toBe(true);
  });

  it('id que não existe devolve 2 e {"erro":"nao_encontrado","id","marcador"}', async () => {
    const { code, dados } = await json(['marcador', 'zzz', 'Colesterol total', '--cofre', cofre, '--json']);
    expect(code).toBe(2);
    expect(dados).toEqual({ erro: 'nao_encontrado', id: 'zzz', marcador: 'Colesterol total' });
  });

  it('marcador sem nenhum ponto devolve 2 também', async () => {
    const { code, dados } = await json(['marcador', 'ana', 'Marcador Inexistente', '--cofre', cofre, '--json']);
    expect(code).toBe(2);
    expect(dados).toEqual({ erro: 'nao_encontrado', id: 'ana', marcador: 'Marcador Inexistente' });
  });

  it('sem o nome do marcador devolve 1 com "Argumento obrigatório ausente: nome"', async () => {
    const r = await runCli(['marcador', 'ana', '--cofre', cofre, '--json']);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Argumento obrigatório ausente: nome');
  });
});

describe('ajuda', () => {
  it('--help lista os comandos de leitura', async () => {
    const r = await runCli(['--help']);
    expect(r.code).toBe(0);
    for (const nome of ['membros', 'perfil', 'agenda', 'buscar', 'marcador']) {
      expect(r.out, nome).toContain(nome);
    }
    expect(r.out).toContain('--json');
  });
});

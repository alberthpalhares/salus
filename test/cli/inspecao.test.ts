import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runCli } from '../helpers/cli.js';
import { copiaDoExemplo, removerCopias } from '../helpers/cofre-exemplo.js';

// `inspecionar` e `anonimizar` pelo binário empacotado (processo filho), sobre cópias do v2-exemplo.

afterAll(removerCopias);

const cofre = copiaDoExemplo();
/** Pasta temporária (a da cópia) para os destinos do `anonimizar`. */
const tmp = path.dirname(cofre);

const VALORES = ['Dipirona', 'Ana', 'Bruno', 'Mia', '2026-11-05', '90000-0001', 'Helena', 'Losartana'];

describe('inspecionar', () => {
  it('--json devolve a estrutura sem nenhum valor', async () => {
    const r = await runCli(['inspecionar', cofre, '--json']);
    expect(r.code, r.out).toBe(0);
    const dados = JSON.parse(r.stdout) as { versao_detectada: string; pastas: string[] };
    expect(dados.versao_detectada).toBe('v2');
    expect(dados.pastas).toContain('Perfis/membro-1');
    for (const valor of VALORES) expect(r.stdout, valor).not.toContain(valor);
  });

  it('sem --json mostra a árvore em texto, também sem valores', async () => {
    const r = await runCli(['inspecionar', cofre]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Perfis/membro-1/');
    expect(r.out).toContain('Ficha.md');
    expect(r.out).toContain('Nome | Relação | Telefone');
    for (const valor of VALORES) expect(r.out, valor).not.toContain(valor);
  });

  it('sem pasta inspeciona a pasta atual', async () => {
    const r = await runCli(['inspecionar', '--json'], { cwd: cofre });
    expect(r.code, r.out).toBe(0);
    expect((JSON.parse(r.stdout) as { versao_detectada: string }).versao_detectada).toBe('v2');
  });

  it('pasta que não existe devolve 1 com "Pasta não encontrada"', async () => {
    const r = await runCli(['inspecionar', path.join(tmp, 'nao-existe'), '--json']);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain(`Pasta não encontrada: ${path.join(tmp, 'nao-existe')}`);
    expect(r.stdout).toBe('');
  });
});

describe('anonimizar', () => {
  it('grava a cópia e imprime o relatório com a semente', async () => {
    const destino = path.join(tmp, 'anon-1');
    const r = await runCli(['anonimizar', cofre, destino, '--semente', '7']);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Semente: 7');
    expect(r.out).toMatch(/Deslocamento de datas: \d+ dias/);
    expect(fs.existsSync(path.join(destino, 'ANONIMIZACAO.md'))).toBe(true);
    expect(fs.readdirSync(path.join(destino, 'Perfis')).sort()).toEqual(['Membro A', 'Membro B', 'Membro C']);
  });

  it('sem --semente escolhe uma e a informa', async () => {
    const r = await runCli(['anonimizar', cofre, path.join(tmp, 'anon-2')]);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toMatch(/Semente: \d+/);
  });

  it('semente que não é inteiro não negativo devolve 1 com "Semente inválida"', async () => {
    for (const semente of ['abc', '1.5', '-3', '']) {
      const r = await runCli(['anonimizar', cofre, path.join(tmp, 'anon-x'), `--semente=${semente}`]);
      expect(r.code, semente).toBe(1);
      const esperado = semente === '' ? 'Valor ausente para --semente' : `Semente inválida: ${semente}`;
      expect(r.out, semente).toContain(esperado);
    }
    expect(fs.existsSync(path.join(tmp, 'anon-x'))).toBe(false);
  });

  it('destino não vazio devolve 1 com a mensagem, sem pilha de erro', async () => {
    const destino = path.join(tmp, 'anon-cheio');
    fs.mkdirSync(destino);
    fs.writeFileSync(path.join(destino, 'algo.txt'), 'x');
    const r = await runCli(['anonimizar', cofre, destino]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('não está vazia');
    expect(r.out).not.toMatch(/\n\s+at /);
  });

  it('origem que não existe devolve 1 com "Pasta não encontrada"', async () => {
    const r = await runCli(['anonimizar', path.join(tmp, 'nao-existe'), path.join(tmp, 'anon-3')]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain('Pasta não encontrada');
  });

  it('sem o destino devolve 1 com "Argumento obrigatório ausente: destino"', async () => {
    const r = await runCli(['anonimizar', cofre]);
    expect(r.code).toBe(1);
    expect(r.out).toContain('Argumento obrigatório ausente: destino');
  });
});

describe('ajuda', () => {
  it('--help lista inspecionar, anonimizar e --semente', async () => {
    const r = await runCli(['--help']);
    expect(r.code).toBe(0);
    for (const trecho of ['inspecionar', 'anonimizar', '--semente']) expect(r.out, trecho).toContain(trecho);
  });
});

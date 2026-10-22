import { describe, expect, it } from 'vitest';
import * as manifesto from '../../../../src/core/format/arquivos/manifesto.js';
import { BOM, lerFixture, linhas, linhasDiferentes, problema, soCrlf } from './apoio.js';

const ARQUIVO = 'salus.yaml';
const FONTE = lerFixture('vaults/v2-exemplo/salus.yaml');
const ctx = { arquivo: ARQUIVO };

describe('manifesto (salus.yaml)', () => {
  it('lê o manifesto do cofre de exemplo', () => {
    const { dados, problemas, opacas } = manifesto.ler(FONTE, ctx);
    expect(dados).toEqual({
      schema_versao: 2,
      versao_salus: '0.5.0',
      familia: 'Exemplo',
      criado_em: '2026-01-15',
      ultima_revisao: '2026-09-15',
    });
    expect(problemas).toEqual([]);
    expect(opacas).toEqual([]);
  });

  it('no-op: sem chave alterada devolve a fonte byte a byte (não re-serializa)', () => {
    const fonte = linhas(
      '# manifesto',
      'schema_versao: 2',
      'versao_salus:   "0.5.0"',
      'familia: Exemplo',
      'criado_em: "2026-01-15"',
      'ultima_revisao: null',
      '',
    );
    const { dados, estado } = manifesto.ler(fonte, ctx);
    expect(manifesto.escrever(estado, dados ?? naoLido())).toBe(fonte);
    const exemplo = manifesto.ler(FONTE, ctx);
    expect(manifesto.escrever(exemplo.estado, exemplo.dados ?? naoLido())).toBe(FONTE);
  });

  it('mudar `ultima_revisao` muda só essa linha e mantém as aspas', () => {
    const { dados, estado } = manifesto.ler(FONTE, ctx);
    const saida = manifesto.escrever(estado, { ...(dados ?? naoLido()), ultima_revisao: '2026-10-21' });
    expect(linhasDiferentes(FONTE, saida)).toEqual([5]);
    expect(saida).toBe(FONTE.replace('"2026-09-15"', '"2026-10-21"'));
  });

  it('null → data entra entre aspas; comentários preservados; CRLF mantido', () => {
    const fonte = linhas(
      '# Manifesto do cofre (não editar)',
      'schema_versao: 2',
      'versao_salus: "0.5.0" # versão que gravou',
      'familia: Exemplo',
      'criado_em: "2026-01-15"',
      'ultima_revisao: null',
      '',
    ).replaceAll('\n', '\r\n');
    const { dados, estado } = manifesto.ler(fonte, ctx);
    const saida = manifesto.escrever(estado, { ...(dados ?? naoLido()), ultima_revisao: '2026-10-21' });
    expect(soCrlf(saida)).toBe(true);
    expect(linhasDiferentes(fonte, saida)).toEqual([6]);
    expect(saida).toContain('ultima_revisao: "2026-10-21"\r\n');
    expect(saida).toContain('# Manifesto do cofre (não editar)\r\n');
    expect(saida).toContain('versao_salus: "0.5.0" # versão que gravou\r\n');
  });

  it('schema_versao diferente de 2 → `manifesto_invalido` na linha da chave; dados undefined; gravar lança', () => {
    const fonte = FONTE.replace('schema_versao: 2', 'schema_versao: 1');
    const { dados, problemas, estado } = manifesto.ler(fonte, ctx);
    expect(problemas).toEqual([problema(ARQUIVO, 'manifesto_invalido', 1)]);
    expect(problemas[0]?.mensagem).toContain("'schema_versao'");
    expect(dados).toBeUndefined();
    expect(() =>
      manifesto.escrever(estado, {
        schema_versao: 2,
        versao_salus: '0.5.0',
        familia: 'Exemplo',
        criado_em: '2026-01-15',
        ultima_revisao: null,
      }),
    ).toThrow(/salus\.yaml/);
  });

  it('YAML inválido → `manifesto_invalido` com a linha', () => {
    const { dados, problemas } = manifesto.ler('schema_versao: 2\nfamilia: [Exemplo\n', ctx);
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ arquivo: ARQUIVO, codigo: 'manifesto_invalido' });
    expect(problemas[0]?.linha).toBeGreaterThanOrEqual(2);
    expect(dados).toBeUndefined();
  });

  it('BOM → problema `bom`; o no-op devolve a fonte sem o BOM', () => {
    const { dados, problemas, estado } = manifesto.ler(BOM + FONTE, ctx);
    expect(problemas.map((p) => p.codigo)).toEqual(['bom']);
    expect(estado.tinhaBom).toBe(true);
    expect(manifesto.escrever(estado, dados ?? naoLido())).toBe(FONTE);
  });
});

function naoLido(): never {
  throw new Error('manifesto não lido');
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type ArquivoInspecionado, inspecionar } from '../../../src/core/inspecao/inspecionar.js';
import { copiaDoExemplo, EXEMPLO, removerCopias } from '../../helpers/cofre-exemplo.js';
import { type CofreV1, criarCofreV1, NOMES_V1, TERCEIROS_V1 } from '../../helpers/v1.js';
import { makeTempRoot, removeTempRoot } from '../../helpers/vault.js';

// `inspecionar` mostra a estrutura (pastas, arquivos, seções, colunas, chaves) e nunca um valor.

let v1: CofreV1;

beforeAll(async () => {
  v1 = await criarCofreV1();
});

afterAll(async () => {
  removerCopias();
  await v1.limpar();
});

function arquivo(lista: readonly ArquivoInspecionado[], caminho: string): ArquivoInspecionado {
  const achado = lista.find((a) => a.caminho === caminho);
  if (achado === undefined) throw new Error(`arquivo não inspecionado: ${caminho}`);
  return achado;
}

describe('inspecionar: cofre v2 de exemplo', () => {
  const resultado = inspecionar(EXEMPLO);

  it('detecta a versão 2 pelo salus.yaml', () => {
    expect(resultado.versao_detectada).toBe('v2');
    expect(resultado.raiz).toBe(path.resolve(EXEMPLO));
  });

  it('mascara as 3 pastas de perfil como Perfis/membro-1..3, em ordem alfabética', () => {
    expect(resultado.pastas).toEqual(
      expect.arrayContaining(['Perfis', 'Perfis/membro-1', 'Perfis/membro-2', 'Perfis/membro-3']),
    );
    expect(resultado.pastas.some((p) => /Ana|Bruno|Mia/.test(p))).toBe(false);
    expect(resultado.arquivos.some((a) => a.caminho === 'Perfis/membro-1/Ficha.md')).toBe(true);
  });

  it('Ficha.md traz as chaves do frontmatter, as seções e as colunas, sem valores', () => {
    const ficha = arquivo(resultado.arquivos, 'Perfis/membro-1/Ficha.md');
    expect(ficha.frontmatter_chaves).toEqual(expect.arrayContaining(['id', 'nome', 'alergias', 'conjuges']));
    expect(ficha.bom).toBe(false);
    expect(ficha.eol).toBe('LF');
    const titulos = (ficha.secoes ?? []).map((s) => `${s.nivel} ${s.titulo}`);
    expect(titulos).toEqual([
      '1 Ficha de Saúde — membro-1',
      '2 Contatos de emergência',
      '2 Profissionais de referência',
      '2 Observações',
    ]);
    const contatos = (ficha.secoes ?? []).find((s) => s.titulo === 'Contatos de emergência');
    expect(contatos?.tabela_colunas).toEqual(['Nome', 'Relação', 'Telefone']);
    expect(contatos?.linhas).toBe(1);
  });

  it('conta os itens da lista de eventos do Historico.md', () => {
    const historico = arquivo(resultado.arquivos, 'Perfis/membro-1/Historico.md');
    const eventos = (historico.secoes ?? []).find((s) => s.titulo === 'Eventos');
    expect(eventos?.itens_lista).toBe(5);
  });

  it('salus.yaml traz as chaves YAML, sem valores', () => {
    const manifesto = arquivo(resultado.arquivos, 'salus.yaml');
    expect(manifesto.yaml_chaves).toEqual(['schema_versao', 'versao_salus', 'familia', 'criado_em', 'ultima_revisao']);
  });

  it('nenhum valor aparece na saída', () => {
    const json = JSON.stringify(resultado);
    for (const valor of ['Dipirona', 'Ana', 'Bruno', 'Mia', '2026-11-05', '90000-0001', 'Helena', 'Losartana', '68,4']) {
      expect(json, valor).not.toContain(valor);
    }
  });

  it('não conta binários num cofre só de texto', () => {
    expect(resultado.binarios).toBe(0);
  });
});

describe('inspecionar: cofre v1', () => {
  it('detecta a versão 1 pelo Familia/_index.yaml', () => {
    expect(inspecionar(v1.dir).versao_detectada).toBe('v1');
  });

  it('_index.yaml traz as chaves em notação de caminho, sem nomes nem valores', () => {
    const indice = arquivo(inspecionar(v1.dir).arquivos, 'Familia/_index.yaml');
    expect(indice.yaml_chaves).toEqual(
      expect.arrayContaining(['schema_versao', 'familia', 'membros', 'membros[].nome', 'membros[].medicamentos_em_uso[].prescrito_por']),
    );
  });

  it('arquivo CRLF reporta eol CRLF', () => {
    const historico = arquivo(inspecionar(v1.dir).arquivos, 'Perfis/membro-2/Historico.md');
    expect(historico.eol).toBe('CRLF');
  });

  it('conta os binários (o .pdf vazio, o da Caixa de Entrada e o .cursorrules sem extensão)', () => {
    expect(inspecionar(v1.dir).binarios).toBe(3);
  });

  it('nenhum nome, terceiro ou data do cofre aparece na saída', () => {
    const json = JSON.stringify(inspecionar(v1.dir));
    for (const valor of [...NOMES_V1, 'Ofelia', ...TERCEIROS_V1, '2026-03-10', '1979-05-14', '(21)', 'provedor']) {
      expect(json, valor).not.toContain(valor);
    }
  });

  it('o título de nível 1 com o nome vira "— membro-N"', () => {
    const ficha = arquivo(inspecionar(v1.dir).arquivos, 'Perfis/membro-2/Ficha.md');
    expect(ficha.secoes?.[0]?.titulo).toBe('Ficha de Saúde — membro-2');
    const meta = arquivo(inspecionar(v1.dir).arquivos, 'Familia/META.md');
    const membros = meta.secoes?.find((s) => s.titulo === 'Membros da Família');
    expect(membros?.tabela_colunas).toEqual(['Nome', 'Tipo', 'Papel na família', 'Perfil']);
    expect(membros?.linhas).toBe(2);
  });
});

describe('inspecionar: casos de borda', () => {
  it('pasta sem salus.yaml, índice nem AGENTS.md é "desconhecida"', async () => {
    const vazia = await makeTempRoot();
    try {
      const r = inspecionar(vazia);
      expect(r).toMatchObject({ versao_detectada: 'desconhecida', pastas: [], arquivos: [], binarios: 0 });
    } finally {
      await removeTempRoot(vazia);
    }
  });

  it('BOM, fim de linha misto, chave YAML com nome de membro e data no título', () => {
    const dir = copiaDoExemplo();
    fs.writeFileSync(path.join(dir, 'Familia', 'bom.md'), '﻿# Com BOM\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'misto.md'), '# Misto\r\n\nlinha\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'extra.yaml'), 'ana:\n  peso: 3\nbruno: 1\n2026-01-02: x\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'datas.md'), '# Consulta de 2026-05-04 com Bruno\n');
    const r = inspecionar(dir);
    expect(arquivo(r.arquivos, 'Familia/bom.md')).toMatchObject({ bom: true, eol: 'LF' });
    expect(arquivo(r.arquivos, 'Familia/misto.md').eol).toBe('misto');
    expect(arquivo(r.arquivos, 'Familia/extra.yaml').yaml_chaves).toEqual([
      'membro-1',
      'membro-1.peso',
      'membro-2',
      'AAAA-MM-DD',
    ]);
    expect(arquivo(r.arquivos, 'Familia/datas.md').secoes?.[0]?.titulo).toBe('Consulta de AAAA-MM-DD com membro-2');
  });

  it('não segue links simbólicos nem junções', () => {
    const dir = copiaDoExemplo();
    const fora = path.join(dir, '..', 'fora');
    fs.mkdirSync(fora);
    fs.writeFileSync(path.join(fora, 'segredo.md'), '# Segredo\n');
    fs.symlinkSync(fora, path.join(dir, 'Atalho'), 'junction');
    const r = inspecionar(dir);
    expect(r.pastas).not.toContain('Atalho');
    expect(r.arquivos.some((a) => a.caminho.startsWith('Atalho'))).toBe(false);
  });
});

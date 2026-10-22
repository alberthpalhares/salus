import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { formatarInspecao } from '../../../src/cli/comandos/inspecionar.js';
import { parseDocumento } from '../../../src/core/format/documento.js';
import { AVISO_INSPECAO, type ArquivoInspecionado, inspecionar } from '../../../src/core/inspecao/inspecionar.js';
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

  it('detecta a versão 2 pelo salus.yaml; `raiz` é só o nome da pasta, sem o caminho', () => {
    expect(resultado.versao_detectada).toBe('v2');
    expect(resultado.raiz).toBe('v2-exemplo');
    expect(JSON.stringify(resultado)).not.toContain(path.dirname(path.resolve(EXEMPLO)).replaceAll('\\', '\\\\'));
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
      '2 <título com 1 palavra>', // `## Observações` não é título de modelo
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
    fs.writeFileSync(path.join(dir, 'Familia', 'bom.md'), '\uFEFF# Com BOM\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'misto.md'), '# Misto\r\n\nlinha\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'extra.yaml'), 'ana:\n  peso: 3\nbruno: 1\n2026-01-02: x\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'datas.md'), '# Consulta de 2026-05-04 com Bruno\n');
    const r = inspecionar(dir);
    expect(arquivo(r.arquivos, 'Familia/<nome>.md')).toMatchObject({ bom: true, eol: 'LF' });
    expect(r.arquivos.filter((a) => a.caminho === 'Familia/<nome>.md').map((a) => a.eol)).toContain('misto');
    expect(arquivo(r.arquivos, 'Familia/<nome>.yaml').yaml_chaves).toEqual([
      'membro-1',
      'membro-1.peso',
      'membro-2',
      'AAAA-MM-DD',
    ]);
    const titulos = r.arquivos.flatMap((a) => (a.secoes ?? []).map((s) => s.titulo));
    expect(titulos).toContain('<título com 5 palavras>'); // `# Consulta de 2026-05-04 com Bruno`
    expect(JSON.stringify(r)).not.toMatch(/Consulta de|Misto|Com BOM/);
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

describe('inspecionar: só títulos e nomes do formato ficam íntegros', () => {
  const FRAMEWORK = path.resolve('framework');

  function cofreComConteudoClinico(): string {
    const dir = copiaDoExemplo();
    const meds = path.join(dir, 'Perfis', 'Ana', 'Medicamentos.md');
    fs.appendFileSync(meds, '\n## Internação por pneumonia\n\nTexto.\n');
    fs.mkdirSync(path.join(dir, 'Perfis', 'Ana', 'Analises'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'Perfis', 'Ana', 'Analises', 'Analise_hipotireoidismo.md'), '# Análise\n');
    fs.mkdirSync(path.join(dir, 'Perfis', 'Ana', 'Documentos', 'Tireoide'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'Perfis', 'Ana', 'Documentos', '2026-03-10_Hemograma.pdf'), '');
    fs.writeFileSync(path.join(dir, 'Perfis', 'Ana', 'Documentos', 'Tireoide', 'laudo.hipotireoidismo'), '');
    return dir;
  }

  it('título fora dos modelos e nome de arquivo fora do formato não aparecem no JSON nem no texto', () => {
    const r = inspecionar(cofreComConteudoClinico());
    const saidas = [JSON.stringify(r), formatarInspecao(r)];
    for (const saida of saidas) {
      for (const termo of ['Internação', 'pneumonia', 'hipotireoidismo', 'Hemograma', 'Tireoide', 'Analise_']) {
        expect(saida, termo).not.toContain(termo);
      }
    }
    const meds = arquivo(r.arquivos, 'Perfis/membro-1/Medicamentos.md');
    expect(meds.secoes?.map((s) => s.titulo)).toEqual([
      'Medicamentos — membro-1',
      'Em uso',
      'Prescritos',
      'Descontinuados',
      '<título com 3 palavras>',
    ]);
    expect(arquivo(r.arquivos, 'Perfis/membro-1/Vacinas.md').secoes?.map((s) => s.titulo)).toContain('Vacinas');
    expect(r.arquivos.map((a) => a.caminho)).toContain('Perfis/membro-1/Analises/<nome>.md');
    expect(r.pastas).toEqual(expect.arrayContaining(['Perfis/membro-1/Analises', 'Perfis/membro-1/Documentos/<nome>']));
  });

  it('nome de arquivo fora do formato guarda a extensão curta e a forma da data', () => {
    // binários não entram em `arquivos`: o nome é conferido pelo caminho mascarado num arquivo de texto
    const dir = copiaDoExemplo();
    fs.writeFileSync(path.join(dir, 'Familia', '2026-03-10_Hemograma.md'), '# x\n');
    fs.writeFileSync(path.join(dir, 'Familia', '2026-03-11.md'), '# x\n');
    fs.writeFileSync(path.join(dir, 'Familia', 'Notas.da.tireoide'), '');
    const caminhos = inspecionar(dir).arquivos.map((a) => a.caminho);
    expect(caminhos).toEqual(expect.arrayContaining(['Familia/AAAA-MM-DD_<nome>.md', 'Familia/AAAA-MM-DD.md']));
    expect(caminhos).toContain('Familia/Notas_para_a_IA.md'); // nome de modelo: fica
    expect(caminhos).toContain('salus.yaml');
  });

  it('`aviso` no JSON e no fim da saída em texto', () => {
    const r = inspecionar(EXEMPLO);
    expect(r.aviso).toBe(AVISO_INSPECAO);
    expect(AVISO_INSPECAO).toBe(
      'Títulos e nomes fora do formato foram trocados por marcadores; revise antes de compartilhar.',
    );
    expect(formatarInspecao(r).trimEnd().endsWith(AVISO_INSPECAO)).toBe(true);
  });

  it('todo título dos modelos v2 e v1 (sem marcador de lugar) fica íntegro: a lista vem dos próprios modelos', () => {
    const pastas = [
      path.join(FRAMEWORK, 'templates'),
      path.join(FRAMEWORK, '.agents', 'skills', 'salus-onboarding', 'templates'),
    ];
    let conferidos = 0;
    for (const pasta of pastas) {
      const r = inspecionar(pasta);
      for (const modelo of fs.readdirSync(pasta, { recursive: true, encoding: 'utf8' })) {
        if (!modelo.endsWith('.md')) continue;
        const rel = modelo.replaceAll('\\', '/');
        const esperados = parseDocumento(fs.readFileSync(path.join(pasta, modelo), 'utf8'))
          .secoes.map((s) => s.titulo)
          .filter((t) => !t.includes('['));
        const achados = arquivo(r.arquivos, rel).secoes?.map((s) => s.titulo) ?? [];
        for (const titulo of esperados) expect(achados, `${rel}: ${titulo}`).toContain(titulo);
        conferidos += esperados.length;
      }
      // nomes dos modelos e das pastas dos modelos também ficam
      expect(r.pastas.some((p) => p.includes('<nome>')), pasta).toBe(false);
      expect(r.arquivos.some((a) => a.caminho.includes('<nome>')), pasta).toBe(false);
    }
    expect(conferidos).toBeGreaterThan(60);
  });

  it('título de nível 1 de modelo com o nome: o nome vira `membro-N`; o que não é nome vira `<nome>`', () => {
    const dir = copiaDoExemplo();
    fs.writeFileSync(path.join(dir, 'Familia', 'Agenda.md'), '# Agenda de Saúde — Família\n\n# Exames — Pneumonia grave\n');
    const r = inspecionar(dir);
    expect(arquivo(r.arquivos, 'Familia/Agenda.md').secoes?.map((s) => s.titulo)).toEqual([
      'Agenda de Saúde — Família',
      'Exames — <nome>',
    ]);
    expect(arquivo(r.arquivos, 'Perfis/membro-3/Ficha.md').secoes?.[0]?.titulo).toBe('Ficha de Saúde — membro-3');
  });
});

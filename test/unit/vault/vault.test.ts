import fc from 'fast-check';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { ARQUIVOS_DE_VERDADE, codecs } from '../../../src/core/format/arquivos/index.js';
import { CODIGOS_PROBLEMA as CODIGOS_DO_FORMATO } from '../../../src/core/format/problema.js';
import { lerPerfil } from '../../../src/core/vault/perfil.js';
import { CODIGOS_PROBLEMA, type Problema } from '../../../src/core/vault/problemas.js';
import { Vault } from '../../../src/core/vault/Vault.js';

const VAULTS = fileURLToPath(new URL('../../fixtures/vaults/', import.meta.url));
const EXEMPLO = join(VAULTS, 'v2-exemplo');
const QUEBRADO = join(VAULTS, 'v2-quebrado');
/** U+FEFF, montado em vez de escrito: um caractere invisível no código não se revisa. */
const BOM = String.fromCodePoint(0xfeff);

const temporarios: string[] = [];
afterAll(() => {
  for (const dir of temporarios) rmSync(dir, { recursive: true, force: true });
});

/** Pasta temporária própria do teste (removida no fim). */
function pastaTemporaria(): string {
  const dir = mkdtempSync(join(tmpdir(), 'salus-vault-'));
  temporarios.push(dir);
  return dir;
}

/** Cópia do cofre de exemplo, para o teste estragar à vontade. */
function copiaDoExemplo(): string {
  const dir = join(pastaTemporaria(), 'Cofre');
  cpSync(EXEMPLO, dir, { recursive: true });
  return dir;
}

/** Problemas do arquivo (caminho relativo ao cofre, com `/`). */
const problemasDe = (vault: Vault, arquivo: string): ReadonlyArray<Problema> =>
  vault.problemas.filter((p) => p.arquivo === arquivo);

const lerTexto = (dir: string, relativo: string): string => readFileSync(join(dir, relativo), 'utf8');

describe('Vault.abrir — v2-exemplo', () => {
  const vault = Vault.abrir(EXEMPLO);

  it('3 membros, na ordem do nome da pasta, e nenhum problema', () => {
    expect(vault.membros.map((m) => m.id)).toEqual(['ana', 'bruno', 'mia']);
    expect(vault.membros.map((m) => m.pasta)).toEqual(['Ana', 'Bruno', 'Mia (gata)']);
    expect(vault.problemas).toEqual([]);
  });

  it('manifesto lido e `dir` absoluto', () => {
    expect(vault.manifesto).toMatchObject({ schema_versao: 2, familia: 'Exemplo', ultima_revisao: '2026-09-15' });
    expect(vault.dir).toBe(resolve(EXEMPLO));
  });

  it('`membro(id)` acha pelo id; id desconhecido dá `undefined`', () => {
    const mia = vault.membro('mia');
    expect(mia?.ficha.frontmatter.tipo).toBe('gato');
    expect(mia?.pasta).toBe('Mia (gata)');
    expect(vault.membro('ana')?.ficha.frontmatter.nome).toBe('Ana');
    expect(vault.membro('inexistente')).toBeUndefined();
    expect(vault.membro('Mia (gata)')).toBeUndefined(); // pelo id, não pela pasta
  });

  it('`estados` tem os 24 arquivos de verdade, por "<pasta>/<arquivo>", cada um com o caminho no cofre', () => {
    expect(vault.estados.size).toBe(24);
    const esperadas = ['Ana', 'Bruno', 'Mia (gata)'].flatMap((pasta) =>
      ARQUIVOS_DE_VERDADE.map((arquivo) => `${pasta}/${arquivo}`),
    );
    expect([...vault.estados.keys()].sort()).toEqual([...esperadas].sort());
    for (const [chave, estado] of vault.estados) expect(estado.arquivo).toBe(`Perfis/${chave}`);
  });

  it('agrega os oito arquivos da Ana no `Membro`', () => {
    const ana = vault.membro('ana');
    if (ana === undefined) throw new Error('sem a Ana');
    expect(ana.ficha.contatos.map((c) => c.nome)).toEqual(['Bruno']);
    expect(ana.ficha.profissionais).toHaveLength(2);
    expect(ana.medicamentos.emUso.map((m) => m.nome)).toEqual(['Losartana', 'Amoxicilina']);
    expect(ana.medicamentos.prescritos.map((m) => m.nome)).toEqual(['Atorvastatina']);
    expect(ana.medicamentos.descontinuados).toEqual([]);
    expect(ana.vacinas).toHaveLength(3);
    expect(ana.antiparasitarios).toEqual([]);
    expect(ana.exames.pesos).toHaveLength(3);
    expect(ana.exames.pressoes).toHaveLength(2);
    expect(ana.exames.glicemias).toHaveLength(1);
    expect(ana.exames.marcadores).toHaveLength(8);
    expect(ana.historico).toHaveLength(5);
    expect(ana.pendencias.examesSolicitados).toHaveLength(1);
    expect(ana.pendencias.consultas).toHaveLength(1);
    expect(ana.doses).toHaveLength(3);
    expect(ana.genetica).toEqual({ condicoes_hereditarias: ['Hipertensão'] });
  });

  it('agrega vacinas e antiparasitários da Mia (arrays separados)', () => {
    const mia = vault.membro('mia');
    expect(mia?.vacinas.map((v) => v.nome)).toEqual(['V4 (quádrupla felina)', 'Antirrábica']);
    expect(mia?.antiparasitarios.map((a) => a.produto)).toEqual(['Revolution 45 mg', 'Drontal Gatos']);
  });

  it('`opacas` junta as linhas opacas de todos os arquivos, com arquivo e linha', () => {
    // o item do `Historico.md` do Bruno que foge da gramática `- **data** [tipo] texto`
    expect(vault.opacas).toEqual([
      { arquivo: 'Perfis/Bruno/Historico.md', linha: 6, motivo: 'fora-da-gramatica' },
    ]);
    const linha = lerTexto(EXEMPLO, 'Perfis/Bruno/Historico.md').split('\n')[5];
    expect(linha).toMatch(/^- /);
    expect(linha).not.toMatch(/^- \*\*\d{4}-\d{2}-\d{2}\*\*/);
  });

  it('o `Membro` e o `estado` de cada arquivo fecham o ciclo: gravar sem mudar devolve o arquivo byte a byte', () => {
    for (const membro of vault.membros) {
      const estado = (arquivo: string) => {
        const e = vault.estados.get(`${membro.pasta}/${arquivo}`);
        if (e === undefined) throw new Error(`sem estado de ${membro.pasta}/${arquivo}`);
        return e;
      };
      const saidas: Record<string, string> = {
        'Ficha.md': codecs.ficha.escrever(estado('Ficha.md'), membro.ficha),
        'Medicamentos.md': codecs.medicamentos.escrever(estado('Medicamentos.md'), membro.medicamentos),
        'Vacinas.md': codecs.vacinas.escrever(estado('Vacinas.md'), {
          vacinas: membro.vacinas,
          antiparasitarios: membro.antiparasitarios,
        }),
        'Exames.md': codecs.exames.escrever(estado('Exames.md'), membro.exames),
        'Historico.md': codecs.historico.escrever(estado('Historico.md'), { eventos: membro.historico }),
        'Pendencias.md': codecs.pendencias.escrever(estado('Pendencias.md'), membro.pendencias),
        'Doses.md': codecs.doses.escrever(estado('Doses.md'), { doses: membro.doses }),
        'Genetica.md': codecs.genetica.escrever(estado('Genetica.md'), membro.genetica),
      };
      expect(Object.keys(saidas)).toEqual([...ARQUIVOS_DE_VERDADE]);
      for (const [arquivo, saida] of Object.entries(saidas)) {
        expect(saida, `${membro.pasta}/${arquivo}`).toBe(lerTexto(EXEMPLO, `Perfis/${membro.pasta}/${arquivo}`));
      }
    }
  });
});

describe('Vault.abrir — v2-quebrado (um arquivo ruim não derruba o cofre)', () => {
  it('não lança, e só a Ana é membro (Bruno, "Sem Ficha" e a segunda "ana" ficam de fora)', () => {
    const vault = Vault.abrir(QUEBRADO);
    expect(vault.membros.map((m) => [m.id, m.pasta])).toEqual([['ana', 'Ana']]);
    expect(vault.membro('bruno')).toBeUndefined();
    expect(vault.manifesto?.familia).toBe('Exemplo');
  });

  it('Ana com `Medicamentos.md` de cabeçalho errado: carrega, `emUso` vazio, `cabecalho_invalido` na linha 5', () => {
    const vault = Vault.abrir(QUEBRADO);
    const ana = vault.membro('ana');
    expect(ana?.medicamentos.emUso).toEqual([]);
    expect(ana?.medicamentos.prescritos).toHaveLength(1); // as outras tabelas do arquivo seguem
    expect(ana?.doses).toHaveLength(3); // e os outros arquivos também
    expect(ana?.historico).toHaveLength(5);
    expect(problemasDe(vault, 'Perfis/Ana/Medicamentos.md')).toEqual([
      { arquivo: 'Perfis/Ana/Medicamentos.md', linha: 5, codigo: 'cabecalho_invalido', mensagem: expect.any(String) },
    ]);
    // nos outros seis arquivos da Ana, nada; na `Ficha.md`, só o `id_duplicado` (o outro teste cuida dele)
    for (const arquivo of ARQUIVOS_DE_VERDADE.filter((a) => a !== 'Medicamentos.md' && a !== 'Ficha.md')) {
      expect(problemasDe(vault, `Perfis/Ana/${arquivo}`), arquivo).toEqual([]);
    }
    expect(problemasDe(vault, 'Perfis/Ana/Ficha.md').map((p) => p.codigo)).toEqual(['id_duplicado']);
  });

  it('Bruno com YAML inválido na Ficha: fora de `membros`, `yaml_invalido` com a linha; os outros arquivos dele são lidos', () => {
    const vault = Vault.abrir(QUEBRADO);
    const problemas = problemasDe(vault, 'Perfis/Bruno/Ficha.md');
    expect(problemas).toEqual([
      // a linha 3 é a do `nome: "Bruno`, com a aspa que não fecha
      { arquivo: 'Perfis/Bruno/Ficha.md', linha: 3, codigo: 'yaml_invalido', mensagem: expect.any(String) },
    ]);
    expect(vault.estados.has('Bruno/Historico.md')).toBe(true);
    expect(problemasDe(vault, 'Perfis/Bruno/Historico.md')).toEqual([]);
  });

  it('"Sem Ficha" (só o `Historico.md`): `arquivo_ausente` para cada um dos outros sete, sem membro', () => {
    const vault = Vault.abrir(QUEBRADO);
    const ausentes = vault.problemas.filter((p) => p.arquivo.startsWith('Perfis/Sem Ficha/'));
    expect(ausentes.map((p) => p.codigo)).toEqual(Array<string>(7).fill('arquivo_ausente'));
    expect(ausentes.map((p) => p.arquivo)).toEqual(
      ARQUIVOS_DE_VERDADE.filter((a) => a !== 'Historico.md').map((a) => `Perfis/Sem Ficha/${a}`),
    );
    expect(ausentes.every((p) => p.linha === undefined)).toBe(true);
    expect(vault.membros.some((m) => m.pasta === 'Sem Ficha')).toBe(false);
    expect([...vault.estados.keys()].filter((k) => k.startsWith('Sem Ficha/'))).toEqual(['Sem Ficha/Historico.md']);
  });

  it('dois perfis com o mesmo `id`: `id_duplicado` nos dois (na linha do `id`), só o primeiro entra', () => {
    const vault = Vault.abrir(QUEBRADO);
    expect(problemasDe(vault, 'Perfis/Ana/Ficha.md')).toEqual([
      { arquivo: 'Perfis/Ana/Ficha.md', linha: 2, codigo: 'id_duplicado', mensagem: expect.any(String) },
    ]);
    expect(problemasDe(vault, 'Perfis/Ana 2/Ficha.md')).toEqual([
      { arquivo: 'Perfis/Ana 2/Ficha.md', linha: 2, codigo: 'id_duplicado', mensagem: expect.any(String) },
    ]);
    expect(vault.membros.filter((m) => m.id === 'ana').map((m) => m.pasta)).toEqual(['Ana']);
    expect(vault.membro('ana')?.pasta).toBe('Ana');
    expect(vault.membro('ana')?.ficha.frontmatter.nome).toBe('Ana'); // não o "Ana Dois"
  });

  it('o conjunto de problemas é exatamente o esperado, todos com código da lista fechada', () => {
    const vault = Vault.abrir(QUEBRADO);
    const porCodigo: Record<string, number> = {};
    for (const p of vault.problemas) porCodigo[p.codigo] = (porCodigo[p.codigo] ?? 0) + 1;
    // 7 ausentes em "Sem Ficha" + 7 em "Ana 2" (que só tem a Ficha.md)
    expect(porCodigo).toEqual({ cabecalho_invalido: 1, yaml_invalido: 1, id_duplicado: 2, arquivo_ausente: 14 });
    for (const p of vault.problemas) {
      expect(CODIGOS_PROBLEMA).toContain(p.codigo);
      expect(p.mensagem).not.toBe('');
    }
  });
});

describe('Vault.abrir — cofre fora do normal', () => {
  it('pasta inexistente (ou que é um arquivo) lança "Cofre não encontrado"', () => {
    const inexistente = join(pastaTemporaria(), 'nao-existe');
    expect(() => Vault.abrir(inexistente)).toThrow(`Cofre não encontrado: ${inexistente}`);
    expect(() => Vault.abrir(join(EXEMPLO, 'salus.yaml'))).toThrow('Cofre não encontrado');
  });

  it('sem `salus.yaml`: `manifesto_invalido` sem linha, `manifesto` indefinido, e os perfis carregam', () => {
    const dir = copiaDoExemplo();
    rmSync(join(dir, 'salus.yaml'));
    const vault = Vault.abrir(dir);
    expect(vault.manifesto).toBeUndefined();
    expect(vault.problemas).toEqual([
      { arquivo: 'salus.yaml', codigo: 'manifesto_invalido', mensagem: expect.any(String) },
    ]);
    expect(vault.membros).toHaveLength(3);
  });

  it('`schema_versao` diferente de 2: `manifesto_invalido` com a linha, manifesto indefinido, perfis carregam', () => {
    const dir = copiaDoExemplo();
    writeFileSync(
      join(dir, 'salus.yaml'),
      'schema_versao: 1\nversao_salus: "0.4.0"\nfamilia: Exemplo\ncriado_em: "2026-01-15"\n',
    );
    const vault = Vault.abrir(dir);
    expect(vault.manifesto).toBeUndefined();
    expect(vault.problemas).toEqual([
      { arquivo: 'salus.yaml', linha: 1, codigo: 'manifesto_invalido', mensagem: expect.any(String) },
    ]);
    expect(vault.membros).toHaveLength(3);
  });

  it('`salus.yaml` com YAML inválido também não derruba o cofre', () => {
    const dir = copiaDoExemplo();
    writeFileSync(join(dir, 'salus.yaml'), 'schema_versao: 2\nfamilia: "Exemplo\n');
    const vault = Vault.abrir(dir);
    expect(vault.manifesto).toBeUndefined();
    expect(vault.problemas.map((p) => [p.arquivo, p.codigo])).toEqual([['salus.yaml', 'manifesto_invalido']]);
    expect(vault.membros).toHaveLength(3);
  });

  it('sem a pasta `Perfis/`: nenhum membro e um `arquivo_ausente` para a pasta', () => {
    const dir = copiaDoExemplo();
    rmSync(join(dir, 'Perfis'), { recursive: true });
    const vault = Vault.abrir(dir);
    expect(vault.membros).toEqual([]);
    expect(vault.estados.size).toBe(0);
    expect(vault.problemas).toEqual([
      { arquivo: 'Perfis', codigo: 'arquivo_ausente', mensagem: expect.any(String) },
    ]);
  });

  it('pastas ocultas e `_Backups` em `Perfis/` não são perfis; arquivo solto em `Perfis/` também não', () => {
    const dir = copiaDoExemplo();
    for (const pasta of ['.oculta', '_Backups', '_Backups 2026']) {
      mkdirSync(join(dir, 'Perfis', pasta), { recursive: true });
      writeFileSync(join(dir, 'Perfis', pasta, 'Ficha.md'), '---\nid: intruso\nnome: Intruso\ntipo: pessoa\n---\n');
    }
    writeFileSync(join(dir, 'Perfis', 'LEIA-ME.md'), 'solto\n');
    const vault = Vault.abrir(dir);
    expect(vault.membros.map((m) => m.id)).toEqual(['ana', 'bruno', 'mia']);
    expect(vault.problemas).toEqual([]);
    expect(vault.estados.size).toBe(24);
  });

  it('arquivo que não dá para ler (aqui, uma pasta no lugar do `Ficha.md`) vira `arquivo_ausente`, sem lançar', () => {
    const dir = copiaDoExemplo();
    rmSync(join(dir, 'Perfis', 'Ana', 'Ficha.md'));
    mkdirSync(join(dir, 'Perfis', 'Ana', 'Ficha.md'));
    const vault = Vault.abrir(dir);
    const problemas = problemasDe(vault, 'Perfis/Ana/Ficha.md');
    expect(problemas.map((p) => p.codigo)).toEqual(['arquivo_ausente']);
    expect(problemas[0]?.mensagem).toContain('não foi possível ler');
    expect(vault.membros.map((m) => m.id)).toEqual(['bruno', 'mia']);
  });

  it('BOM numa Ficha: problema `bom`, mas o membro continua; CR solto: `cr_solto` e o perfil fica sem membro', () => {
    const dir = copiaDoExemplo();
    const ficha = (pasta: string) => join(dir, 'Perfis', pasta, 'Ficha.md');
    writeFileSync(ficha('Ana'), BOM + lerTexto(dir, 'Perfis/Ana/Ficha.md'));
    writeFileSync(ficha('Bruno'), lerTexto(dir, 'Perfis/Bruno/Ficha.md').replace('# Ficha de Saúde — Bruno', 'A\rB'));
    const vault = Vault.abrir(dir);
    expect(problemasDe(vault, 'Perfis/Ana/Ficha.md').map((p) => p.codigo)).toEqual(['bom']);
    expect(problemasDe(vault, 'Perfis/Bruno/Ficha.md').map((p) => p.codigo)).toEqual(['cr_solto']);
    expect(vault.membros.map((m) => m.id)).toEqual(['ana', 'mia']);
  });

  it('`id` inválido na Ficha: `id_invalido` e sem membro', () => {
    const dir = copiaDoExemplo();
    const caminho = join(dir, 'Perfis', 'Mia (gata)', 'Ficha.md');
    writeFileSync(caminho, lerTexto(dir, 'Perfis/Mia (gata)/Ficha.md').replace('id: mia', 'id: "Mia Gata!"'));
    const vault = Vault.abrir(dir);
    expect(problemasDe(vault, 'Perfis/Mia (gata)/Ficha.md')).toEqual([
      { arquivo: 'Perfis/Mia (gata)/Ficha.md', linha: 2, codigo: 'id_invalido', mensagem: expect.any(String) },
    ]);
    expect(vault.membro('mia')).toBeUndefined();
  });

  it('a ordem dos membros é a do nome da pasta (com acento), não a do disco; o primeiro `id` repetido vence', () => {
    const dir = copiaDoExemplo();
    const nova = (pasta: string, id: string) => {
      mkdirSync(join(dir, 'Perfis', pasta));
      writeFileSync(join(dir, 'Perfis', pasta, 'Ficha.md'), `---\nid: ${id}\nnome: ${pasta}\ntipo: pessoa\n---\n`);
    };
    nova('Zélia', 'zelia');
    nova('Ágata', 'agata');
    nova('Bruno Dois', 'bruno'); // repete o id do Bruno, que vem antes
    const vault = Vault.abrir(dir);
    expect(vault.membros.map((m) => m.pasta)).toEqual(['Ágata', 'Ana', 'Bruno', 'Mia (gata)', 'Zélia']);
    expect(vault.membro('bruno')?.pasta).toBe('Bruno');
    expect(vault.problemas.filter((p) => p.codigo === 'id_duplicado').map((p) => p.arquivo)).toEqual([
      'Perfis/Bruno/Ficha.md',
      'Perfis/Bruno Dois/Ficha.md',
    ]);
  });
});

describe('Vault.abrir — nunca lança por conteúdo de arquivo', () => {
  const HOSTIS: ReadonlyArray<string | Uint8Array> = [
    '',
    BOM,
    '\r',
    'a\rb',
    '---',
    '---\n---\n',
    '---\nid: "\n---\n',
    '---\n- lista\n---\n',
    '---\n&a [*a]\n---\n',
    '## Eventos\n\n- **2026-02-30** [consulta] x\n',
    '| a |\n|---|\n',
    '\0\0\0',
    Uint8Array.from([0xff, 0xfe, 0x00, 0xc3, 0x28, 0xa0, 0xa1]),
    '# '.repeat(5000),
    '|'.repeat(20_000),
  ];

  /** Cofre com um perfil cujos oito arquivos (e o manifesto) têm o conteúdo dado. */
  function cofreCom(conteudos: ReadonlyArray<string | Uint8Array>, dir: string): void {
    mkdirSync(join(dir, 'Perfis', 'P'), { recursive: true });
    writeFileSync(join(dir, 'salus.yaml'), conteudos[8] ?? '');
    ARQUIVOS_DE_VERDADE.forEach((arquivo, i) => {
      writeFileSync(join(dir, 'Perfis', 'P', arquivo), conteudos[i] ?? '');
    });
  }

  function confereInvariantes(vault: Vault): void {
    const ids = vault.membros.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(vault.estados.size).toBeLessThanOrEqual(8);
    for (const p of vault.problemas) {
      expect(CODIGOS_PROBLEMA).toContain(p.codigo);
      expect(p.arquivo).not.toBe('');
      if (p.linha !== undefined) expect(Number.isInteger(p.linha) && p.linha >= 1).toBe(true);
    }
  }

  it.each(HOSTIS.map((c, i) => [i, c] as const))('conteúdo hostil nº %i em todos os arquivos', (_i, conteudo) => {
    const dir = pastaTemporaria();
    cofreCom(Array<string | Uint8Array>(9).fill(conteudo), dir);
    let vault: Vault | undefined;
    expect(() => {
      vault = Vault.abrir(dir);
    }).not.toThrow();
    if (vault !== undefined) confereInvariantes(vault);
  });

  it('propriedade: qualquer mistura de texto, pedaços de Markdown e bytes soltos não derruba `abrir`', () => {
    const pedacos = [
      '---', '## Eventos', '## Em uso', '## Peso', '## Hemograma', '| a | b |', '|---|---|', '|', '\\|',
      '- **2026-01-01** [consulta] x', '\r', BOM, 'id: ana', 'nome: X', 'tipo: gato', 'id: "', '\0', '# t', '  ', '> |', '```',
    ];
    const conteudo: fc.Arbitrary<string | Uint8Array> = fc.oneof(
      fc.string({ maxLength: 200 }),
      fc.array(fc.constantFrom(...pedacos), { maxLength: 25 }).map((l) => l.join('\n')),
      fc.array(fc.constantFrom(...pedacos), { maxLength: 25 }).map((l) => l.join('\r\n')),
      fc.uint8Array({ maxLength: 120 }),
    );
    const dir = pastaTemporaria();
    fc.assert(
      fc.property(fc.array(conteudo, { minLength: 9, maxLength: 9 }), (conteudos) => {
        cofreCom(conteudos, dir);
        confereInvariantes(Vault.abrir(dir));
      }),
      { numRuns: 60 },
    );
  });
});

describe('lerPerfil', () => {
  it('lê os oito arquivos da Ana: membro, nenhum problema e um estado por arquivo ("<pasta>/<arquivo>")', () => {
    const { membro, problemas, opacas, estados } = lerPerfil(join(EXEMPLO, 'Perfis', 'Ana'), 'Ana');
    expect(membro?.id).toBe('ana');
    expect(membro?.pasta).toBe('Ana');
    expect(problemas).toEqual([]);
    expect(opacas).toEqual([]);
    expect(Object.keys(estados)).toEqual(ARQUIVOS_DE_VERDADE.map((a) => `Ana/${a}`));
  });

  it('pasta sem nenhum arquivo: `arquivo_ausente` ×8, em ordem, sem membro e sem estado — e não lança', () => {
    const { membro, problemas, estados } = lerPerfil(join(pastaTemporaria(), 'nada'), 'Nada');
    expect(membro).toBeUndefined();
    expect(estados).toEqual({});
    expect(problemas.map((p) => [p.arquivo, p.codigo])).toEqual(
      ARQUIVOS_DE_VERDADE.map((a) => [`Perfis/Nada/${a}`, 'arquivo_ausente']),
    );
  });

  it('arquivo ausente que não é a Ficha: seção vazia, membro continua', () => {
    const dir = join(pastaTemporaria(), 'Ana');
    cpSync(join(EXEMPLO, 'Perfis', 'Ana'), dir, { recursive: true });
    rmSync(join(dir, 'Doses.md'));
    rmSync(join(dir, 'Genetica.md'));
    const { membro, problemas, estados } = lerPerfil(dir, 'Ana');
    expect(membro?.doses).toEqual([]);
    expect(membro?.genetica).toEqual({ condicoes_hereditarias: [] });
    expect(membro?.historico).toHaveLength(5);
    expect(problemas.map((p) => [p.arquivo, p.codigo])).toEqual([
      ['Perfis/Ana/Doses.md', 'arquivo_ausente'],
      ['Perfis/Ana/Genetica.md', 'arquivo_ausente'],
    ]);
    expect(Object.keys(estados)).toHaveLength(6);
  });
});

describe('problemas.ts', () => {
  it('reexporta a lista fechada de códigos do `format/`, com os códigos que o cofre usa', () => {
    expect(CODIGOS_PROBLEMA).toBe(CODIGOS_DO_FORMATO);
    for (const codigo of [
      'manifesto_invalido',
      'arquivo_ausente',
      'yaml_invalido',
      'cabecalho_invalido',
      'secao_ausente',
      'linha_invalida',
      'faixa_obrigatoria',
      'id_invalido',
      'id_duplicado',
      'bom',
    ]) {
      expect(CODIGOS_PROBLEMA).toContain(codigo);
    }
  });
});

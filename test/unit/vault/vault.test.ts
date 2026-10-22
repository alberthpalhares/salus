import fc from 'fast-check';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { type ArquivoDeVerdade, ARQUIVOS_DE_VERDADE, codecs } from '../../../src/core/format/arquivos/index.js';
import { CODIGOS_PROBLEMA as CODIGOS_DO_FORMATO } from '../../../src/core/format/problema.js';
import { classificarFalha, lerPerfil } from '../../../src/core/vault/perfil.js';
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

  it('arquivo que não dá para ler (aqui, uma pasta no lugar do `Ficha.md`) vira `arquivo_ilegivel` com o código do erro, sem lançar', () => {
    const dir = copiaDoExemplo();
    rmSync(join(dir, 'Perfis', 'Ana', 'Ficha.md'));
    mkdirSync(join(dir, 'Perfis', 'Ana', 'Ficha.md'));
    const vault = Vault.abrir(dir);
    const problemas = problemasDe(vault, 'Perfis/Ana/Ficha.md');
    expect(problemas).toEqual([
      { arquivo: 'Perfis/Ana/Ficha.md', codigo: 'arquivo_ilegivel', mensagem: expect.any(String) },
    ]);
    expect(problemas[0]?.mensagem).toContain('não foi possível ler');
    expect(problemas[0]?.mensagem).toMatch(/\(E[A-Z]+\)/); // o código do erro do Node (EISDIR), não o conteúdo
    expect(vault.membros.map((m) => m.id)).toEqual(['bruno', 'mia']);
  });

  it('`salus.yaml` que não dá para ler (uma pasta no lugar) vira `arquivo_ilegivel`; o manifesto fica indefinido e os perfis carregam', () => {
    const dir = copiaDoExemplo();
    rmSync(join(dir, 'salus.yaml'));
    mkdirSync(join(dir, 'salus.yaml'));
    const vault = Vault.abrir(dir);
    expect(vault.manifesto).toBeUndefined();
    expect(vault.estadoManifesto).toBeUndefined();
    expect(vault.problemas).toEqual([
      { arquivo: 'salus.yaml', codigo: 'arquivo_ilegivel', mensagem: expect.any(String) },
    ]);
    expect(vault.problemas[0]?.mensagem).toMatch(/\(E[A-Z]+\)/);
    expect(vault.membros).toHaveLength(3);
  });

  it('só `ENOENT` e `ENOTDIR` são "ausente"; qualquer outro código de erro é "ilegível", com o código', () => {
    const erro = (code?: string) => Object.assign(new Error('mensagem com o caminho e o conteúdo'), code ? { code } : {});
    expect(classificarFalha(erro('ENOENT'))).toEqual({ ausente: true });
    expect(classificarFalha(erro('ENOTDIR'))).toEqual({ ausente: true });
    expect(classificarFalha(erro('EACCES'))).toEqual({ ausente: false, codigo: 'EACCES' });
    expect(classificarFalha(erro('EISDIR'))).toEqual({ ausente: false, codigo: 'EISDIR' });
    expect(classificarFalha(erro('EBUSY'))).toEqual({ ausente: false, codigo: 'EBUSY' });
    expect(classificarFalha(erro())).toEqual({ ausente: false, codigo: 'erro desconhecido' });
    expect(classificarFalha('texto solto')).toEqual({ ausente: false, codigo: 'erro desconhecido' });
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
    nova('Ana 10', 'ana10'); // números por valor, como no Explorer: "Ana 2" vem antes de "Ana 10"
    nova('Ana 2', 'ana2');
    const vault = Vault.abrir(dir);
    expect(vault.membros.map((m) => m.pasta)).toEqual([
      'Ágata',
      'Ana',
      'Ana 2',
      'Ana 10',
      'Bruno',
      'Mia (gata)',
      'Zélia',
    ]);
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

  /**
   * O que vale para qualquer conteúdo (o `cofreCom` grava os oito arquivos e o manifesto, então todo
   * arquivo de verdade existe e tem estado): `membros`, `problemas`, `opacas` e `estados` bem formados.
   */
  function confereInvariantes(vault: Vault): void {
    const ids = vault.membros.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const membro of vault.membros) {
      expect(membro.pasta).toBe('P');
      expect(vault.membro(membro.id)).toBe(membro);
    }
    expect([...vault.estados.keys()].sort()).toEqual(ARQUIVOS_DE_VERDADE.map((a) => `P/${a}`).sort());
    for (const [chave, estado] of vault.estados) expect(estado.arquivo).toBe(`Perfis/${chave}`);
    const arquivos = new Set(['salus.yaml', ...ARQUIVOS_DE_VERDADE.map((a) => `Perfis/P/${a}`)]);
    for (const p of vault.problemas) {
      expect(CODIGOS_PROBLEMA).toContain(p.codigo);
      expect(arquivos, p.arquivo).toContain(p.arquivo);
      expect(p.mensagem).not.toBe('');
      if (p.linha !== undefined) expect(Number.isInteger(p.linha) && p.linha >= 1).toBe(true);
    }
    for (const o of vault.opacas) {
      expect(arquivos, o.arquivo).toContain(o.arquivo);
      expect(Number.isInteger(o.linha) && o.linha >= 1).toBe(true);
      expect(o.motivo).not.toBe('');
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

  /** Tabela completa (`## seção`, cabeçalho, delimitador, linhas) no formato do FORMATO.md. */
  const tabela = (secao: string, colunas: readonly string[], ...linhas: string[]): string =>
    [`## ${secao}`, '', `| ${colunas.join(' | ')} |`, `|${'---|'.repeat(colunas.length)}`, ...linhas, ''].join('\n');
  const EM_USO = ['Medicamento', 'Dose', 'Frequência', 'Via', 'Desde', 'Prescrito por', 'Renova em', 'Término em', 'Obs'];
  const MARCADORES = ['Data', 'Marcador', 'Valor', 'Unidade', 'Faixa do laudo', 'Flag', 'Obs'];
  const FRONTMATTER = (...linhas: string[]): string => ['---', ...linhas, '---', ''].join('\n');

  /**
   * Blocos de Markdown por arquivo, com os cabeçalhos canônicos de verdade e linhas válidas e inválidas
   * (data que não existe, hora fora de HH:MM, tipo fora do vocabulário, flag sem faixa do laudo...):
   * é o que faz a propriedade chegar à validação linha a linha, e não só ao reconhecimento do arquivo.
   */
  const BLOCOS: Record<ArquivoDeVerdade, readonly string[]> = {
    'Ficha.md': [
      FRONTMATTER('id: ana', 'nome: Ana', 'tipo: pessoa', 'nascimento: "1985-03-10"', 'alergias: ["Dipirona"]'),
      FRONTMATTER('id: ana', 'nome: Ana', 'tipo: pessoa', 'nascimento: "1985-02-30"'), // linha_invalida (opcional)
      FRONTMATTER('id: "Ana Maria"', 'nome: Ana', 'tipo: pessoa'), // id_invalido
      FRONTMATTER('id: ana', 'nome: Ana', 'tipo: avestruz'), // tipo fora do vocabulário
      tabela('Contatos de emergência', ['Nome', 'Relação', 'Telefone'], '| Bruno | Cônjuge | (11) 90000-0001 |', '|  | Mãe | (11) 3000-0000 |'),
      tabela('Profissionais de referência', ['Nome', 'Especialidade', 'Contato', 'Acompanha'], '| Dra. Helena | Cardiologia | | |'),
    ],
    'Medicamentos.md': [
      tabela('Em uso', EM_USO, '| Losartana | 50 mg | 1x ao dia | oral | 2024-08-20 | Dra. Helena | 2026-11-05 | | |', '| Dipirona | 1 g | se dor | oral | 2026-13-45 | | | | |'),
      tabela('Prescritos', ['Medicamento', 'Dose', 'Frequência', 'Data da receita', 'Prescrito por', 'Validade da receita', 'Obs'], '| Atorvastatina | 20 mg | à noite | 2026-10-10 | Dra. Helena | 2026-12-01 | |'),
      tabela('Descontinuados', ['Medicamento', 'Dose', 'Frequência', 'Início', 'Fim', 'Prescrito por', 'Motivo'], '| | | | | | | |', '| Aspirina | 100 mg | 1x | 2025-01-01 | 2025-02-30 | | |'),
    ],
    'Vacinas.md': [
      tabela('Vacinas', ['Vacina', 'Aplicada em', 'Próxima em', 'Obs'], '| Influenza | 2026-04-15 | 2027-04-15 | |', '| dT | 2022-02-30 | | |'),
      tabela('Antiparasitários', ['Produto', 'Tipo', 'Aplicado em', 'Próximo em', 'Obs'], '| Revolution | antipulgas | 2026-09-30 | 2026-10-30 | |', '| Drontal | xpto | 2026-08-10 | | |'),
      '## Antiparasitários\n\nainda nada\n',
      '## Antiparasitários\n\n| Produto | Tipo | Aplicado em | Próximo em | Obs |\n| Revolution | antipulgas | 2026-09-30 | | |\n',
    ],
    'Exames.md': [
      tabela('Peso', ['Data', 'Peso (kg)', 'Obs'], '| 2026-03-10 | 68,4 | |', '| 2026-03-10 | abc | |'),
      tabela('Pressão arterial', ['Data', 'Sistólica', 'Diastólica', 'FC', 'Obs'], '| 2026-09-15 | 128 | 82 | 72 | |', '| 2026-09-15 | alta | 82 | 72 | |'),
      tabela('Glicemia', ['Data', 'Hora', 'Valor (mg/dL)', 'Condição', 'Obs'], '| 2026-09-15 | 07:30 | 92 | jejum | |', '| 2026-09-15 | 25:99 | 92 | jejum | |'),
      tabela('Hemograma', MARCADORES, '| 2026-03-10 | Hemoglobina | 13,2 | g/dL | 12,0 a 15,5 | normal | |'),
      tabela('Hemograma', MARCADORES, '| 2026-03-10 | Hemoglobina | 13,2 | g/dL | | alto | |'), // faixa_obrigatoria
      tabela('Anotações', ['Data', 'Nota'], '| 2026-10-01 | algo |'),
    ],
    'Historico.md': [
      '## Eventos\n\n- **2026-01-01** [consulta] Consulta de rotina.\n- **2026-02-30** [consulta] Data que não existe.\n',
      '## Eventos\n\n- **2026-01-01** [xpto] Tipo fora do vocabulário.\n- Linha fora da gramática\n\n- **2026-03-01** Sem tipo.\n',
      '## Eventos\n\nainda nenhum\n',
    ],
    'Pendencias.md': [
      tabela('Exames solicitados', ['Exame', 'Solicitado em', 'Solicitado por', 'Realizar até', 'Obs'], '| Perfil lipídico | 2026-10-10 | Dra. Helena | 2027-02-15 | |', '| Glicemia | 2026-10-10 | | 2027-02-31 | |'),
      tabela('Consultas e check-ups', ['Tipo', 'Data', 'Profissional', 'Obs'], '| Retorno | 2027-03-18 | Dra. Helena | |', '| Retorno | 18/03/2027 | | |'),
    ],
    'Doses.md': [
      tabela('Doses', ['Data', 'Hora', 'Medicamento', 'Dose', 'Obs'], '| 2026-10-20 | 08:00 | Losartana | 50 mg | |', '| 2026-10-20 | 8h | Losartana | 50 mg | |'),
    ],
    'Genetica.md': [
      FRONTMATTER('condicoes_hereditarias: ["Hipertensão"]'),
      FRONTMATTER('condicoes_hereditarias: sim'),
      FRONTMATTER('condicoes_hereditarias:'),
    ],
  };

  // Ruído que vale para qualquer arquivo: delimitadores soltos, CR, BOM, NUL, acentos, markdown torto.
  const RUIDO = [
    '---', '|', '\\|', '|---|---|', '| ação | é | ü |', '\r', BOM, '\0', '# título', '  ', '> | citado |', '```', '- item',
    'Ünïcödé — “aspas” ç ã õ é', 'id: "', '*alias',
  ];
  const ACENTUADOS = ['ç', 'ã', 'õ', 'é', 'Â', 'ü', 'ñ', '—', '“', String.fromCodePoint(0x1f431), String.fromCodePoint(0x301)];

  const conteudoDe = (arquivo: ArquivoDeVerdade): fc.Arbitrary<string | Uint8Array> => {
    const blocos = fc.array(fc.constantFrom(...BLOCOS[arquivo], ...RUIDO), { maxLength: 12 });
    return fc.oneof(
      { weight: 5, arbitrary: blocos.map((l) => l.join('\n')) },
      { weight: 2, arbitrary: blocos.map((l) => l.join('\r\n')) },
      { weight: 1, arbitrary: fc.string({ unit: 'grapheme', maxLength: 120 }) },
      { weight: 1, arbitrary: fc.string({ unit: fc.constantFrom(...ACENTUADOS, '|', ' ', '\n', '-', '#', '*'), maxLength: 120 }) },
      { weight: 1, arbitrary: fc.uint8Array({ maxLength: 120 }) },
    );
  };
  const MANIFESTO = [
    'schema_versao: 2', 'versao_salus: "0.5.0"', 'familia: Exemplo', 'criado_em: "2026-01-15"', 'ultima_revisao: null',
    'schema_versao: 1', 'criado_em: "2026-02-30"', '*x', '&a [*a]', '- lista', 'familia: "',
  ];
  const conteudoDoManifesto: fc.Arbitrary<string | Uint8Array> = fc.oneof(
    { weight: 3, arbitrary: fc.array(fc.constantFrom(...MANIFESTO), { maxLength: 8 }).map((l) => l.join('\n')) },
    { weight: 1, arbitrary: fc.string({ unit: 'grapheme', maxLength: 60 }) },
  );

  // Só o que vale para toda entrada: `abrir` volta sem lançar e o resultado é bem formado. Que cada código
  // de problema apareça é do teste determinístico abaixo: o gerador aleatório não garante nenhum deles
  // (o frontmatter, por exemplo, só é reconhecido se o bloco `---` abre o arquivo).
  it('propriedade: texto, blocos de Markdown válidos e inválidos e bytes soltos nos nove arquivos não derrubam `abrir`', () => {
    const dir = pastaTemporaria();
    fc.assert(
      fc.property(fc.tuple(...ARQUIVOS_DE_VERDADE.map(conteudoDe), conteudoDoManifesto), (conteudos) => {
        cofreCom(conteudos, dir);
        confereInvariantes(Vault.abrir(dir));
      }),
      { numRuns: 120 },
    );
  });

  it('um perfil com cada defeito uma vez: os cinco códigos de validação saem, cada um no arquivo certo, e `abrir` não lança', () => {
    const dir = pastaTemporaria();
    const perfil = join(dir, 'Perfis', 'P');
    mkdirSync(perfil, { recursive: true });
    const escrever = (arquivo: string, conteudo: string) => writeFileSync(join(perfil, arquivo), conteudo);
    writeFileSync(join(dir, 'salus.yaml'), lerTexto(EXEMPLO, 'salus.yaml'));
    // id_invalido: o `id` do frontmatter (linha 2) não é um slug
    escrever('Ficha.md', FRONTMATTER('id: "Ana Maria"', 'nome: Ana', 'tipo: pessoa'));
    // linha_invalida: linha de `## Em uso` com data que não existe (linha 5)
    escrever(
      'Medicamentos.md',
      tabela('Em uso', EM_USO, '| Dipirona | 1 g | se dor | oral | 2026-13-45 | | | | |'),
    );
    // faixa_obrigatoria: marcador com flag e sem a faixa do laudo (linha 5)
    escrever('Exames.md', tabela('Hemograma', MARCADORES, '| 2026-03-10 | Hemoglobina | 13,2 | g/dL | | alto | |'));
    // cabecalho_invalido: a primeira coluna de `## Doses` não é `Data` (linha 3, a do cabeçalho)
    escrever(
      'Doses.md',
      tabela('Doses', ['Dia', 'Hora', 'Medicamento', 'Dose', 'Obs'], '| 2026-10-20 | 08:00 | Losartana | 50 mg | |'),
    );
    // secao_ausente: `## Antiparasitários` com linhas `|` e sem a linha `|---|`: a tabela não é reconhecida
    const vacinas = [
      tabela('Vacinas', ['Vacina', 'Aplicada em', 'Próxima em', 'Obs'], '| Influenza | 2026-04-15 | 2027-04-15 | |'),
      '## Antiparasitários',
      '',
      '| Produto | Tipo | Aplicado em | Próximo em | Obs |',
      '| Revolution | antipulgas | 2026-09-30 | | |',
      '',
    ].join('\n');
    escrever('Vacinas.md', vacinas);
    const linhaDoCabecalho = vacinas.split('\n').indexOf('## Antiparasitários') + 1;

    let vault: Vault | undefined;
    expect(() => {
      vault = Vault.abrir(dir);
    }).not.toThrow();
    if (vault === undefined) throw new Error('abrir não devolveu o cofre');

    const esperados: ReadonlyArray<readonly [string, string, number]> = [
      ['Perfis/P/Ficha.md', 'id_invalido', 2],
      ['Perfis/P/Medicamentos.md', 'linha_invalida', 5],
      ['Perfis/P/Exames.md', 'faixa_obrigatoria', 5],
      ['Perfis/P/Doses.md', 'cabecalho_invalido', 3],
      ['Perfis/P/Vacinas.md', 'secao_ausente', linhaDoCabecalho],
    ];
    for (const [arquivo, codigo, linha] of esperados) {
      const doArquivo = problemasDe(vault, arquivo);
      expect(
        doArquivo.map((p) => [p.codigo, p.linha]),
        arquivo,
      ).toContainEqual([codigo, linha]);
    }
    // `Ficha.md` sem `id` válido: o perfil não vira membro, mas os outros arquivos foram lidos e validados
    expect(vault.membros).toEqual([]);
    expect(vault.estados.size).toBe(5);
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

  it('arquivo ilegível (pasta no lugar do `Genetica.md`): `arquivo_ilegivel`, seção vazia, membro continua, sem estado', () => {
    const dir = join(pastaTemporaria(), 'Ana');
    cpSync(join(EXEMPLO, 'Perfis', 'Ana'), dir, { recursive: true });
    rmSync(join(dir, 'Genetica.md'));
    mkdirSync(join(dir, 'Genetica.md'));
    const { membro, problemas, estados } = lerPerfil(dir, 'Ana');
    expect(problemas.map((p) => [p.arquivo, p.codigo])).toEqual([['Perfis/Ana/Genetica.md', 'arquivo_ilegivel']]);
    expect(membro?.genetica).toEqual({ condicoes_hereditarias: [] });
    expect(membro?.historico).toHaveLength(5);
    expect(estados['Ana/Genetica.md']).toBeUndefined();
    expect(Object.keys(estados)).toHaveLength(7);
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
      'arquivo_ilegivel',
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

import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { ARQUIVOS_DE_VERDADE } from '../../../src/core/format/arquivos/index.js';
import { calcularAgenda } from '../../../src/core/queries/agenda.js';
import { buscar, MAXIMO_OCORRENCIAS, MAXIMO_TRECHO } from '../../../src/core/queries/buscar.js';
import { serieMarcador } from '../../../src/core/queries/marcador.js';
import { listarMembros } from '../../../src/core/queries/membros.js';
import { normalizarParaBusca } from '../../../src/core/queries/normalizar.js';
import { lerPerfil, SECOES, type Secao } from '../../../src/core/queries/perfil.js';
import { Vault } from '../../../src/core/vault/Vault.js';
import { copiaDoExemplo, EXEMPLO, removerCopias, substituir } from '../../helpers/cofre-exemplo.js';

afterAll(removerCopias);

const vault = Vault.abrir(EXEMPLO);

/** Linhas (1-based) do arquivo do cofre que contêm `termo` (ASCII em minúsculas): a verdade independente da busca. */
function linhasCom(dir: string, relativo: string, termo: string): number[] {
  return readFileSync(join(dir, relativo), 'utf8')
    .replaceAll('\r\n', '\n')
    .split('\n')
    .flatMap((linha, i) => (linha.toLowerCase().includes(termo) ? [i + 1] : []));
}

describe('listarMembros', () => {
  it('devolve os 3 membros do exemplo, ordenados por nome, com o resumo de cada um', () => {
    expect(listarMembros(vault)).toEqual([
      {
        id: 'ana',
        nome: 'Ana',
        tipo: 'pessoa',
        pasta: 'Ana',
        nascimento: '1985-03-10',
        alergias: ['Dipirona'],
        condicoes_ativas: ['Hipertensão'],
        papel: 'Mãe',
      },
      {
        id: 'bruno',
        nome: 'Bruno',
        tipo: 'pessoa',
        pasta: 'Bruno',
        nascimento: '1983-07-22',
        alergias: [],
        condicoes_ativas: [],
        papel: 'Pai',
      },
      {
        id: 'mia',
        nome: 'Mia',
        tipo: 'gato',
        pasta: 'Mia (gata)',
        nascimento: '2021-05-01',
        alergias: null,
        condicoes_ativas: [],
        papel: 'Gata da família',
      },
    ]);
  });

  it('ordena pelo nome, não pela pasta: sem distinguir acento nem caixa, e número por valor', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Ana/Ficha.md', 'nome: Ana\n', 'nome: Zélia\n');
    substituir(dir, 'Perfis/Bruno/Ficha.md', 'nome: Bruno\n', 'nome: Álvaro 10\n');
    substituir(dir, 'Perfis/Mia (gata)/Ficha.md', 'nome: Mia\n', 'nome: álvaro 2\n');
    const aberto = Vault.abrir(dir);
    expect(aberto.membros.map((m) => m.id)).toEqual(['ana', 'bruno', 'mia']); // ordem das pastas
    expect(listarMembros(aberto).map((m) => m.nome)).toEqual(['álvaro 2', 'Álvaro 10', 'Zélia']);
  });

  it('cofre sem nenhum membro dá lista vazia, e as outras consultas também não lançam', () => {
    const dir = copiaDoExemplo();
    rmSync(join(dir, 'Perfis'), { recursive: true });
    const vazio = Vault.abrir(dir);
    expect(vazio.membros).toEqual([]);
    expect(listarMembros(vazio)).toEqual([]);
    expect(lerPerfil(vazio, 'ana')).toBeUndefined();
    expect(buscar(vazio, 'dipirona')).toEqual([]);
    expect(serieMarcador(vazio, 'ana', 'Colesterol total')).toEqual([]);
    expect(calcularAgenda(vazio, '2026-10-21')).toEqual({ hoje: '2026-10-21', vencido: [], ate30: [], de31a90: [], semData: [] });
  });
});

describe('lerPerfil', () => {
  it('com `secoes` devolve só essas chaves', () => {
    const perfil = lerPerfil(vault, 'ana', ['medicamentos']);
    expect(perfil).toBeDefined();
    expect(Object.keys(perfil ?? {})).toEqual(['medicamentos']);
    expect(perfil?.medicamentos?.emUso.map((m) => m.nome)).toEqual(['Losartana', 'Amoxicilina']);
  });

  it('devolve as chaves na ordem pedida, sem repetir', () => {
    const perfil = lerPerfil(vault, 'ana', ['exames', 'ficha', 'exames']);
    expect(Object.keys(perfil ?? {})).toEqual(['exames', 'ficha']);
  });

  it('a seção `vacinas` traz as duas tabelas do `Vacinas.md`: vacinas e antiparasitários', () => {
    const perfil = lerPerfil(vault, 'mia', ['vacinas']);
    expect(Object.keys(perfil ?? {})).toEqual(['vacinas', 'antiparasitarios']);
    expect(perfil?.antiparasitarios?.map((a) => a.produto)).toEqual(['Revolution 45 mg', 'Drontal Gatos']);
  });

  it('cada seção devolve o que o `Membro` guarda dela', () => {
    const ana = vault.membro('ana');
    expect(lerPerfil(vault, 'ana', ['genetica'])).toEqual({ genetica: { condicoes_hereditarias: ['Hipertensão'] } });
    expect(lerPerfil(vault, 'ana', ['pendencias'])).toEqual({ pendencias: ana?.pendencias });
    expect(lerPerfil(vault, 'ana', ['historico'])?.historico).toHaveLength(5);
    expect(lerPerfil(vault, 'ana', ['doses'])?.doses).toHaveLength(3);
    expect(lerPerfil(vault, 'ana', ['ficha'])?.ficha?.frontmatter.nome).toBe('Ana');
    for (const secao of SECOES) expect(Object.keys(lerPerfil(vault, 'ana', [secao]) ?? {}).length).toBeGreaterThan(0);
  });

  it('sem `secoes` devolve o `Membro` inteiro, e nada de `estados`', () => {
    const completo = lerPerfil(vault, 'ana');
    expect(completo).toEqual(vault.membro('ana'));
    expect(Object.keys(completo ?? {}).sort()).toEqual(
      ['id', 'pasta', 'ficha', 'medicamentos', 'vacinas', 'antiparasitarios', 'exames', 'historico', 'pendencias', 'doses', 'genetica'].sort(),
    );
    const texto = JSON.stringify(completo);
    expect(texto).not.toContain('"fonte"');
    expect(texto).not.toContain('"estados"');
    expect(texto).not.toContain('tinhaBom');
  });

  it('`id` desconhecido dá `undefined`; o nome da pasta não é id', () => {
    expect(lerPerfil(vault, 'zzz')).toBeUndefined();
    expect(lerPerfil(vault, 'zzz', ['ficha'])).toBeUndefined();
    expect(lerPerfil(vault, 'Mia (gata)')).toBeUndefined();
  });

  it('`secoes` vazio devolve objeto sem chaves; seção desconhecida lança RangeError', () => {
    expect(lerPerfil(vault, 'ana', [])).toEqual({});
    const invalidas: string[] = ['inexistente'];
    expect(() => lerPerfil(vault, 'ana', invalidas as Secao[])).toThrow(RangeError);
  });
});

describe('buscar', () => {
  it('acha "dipirona" na Ficha da Ana, nas duas linhas, ignorando acento e caixa', () => {
    const esperadas = linhasCom(EXEMPLO, 'Perfis/Ana/Ficha.md', 'dipirona');
    expect(esperadas).toEqual([11, 22]);
    const achadas = buscar(vault, 'dipirona');
    expect(achadas.map((o) => [o.membro, o.arquivo, o.linha])).toEqual(
      esperadas.map((linha) => ['ana', 'Perfis/Ana/Ficha.md', linha]),
    );
    expect(achadas[0]?.trecho).toBe('alergias: ["Dipirona"]');
    expect(achadas[1]?.trecho.startsWith('Ana prefere consultas pela manhã')).toBe(true);
    expect(buscar(vault, 'DIPIRÔNA')).toEqual(achadas);
    expect(buscar(vault, '  Dípirona ')).toEqual(achadas);
  });

  it('o texto do cofre é que perde o acento: "hipertensao" acha "Hipertensão"', () => {
    const achadas = buscar(vault, 'hipertensao');
    expect(achadas.length).toBeGreaterThan(0);
    expect(achadas.every((o) => o.membro === 'ana')).toBe(true);
    expect(achadas.map((o) => o.arquivo)).toContain('Perfis/Ana/Genetica.md');
  });

  it('espaços do texto procurado se juntam num só: "pressão   arterial" acha o cabeçalho', () => {
    const achadas = buscar(vault, 'pressão   arterial');
    expect(achadas.some((o) => o.arquivo === 'Perfis/Ana/Exames.md' && o.trecho === '## Pressão arterial')).toBe(true);
  });

  it('resultados em ordem de membro, depois de arquivo de verdade, depois de linha', () => {
    const achadas = buscar(vault, 'a');
    expect(achadas.length).toBeGreaterThan(50);
    const ordemMembro = ['ana', 'bruno', 'mia'];
    const chaves = achadas.map((o) => {
      const arquivo = o.arquivo.split('/').at(-1) as (typeof ARQUIVOS_DE_VERDADE)[number];
      return [ordemMembro.indexOf(o.membro), ARQUIVOS_DE_VERDADE.indexOf(arquivo), o.linha];
    });
    const ordenadas = [...chaves].sort((x, y) => (x[0] ?? 0) - (y[0] ?? 0) || (x[1] ?? 0) - (y[1] ?? 0) || (x[2] ?? 0) - (y[2] ?? 0));
    expect(chaves).toEqual(ordenadas);
    expect(chaves.every(([m, a]) => m !== -1 && a !== -1)).toBe(true);
  });

  it('o caminho vem relativo ao cofre, com a pasta do membro como está (parênteses e espaço)', () => {
    const [achada] = buscar(vault, 'revolution');
    const [linha] = linhasCom(EXEMPLO, 'Perfis/Mia (gata)/Vacinas.md', 'revolution');
    expect(achada).toEqual({
      membro: 'mia',
      arquivo: 'Perfis/Mia (gata)/Vacinas.md',
      linha,
      trecho: '| Revolution 45 mg | antipulgas | 2026-09-30 | 2026-10-30 | Aplicação mensal |',
    });
    expect(buscar(vault, 'influenza').map((o) => [o.membro, o.arquivo])).toEqual([
      ['ana', 'Perfis/Ana/Vacinas.md'],
      ['bruno', 'Perfis/Bruno/Vacinas.md'],
    ]);
  });

  it('só varre os arquivos de verdade: `salus.yaml`, `Familia/` e a Caixa de Entrada ficam de fora', () => {
    expect(buscar(vault, 'schema_versao')).toEqual([]);
    expect(buscar(vault, 'dois adultos')).toEqual([]);
    expect(buscar(vault, 'organiza a caixa de entrada')).toEqual([]);
  });

  it('texto vazio, só de espaços ou sem ocorrência dá lista vazia', () => {
    expect(buscar(vault, '')).toEqual([]);
    expect(buscar(vault, '   \t ')).toEqual([]);
    expect(buscar(vault, 'xyzzy-nao-existe')).toEqual([]);
  });

  it('só varre perfis que viraram membros: pasta cujo `id` é inválido não entra', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Bruno/Ficha.md', 'id: bruno\n', 'id: Bruno Inválido\n');
    const aberto = Vault.abrir(dir);
    expect(aberto.membros.map((m) => m.id)).toEqual(['ana', 'mia']);
    expect(aberto.estados.has('Bruno/Vacinas.md')).toBe(true); // o arquivo foi lido, mas Bruno não é membro
    expect(buscar(aberto, 'febre amarela')).toEqual([]);
    expect(buscar(aberto, 'influenza').map((o) => o.membro)).toEqual(['ana']);
  });

  it('apara o trecho, limita a 200 caracteres e não corta par substituto ao meio', () => {
    const dir = copiaDoExemplo();
    const arquivo = join(dir, 'Perfis/Ana/Ficha.md');
    const longa = `tomografia ${'x'.repeat(300)}`;
    const comEmoji = `${'y'.repeat(MAXIMO_TRECHO - 1)}😀 zircônio`;
    writeFileSync(arquivo, `${readFileSync(arquivo, 'utf8')}\n   urticária por tomografia   \n${longa}\n${comEmoji}\n`);
    const aberto = Vault.abrir(dir);
    const achadas = buscar(aberto, 'tomografia');
    expect(achadas.map((o) => o.trecho.length)).toEqual([24, MAXIMO_TRECHO]);
    expect(achadas[0]?.trecho).toBe('urticária por tomografia');
    expect(achadas[1]?.trecho).toBe(longa.slice(0, MAXIMO_TRECHO));
    const [cortada] = buscar(aberto, 'zirconio');
    expect(cortada?.trecho).toBe('y'.repeat(MAXIMO_TRECHO - 1)); // o par de 😀 não cabe inteiro: sai por inteiro
  });

  it('para em 200 ocorrências, as primeiras na ordem', () => {
    const dir = copiaDoExemplo();
    const arquivo = join(dir, 'Perfis/Ana/Ficha.md');
    const linhas = Array.from({ length: 250 }, (_, i) => `vitaminax ${i + 1}`).join('\n');
    writeFileSync(arquivo, `${readFileSync(arquivo, 'utf8')}\n${linhas}\n`);
    const esperadas = linhasCom(dir, 'Perfis/Ana/Ficha.md', 'vitaminax');
    expect(esperadas).toHaveLength(250);
    const achadas = buscar(Vault.abrir(dir), 'vitaminax');
    expect(MAXIMO_OCORRENCIAS).toBe(200);
    expect(achadas).toHaveLength(200);
    expect(achadas.map((o) => o.linha)).toEqual(esperadas.slice(0, 200));
    expect(achadas[0]).toEqual({ membro: 'ana', arquivo: 'Perfis/Ana/Ficha.md', linha: esperadas[0], trecho: 'vitaminax 1' });
    expect(achadas[199]?.trecho).toBe('vitaminax 200');
  });

  it('com fim de linha CRLF o número da linha e o trecho são os mesmos, sem `\\r`', () => {
    const dir = copiaDoExemplo();
    const arquivo = join(dir, 'Perfis/Mia (gata)/Vacinas.md');
    writeFileSync(arquivo, readFileSync(arquivo, 'utf8').replaceAll('\n', '\r\n'));
    const [achada] = buscar(Vault.abrir(dir), 'revolution');
    const [linha] = linhasCom(EXEMPLO, 'Perfis/Mia (gata)/Vacinas.md', 'revolution');
    expect(achada?.linha).toBe(linha);
    expect(achada?.trecho.endsWith('|')).toBe(true);
    expect(achada?.trecho).not.toContain('\r');
  });
});

describe('serieMarcador', () => {
  it('devolve os 2 pontos de "Colesterol total" da Ana, em ordem de data, com valor numérico', () => {
    expect(serieMarcador(vault, 'ana', 'Colesterol total')).toEqual([
      {
        data: '2026-03-10',
        valor: '212',
        valorNumerico: 212,
        unidade: 'mg/dL',
        faixa_do_laudo: '< 190',
        flag: 'alto',
        exame: 'Hemograma',
      },
      {
        data: '2026-09-15',
        valor: '188',
        valorNumerico: 188,
        unidade: 'mg/dL',
        faixa_do_laudo: '< 190',
        flag: 'normal',
        exame: 'Hemograma',
      },
    ]);
  });

  it('compara o nome sem acento, sem caixa e com espaços juntados', () => {
    const esperado = serieMarcador(vault, 'ana', 'Leucócitos');
    expect(esperado.map((p) => p.valorNumerico)).toEqual([6800, 7200]);
    expect(serieMarcador(vault, 'ana', 'leucocitos')).toEqual(esperado);
    expect(serieMarcador(vault, 'ana', '  LEUCÓCITOS ')).toEqual(esperado);
    expect(serieMarcador(vault, 'ana', 'colesterol   TOTAL')).toHaveLength(2);
  });

  it('vírgula decimal vira número; o texto do laudo segue intacto em `valor`', () => {
    const pontos = serieMarcador(vault, 'ana', 'Hemoglobina');
    expect(pontos.map((p) => [p.valor, p.valorNumerico])).toEqual([
      ['13,2', 13.2],
      ['13,8', 13.8],
    ]);
  });

  it('o nome tem de ser igual, não só conter: "colesterol" não acha "Colesterol total"', () => {
    expect(serieMarcador(vault, 'ana', 'colesterol')).toEqual([]);
  });

  it('marcador sem registro, e `id` desconhecido, dão lista vazia', () => {
    expect(serieMarcador(vault, 'ana', 'Ferritina')).toEqual([]);
    expect(serieMarcador(vault, 'zzz', 'Colesterol total')).toEqual([]);
    expect(serieMarcador(vault, 'mia', 'Colesterol total')).toEqual([]);
    expect(serieMarcador(vault, 'ana', '')).toEqual([]);
  });

  it('só traz o marcador do membro pedido', () => {
    expect(serieMarcador(vault, 'bruno', 'Leucócitos').map((p) => [p.data, p.valor, p.flag])).toEqual([
      ['2026-08-20', '11800', 'alto'],
    ]);
  });

  it('ordena por data mesmo quando o arquivo está fora de ordem, e valor que não é número dá `null`', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Ana/Exames.md', '| 2026-03-10 | Colesterol total |', '| 2026-12-01 | Colesterol total |');
    substituir(dir, 'Perfis/Ana/Exames.md', '| 188 | mg/dL |', '| negativo | mg/dL |');
    const pontos = serieMarcador(Vault.abrir(dir), 'ana', 'Colesterol total');
    expect(pontos.map((p) => [p.data, p.valor, p.valorNumerico])).toEqual([
      ['2026-09-15', 'negativo', null],
      ['2026-12-01', '212', 212],
    ]);
  });
});

describe('normalizarParaBusca', () => {
  it('tira acento, ignora caixa, junta espaços e apara as pontas', () => {
    expect(normalizarParaBusca('  Pressão   ARTERIAL \t')).toBe('pressao arterial');
    expect(normalizarParaBusca('Coração, ação e Ç')).toBe('coracao, acao e c');
  });

  it('normaliza antes de tirar a marca: forma decomposta e composta dão o mesmo texto', () => {
    expect(normalizarParaBusca('Leucócitos')).toBe(normalizarParaBusca('Leucócitos'));
    expect(normalizarParaBusca('Leucócitos')).toBe('leucocitos');
  });

  it('não mexe no que não é letra com marca: símbolos, números e emoji ficam', () => {
    expect(normalizarParaBusca('mil/mm³ 😀 < 190')).toBe('mil/mm³ 😀 < 190');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Document } from 'yaml';
import * as doses from '../../../../src/core/format/arquivos/doses.js';
import * as exames from '../../../../src/core/format/arquivos/exames.js';
import * as ficha from '../../../../src/core/format/arquivos/ficha.js';
import * as genetica from '../../../../src/core/format/arquivos/genetica.js';
import * as historico from '../../../../src/core/format/arquivos/historico.js';
import {
  ARQUIVOS_DE_VERDADE,
  CODEC_DO_ARQUIVO,
  type Codec,
  codecs,
  type EstadoArquivo,
} from '../../../../src/core/format/arquivos/index.js';
import * as medicamentos from '../../../../src/core/format/arquivos/medicamentos.js';
import * as pendencias from '../../../../src/core/format/arquivos/pendencias.js';
import * as vacinas from '../../../../src/core/format/arquivos/vacinas.js';
import { CODIGOS_PROBLEMA } from '../../../../src/core/format/problema.js';
import { BOM, lerFixture, linhas, MEMBROS, PERFIL_LIPIDICO, perfil, problema } from './apoio.js';

const ctx = (arquivo: string) => ({ arquivo });

/** Tabela lida de uma região (`chave` = campo do modelo); falha o teste se não houver. */
function regiaoTabela(estado: EstadoArquivo, chave: string) {
  const regiao = estado.regioes.find((r) => r.chave === chave);
  if (regiao?.tipo !== 'tabela') throw new Error(`sem região de tabela '${chave}'`);
  return regiao;
}

describe('Ana — leitura do cofre de exemplo', () => {
  it('Medicamentos: 2 em uso (renova_em e termino_em), 1 prescrito, linha de modelo vazia ignorada', () => {
    const arquivo = perfil('Ana', 'Medicamentos.md');
    const { dados, problemas, opacas } = medicamentos.ler(lerFixture(arquivo), ctx(arquivo));
    expect(dados.emUso).toHaveLength(2);
    expect(dados.emUso[0]).toEqual({
      nome: 'Losartana',
      dose: '50 mg',
      frequencia: '1x ao dia',
      via: 'oral',
      desde: '2024-08-20',
      prescrito_por: 'Dra. Helena Prado',
      renova_em: '2026-11-05',
      termino_em: '',
      obs: 'Uso contínuo',
    });
    expect(dados.emUso[1]?.termino_em).toBe('2026-10-25');
    expect(dados.emUso[1]?.renova_em).toBe('');
    expect(dados.emUso[1]?.obs).toBe('Tomar com alimento | completar os 7 dias');
    expect(dados.prescritos).toHaveLength(1);
    expect(dados.prescritos[0]?.nome).toBe('Atorvastatina');
    expect(dados.prescritos[0]?.validade_receita).toBe('2026-12-01');
    expect(dados.descontinuados).toEqual([]);
    expect(problemas).toEqual([]);
    expect(opacas).toEqual([]); // a linha `| | | |` é opaca `vazia`: ignorada, não listada
  });

  it('Exames: 4 marcadores × 2 datas no Hemograma, mais peso, pressão e glicemia', () => {
    const arquivo = perfil('Ana', 'Exames.md');
    const { dados, problemas } = exames.ler(lerFixture(arquivo), ctx(arquivo));
    expect(dados.marcadores).toHaveLength(8);
    expect(new Set(dados.marcadores.map((m) => m.marcador)).size).toBe(4);
    expect([...new Set(dados.marcadores.map((m) => m.data))]).toEqual(['2026-03-10', '2026-09-15']);
    expect(new Set(dados.marcadores.map((m) => `${m.marcador}@${m.data}`)).size).toBe(8);
    expect(dados.marcadores.every((m) => m.exame === 'Hemograma')).toBe(true);
    expect(dados.marcadores[3]).toEqual({
      exame: 'Hemograma',
      data: '2026-03-10',
      marcador: 'Colesterol total',
      valor: '212',
      unidade: 'mg/dL',
      faixa_do_laudo: '< 190',
      flag: 'alto',
      obs: 'Flag do próprio laudo',
    });
    expect(dados.pesos.map((p) => p.peso)).toEqual(['68,4', '67,1', '66,5']);
    expect(dados.pressoes).toHaveLength(2);
    expect(dados.pressoes[0]).toEqual({
      data: '2026-09-15',
      sistolica: '128',
      diastolica: '82',
      fc: '72',
      obs: 'Aferição no consultório',
    });
    expect(dados.glicemias).toEqual([{ data: '2026-09-15', hora: '07:30', valor: '92', condicao: 'jejum', obs: '' }]);
    expect(problemas).toEqual([]);
  });

  it('Ficha: alergias, cônjuges, 1 contato e 2 profissionais', () => {
    const arquivo = perfil('Ana', 'Ficha.md');
    const { dados, problemas } = ficha.ler(lerFixture(arquivo), ctx(arquivo));
    expect(dados.frontmatter?.alergias).toEqual(['Dipirona']);
    expect(dados.frontmatter?.conjuges).toEqual(['bruno']);
    expect(dados.frontmatter?.nascimento).toBe('1985-03-10');
    expect(dados.frontmatter?.tipo).toBe('pessoa');
    expect(dados.frontmatter?.tutores).toEqual([]);
    expect(dados.frontmatter?.raca).toBe(''); // chave ausente vale ''
    expect(dados.contatos).toEqual([{ nome: 'Bruno', relacao: 'Cônjuge', telefone: '(11) 90000-0001' }]);
    expect(dados.profissionais.map((p) => p.nome)).toEqual(['Dra. Helena Prado', 'Dr. Paulo Mendes']);
    expect(problemas).toEqual([]);
  });

  it('Historico: 5 eventos em ordem, um sem [tipo] (tipo null)', () => {
    const arquivo = perfil('Ana', 'Historico.md');
    const { dados, problemas, opacas } = historico.ler(lerFixture(arquivo), ctx(arquivo));
    expect(dados.eventos).toHaveLength(5);
    expect(dados.eventos.filter((e) => e.tipo === null)).toHaveLength(1);
    expect(dados.eventos[0]).toEqual({
      data: '2026-03-09',
      tipo: null,
      texto: 'Coleta de sangue para hemograma e colesterol.',
    });
    expect(dados.eventos.map((e) => e.data)).toEqual([
      '2026-03-09',
      '2026-03-10',
      '2026-06-05',
      '2026-09-15',
      '2026-10-10',
    ]);
    expect(dados.eventos[1]?.tipo).toBe('consulta');
    expect(problemas).toEqual([]);
    expect(opacas).toEqual([]);
  });

  it('Vacinas: sem `## Antiparasitários` (pessoa) não é problema', () => {
    const arquivo = perfil('Ana', 'Vacinas.md');
    const { dados, problemas } = vacinas.ler(lerFixture(arquivo), ctx(arquivo));
    expect(dados.vacinas.map((v) => v.nome)).toEqual(['Influenza', 'dT (difteria e tétano)', 'COVID-19 (reforço)']);
    expect(dados.vacinas[2]).toEqual({
      nome: 'COVID-19 (reforço)',
      aplicada_em: '2025-11-20',
      proxima_em: '',
      obs: '',
    });
    expect(dados.antiparasitarios).toEqual([]);
    expect(problemas).toEqual([]);
  });

  it('Vacinas: `## Antiparasitários` presente, mas sem tabela, também não é problema', () => {
    const arquivo = perfil('Ana', 'Vacinas.md');
    const fonte = `${lerFixture(arquivo)}\n## Antiparasitários\n\nNenhum registrado ainda.\n`;
    const { dados, problemas, estado } = vacinas.ler(fonte, ctx(arquivo));
    expect(problemas).toEqual([]);
    expect(dados.antiparasitarios).toEqual([]);
    expect(dados.vacinas).toHaveLength(3);
    expect(estado.regioes.map((r) => r.chave)).toEqual(['vacinas']);
  });

  it('Vacinas: `## Antiparasitários` só com linhas em branco ou prosa (sem linha começando com `|`) não é problema', () => {
    const arquivo = perfil('Ana', 'Vacinas.md');
    const base = lerFixture(arquivo);
    for (const resto of ['\n## Antiparasitários\n\n\n', '\n## Antiparasitários', '\n## Antiparasitários\n\nUsa a pipeta | na nuca.\n']) {
      const { dados, problemas } = vacinas.ler(base + resto, ctx(arquivo));
      expect(problemas, JSON.stringify(resto)).toEqual([]);
      expect(dados.antiparasitarios).toEqual([]);
    }
  });

  describe('seção opcional com linhas `|` que não formam tabela (os registros sumiriam em silêncio)', () => {
    const arquivo = perfil('Ana', 'Vacinas.md');
    const CABECALHO = '| Produto | Tipo | Aplicado em | Próximo em | Obs |';
    const LINHA = '| Revolution 45 mg | antipulgas | 2026-09-30 | 2026-10-30 | |';
    // O fixture da Ana tem 9 linhas e termina em `\n`: o `\n` de baixo abre a linha 10 em branco, e o cabeçalho cai na 11.
    const comOpcional = (...corpo: string[]): string =>
      `${lerFixture(arquivo)}\n## Antiparasitários\n\n${corpo.join('\n')}\n`;

    it('sem a linha delimitadora `|---|` → um `tabela_nao_reconhecida` na linha do cabeçalho; nada é lido', () => {
      const { dados, problemas, estado } = vacinas.ler(comOpcional(CABECALHO, LINHA), ctx(arquivo));
      expect(problemas).toEqual([problema(arquivo, 'tabela_nao_reconhecida', 11)]);
      expect(problemas[0]?.mensagem).toContain('Antiparasitários');
      expect(dados.antiparasitarios).toEqual([]);
      expect(dados.vacinas).toHaveLength(3);
      expect(estado.regioes.map((r) => r.chave)).toEqual(['vacinas']);
    });

    it('com delimitador de número de colunas errado (o GFM não reconhece a tabela) → o mesmo problema', () => {
      const { problemas } = vacinas.ler(comOpcional(CABECALHO, '|---|---|', LINHA), ctx(arquivo));
      expect(problemas).toEqual([problema(arquivo, 'tabela_nao_reconhecida', 11)]);
    });

    it('linha com `|` recuada e prosa antes das linhas também conta', () => {
      const { problemas } = vacinas.ler(comOpcional('Apliquei esta semana:', '', `   ${CABECALHO}`, LINHA), ctx(arquivo));
      expect(problemas).toEqual([problema(arquivo, 'tabela_nao_reconhecida', 11)]);
    });

    it('seção obrigatória com o mesmo texto dá o mesmo código e a mesma linha', () => {
      const fonte = ['# Vacinas — X', '', '## Vacinas', '', '| Vacina | Aplicada em | Próxima em | Obs |', '| V4 | 2025-09-01 | | |', ''].join('\n');
      const { problemas } = vacinas.ler(fonte, ctx('V.md'));
      expect(problemas).toEqual([problema('V.md', 'tabela_nao_reconhecida', 3)]);
    });

    it('com a tabela bem formada continua sendo lida, sem problema', () => {
      const { dados, problemas } = vacinas.ler(comOpcional(CABECALHO, '|---|---|---|---|---|', LINHA), ctx(arquivo));
      expect(problemas).toEqual([]);
      expect(dados.antiparasitarios.map((a) => a.produto)).toEqual(['Revolution 45 mg']);
    });
  });

  it('Vacinas: `## Vacinas` (obrigatória) sem tabela continua sendo `secao_ausente`', () => {
    const fonte = '# Vacinas — X\n\n## Vacinas\n\nNenhuma.\n';
    const { problemas } = vacinas.ler(fonte, ctx('V.md'));
    expect(problemas).toEqual([problema('V.md', 'secao_ausente', 3)]);
  });

  it('Pendencias, Doses e Genetica', () => {
    const pend = pendencias.ler(lerFixture(perfil('Ana', 'Pendencias.md')), ctx('Pendencias.md'));
    expect(pend.dados.examesSolicitados).toEqual([
      {
        exame: 'Perfil lipídico completo',
        solicitado_em: '2026-10-10',
        solicitado_por: 'Dra. Helena Prado',
        realizar_ate: '2027-02-15',
        obs: 'Em jejum de 12 horas',
      },
    ]);
    expect(pend.dados.consultas.map((c) => c.data)).toEqual(['2027-03-18']);
    const dos = doses.ler(lerFixture(perfil('Ana', 'Doses.md')), ctx('Doses.md'));
    expect(dos.dados.doses).toHaveLength(3);
    expect(dos.dados.doses[1]).toEqual({
      data: '2026-10-20',
      hora: '22:00',
      medicamento: 'Amoxicilina',
      dose: '500 mg',
      obs: 'Com o jantar',
    });
    const gen = genetica.ler(lerFixture(perfil('Ana', 'Genetica.md')), ctx('Genetica.md'));
    expect(gen.dados).toEqual({ condicoes_hereditarias: ['Hipertensão'] });
    expect([...pend.problemas, ...dos.problemas, ...gen.problemas]).toEqual([]);
  });
});

describe('Bruno — coluna extra e item opaco', () => {
  it('Exames: `Laboratório` é coluna extra do Hemograma; tabelas vazias não são problema', () => {
    const arquivo = perfil('Bruno', 'Exames.md');
    const { dados, problemas, estado } = exames.ler(lerFixture(arquivo), ctx(arquivo));
    const { tabela } = regiaoTabela(estado, 'marcadores');
    expect(tabela.colunasExtras).toEqual(['Laboratório']);
    expect(tabela.linhas[0]?.extras).toEqual({ Laboratório: 'Laboratório Exemplo' });
    expect(dados.marcadores.map((m) => [m.marcador, m.flag])).toEqual([
      ['Hemoglobina', 'normal'],
      ['Leucócitos', 'alto'],
    ]);
    expect(dados.pressoes).toEqual([]);
    expect(dados.glicemias).toEqual([]);
    expect(problemas).toEqual([]);
  });

  it('Historico: 1 opaca de gramática listada em `opacas`, sem problema de validação', () => {
    const arquivo = perfil('Bruno', 'Historico.md');
    const { dados, problemas, opacas } = historico.ler(lerFixture(arquivo), ctx(arquivo));
    expect(problemas).toHaveLength(0);
    expect(opacas).toEqual([{ arquivo, linha: 6, motivo: 'fora-da-gramatica' }]);
    expect(dados.eventos.map((e) => e.data)).toEqual(['2026-02-12', '2026-08-20']);
  });

  it('Ficha: `alergias: []` (confirmado sem alergia) é diferente de null', () => {
    const { dados } = ficha.ler(lerFixture(perfil('Bruno', 'Ficha.md')), ctx('Ficha.md'));
    expect(dados.frontmatter?.alergias).toEqual([]);
    expect(dados.contatos[0]?.nome).toBe('Ana');
  });
});

describe('Mia — perfil de animal', () => {
  it('Vacinas: 2 antiparasitários', () => {
    const arquivo = perfil('Mia (gata)', 'Vacinas.md');
    const { dados, problemas } = vacinas.ler(lerFixture(arquivo), ctx(arquivo));
    expect(dados.antiparasitarios).toHaveLength(2);
    expect(dados.antiparasitarios[0]).toEqual({
      produto: 'Revolution 45 mg',
      tipo: 'antipulgas',
      aplicado_em: '2026-09-30',
      proximo_em: '2026-10-30',
      obs: 'Aplicação mensal',
    });
    expect(dados.antiparasitarios[1]?.tipo).toBe('vermifugo');
    expect(dados.vacinas).toHaveLength(2);
    expect(problemas).toEqual([]);
  });

  it('Ficha: tipo gato, alergias null (não perguntado), microchip como texto, tutores', () => {
    const { dados } = ficha.ler(lerFixture(perfil('Mia (gata)', 'Ficha.md')), ctx('Ficha.md'));
    expect(dados.frontmatter?.tipo).toBe('gato');
    expect(dados.frontmatter?.alergias).toBeNull();
    expect(dados.frontmatter?.microchip).toBe('985112000123456');
    expect(dados.frontmatter?.tipo_sanguineo).toBe('');
    expect(dados.frontmatter?.tutores).toEqual(['ana', 'bruno']);
  });
});

describe('os 24 arquivos de verdade do cofre de exemplo', () => {
  const casos = MEMBROS.flatMap((membro) => ARQUIVOS_DE_VERDADE.map((nome) => [membro, nome] as const));

  it.each(casos)('%s/%s: lê sem problemas; só o item fora da gramática do Bruno é opaco', (membro, nome) => {
    const arquivo = perfil(membro, nome);
    const codec: Codec<unknown> = codecs[CODEC_DO_ARQUIVO[nome]];
    const { problemas, opacas, estado } = codec.ler(lerFixture(arquivo), ctx(arquivo));
    expect(problemas).toEqual([]);
    expect(opacas).toHaveLength(membro === 'Bruno' && nome === 'Historico.md' ? 1 : 0);
    expect(estado.tinhaBom).toBe(false);
    expect(estado.eol).toBe('\n');
  });
});

describe('corpus sujo (`test/fixtures/dirty/`)', () => {
  it('flag sem faixa → problema `faixa_obrigatoria` na linha certa, sem dado de saúde na mensagem', () => {
    const arquivo = 'dirty/flag-sem-faixa.md';
    const { dados, problemas, estado } = exames.ler(lerFixture(arquivo), ctx(arquivo));
    expect(problemas).toEqual([problema(arquivo, 'faixa_obrigatoria', 27)]);
    const mensagem = problemas[0]?.mensagem;
    expect(mensagem).toContain('Faixa do laudo');
    for (const dado of ['11800', 'Leucócitos', 'alto', '/mm³', '2026-09-15']) {
      expect(mensagem).not.toContain(dado);
    }
    // a linha inválida não entra no modelo, mas continua na tabela (preservada crua)
    expect(dados.marcadores.map((m) => m.marcador)).toEqual(['Hemoglobina']);
    expect(regiaoTabela(estado, 'marcadores').tabela.linhas).toHaveLength(2);
  });

  it('linha solta no meio da tabela → opaca `sem-barra` com a linha do arquivo', () => {
    const arquivo = 'dirty/linha-opaca.md';
    const { dados, problemas, opacas } = medicamentos.ler(lerFixture(arquivo), ctx(arquivo));
    expect(opacas).toEqual([{ arquivo, linha: 8, motivo: 'sem-barra' }]);
    expect(dados.emUso.map((m) => m.nome)).toEqual(['Losartana', 'Amoxicilina']);
    expect(problemas).toEqual([]);
  });

  it('linha só de células vazias → ignorada (nem registro, nem opaca listada)', () => {
    const { dados, problemas, opacas } = exames.ler(lerFixture('dirty/linha-vazia.md'), ctx('x'));
    expect(dados.pesos).toHaveLength(2);
    expect(opacas).toEqual([]);
    expect(problemas).toEqual([]);
  });

  it('coluna extra, `\\|` e HTML na célula', () => {
    const extra = exames.ler(lerFixture('dirty/coluna-extra.md'), ctx('x'));
    expect(regiaoTabela(extra.estado, 'marcadores').tabela.colunasExtras).toEqual(['Laboratório']);
    expect(extra.dados.marcadores).toHaveLength(2);
    const pipe = medicamentos.ler(lerFixture('dirty/pipe-escapado.md'), ctx('x'));
    expect(pipe.dados.emUso[0]?.obs).toBe('tomar de manhã | ou à noite');
    const html = exames.ler(lerFixture('dirty/html-na-celula.md'), ctx('x'));
    expect(html.dados.marcadores[1]?.obs).toBe('<b>alto</b> segundo o paciente');
    expect([...extra.problemas, ...pipe.problemas, ...html.problemas]).toEqual([]);
  });

  it('BOM → `tinhaBom`, problema `bom` na linha 1 e fonte sem o BOM', () => {
    const arquivo = 'dirty/bom.md';
    const bruto = lerFixture(arquivo);
    expect(bruto.startsWith(BOM)).toBe(true);
    const { dados, problemas, estado } = medicamentos.ler(bruto, ctx(arquivo));
    expect(estado.tinhaBom).toBe(true);
    expect(estado.fonte).toBe(bruto.slice(1));
    expect(problemas).toEqual([problema(arquivo, 'bom', 1)]);
    expect(dados.emUso).toHaveLength(2);
    expect(dados.descontinuados).toHaveLength(1);
  });

  it('CRLF → `eol` CRLF e células sem `\\r`', () => {
    const { dados, problemas, estado } = medicamentos.ler(lerFixture('dirty/crlf.md'), ctx('x'));
    expect(estado.eol).toBe('\r\n');
    expect(dados.emUso[1]?.termino_em).toBe('2026-10-25');
    expect(dados.descontinuados[0]?.motivo).toBe('Fim do tratamento');
    expect(problemas).toEqual([]);
  });

  it('espaços no fim das linhas (cabeçalhos, tabela) não atrapalham', () => {
    const { dados, problemas } = medicamentos.ler(lerFixture('dirty/espaco-final.md'), ctx('x'));
    expect(dados.emUso).toHaveLength(2);
    expect(dados.prescritos).toHaveLength(1);
    expect(dados.descontinuados).toHaveLength(1);
    expect(problemas).toEqual([]);
  });
});

describe('problemas de leitura', () => {
  const MEDS = lerFixture(perfil('Ana', 'Medicamentos.md'));
  const EXAMES = lerFixture(perfil('Ana', 'Exames.md'));

  it('seção canônica ausente → `secao_ausente` e lista vazia; o resto é lido', () => {
    const fonte = MEDS.replace('## Prescritos', '## Receitas');
    const { dados, problemas } = medicamentos.ler(fonte, ctx('M.md'));
    expect(problemas).toEqual([problema('M.md', 'secao_ausente')]);
    expect(problemas[0]?.mensagem).toContain('## Prescritos');
    expect(dados.prescritos).toEqual([]);
    expect(dados.emUso).toHaveLength(2);
  });

  it('seção canônica sem tabela → `secao_ausente` na linha do cabeçalho', () => {
    const fonte = '# Doses — X\n\n## Doses\n\nNenhuma dose registrada.\n';
    const { dados, problemas } = doses.ler(fonte, ctx('D.md'));
    expect(problemas).toEqual([problema('D.md', 'secao_ausente', 3)]);
    expect(dados.doses).toEqual([]);
  });

  it('cabeçalho de tabela errado → `cabecalho_invalido` e a tabela é ignorada (as outras seguem)', () => {
    const fonte = MEDS.replace('| Medicamento | Dose | Frequência | Via |', '| Remédio | Dose | Frequência | Via |');
    const { dados, problemas, estado } = medicamentos.ler(fonte, ctx('M.md'));
    expect(problemas).toEqual([problema('M.md', 'cabecalho_invalido', 5)]);
    expect(dados.emUso).toEqual([]);
    expect(dados.prescritos).toHaveLength(1);
    expect(estado.regioes.some((r) => r.chave === 'emUso')).toBe(false);
  });

  it('`cabecalho_invalido` cita só a posição da coluna e o nome esperado, nunca o texto achado', () => {
    const achado = 'Glicose da Fulana';
    const fonte = MEDS.replace('| Medicamento | Dose | Frequência | Via |', `| ${achado} | Dose | Frequência | Via |`);
    const { problemas } = medicamentos.ler(fonte, ctx('M.md'));
    expect(problemas).toHaveLength(1);
    expect(problemas[0]?.mensagem).toContain('coluna 1');
    expect(problemas[0]?.mensagem).toContain("'Medicamento'");
    expect(problemas[0]?.mensagem).not.toContain('Glicose');
    expect(problemas[0]?.mensagem).not.toContain('Fulana');
    // uma coluna extra com nome repetido tampouco é citada pelo nome
    const repetida = MEDS.replace('| Obs |\n|---|---|---|---|---|---|---|---|---|', '| Obs | Lab Secreto | Lab Secreto |\n|---|---|---|---|---|---|---|---|---|---|---|');
    const { problemas: p2 } = medicamentos.ler(repetida, ctx('M.md'));
    expect(p2.map((p) => p.codigo)).toEqual(['cabecalho_invalido']);
    expect(p2[0]?.mensagem).not.toContain('Secreto');
  });

  it('Exames: `##` não canônico com tabela fora do formato → `cabecalho_invalido`; só texto → nada', () => {
    const fonte = linhas(
      EXAMES,
      '## Anotações',
      '',
      '| Data | Nota |',
      '|---|---|',
      '| 2026-10-01 | algo |',
      '',
      '## Observações',
      '',
      'Texto livre.',
      '',
    );
    const { dados, problemas } = exames.ler(fonte, ctx('E.md'));
    expect(problemas).toEqual([problema('E.md', 'cabecalho_invalido', 39)]);
    expect(dados.marcadores).toHaveLength(8);
    expect(dados.marcadores.some((m) => m.exame === 'Anotações')).toBe(false);
  });

  it('Exames: cada `##` não canônico com a tabela de marcadores é um exame (`exame` = título)', () => {
    const fonte = EXAMES + PERFIL_LIPIDICO;
    const { dados, problemas } = exames.ler(fonte, ctx('E.md'));
    expect(problemas).toEqual([]);
    expect(dados.marcadores).toHaveLength(9);
    expect(dados.marcadores[8]).toMatchObject({ exame: 'Perfil lipídico', marcador: 'HDL', faixa_do_laudo: '> 40' });
  });

  it('Exames: `## Peso` ausente → `secao_ausente`', () => {
    const fonte = EXAMES.replace('## Peso', '## Pesagens');
    const { problemas } = exames.ler(fonte, ctx('E.md'));
    expect(problemas.map((p) => p.codigo)).toEqual(['secao_ausente', 'cabecalho_invalido']);
  });

  it('linha que não passa no schema → `linha_invalida` com a linha; preservada e fora do modelo', () => {
    const invalida = '| Dipirona | 1 g | se dor | oral | 2026-13-45 | Dr. X | | | |';
    const fonte = MEDS.replace('| Amoxicilina |', `${invalida}\n| Amoxicilina |`);
    const { dados, problemas, estado } = medicamentos.ler(fonte, ctx('M.md'));
    expect(problemas).toEqual([problema('M.md', 'linha_invalida', 8)]);
    expect(problemas[0]?.mensagem).toContain("coluna 'Desde'");
    for (const dado of ['2026-13-45', 'Dipirona', '1 g', 'Dr. X']) expect(problemas[0]?.mensagem).not.toContain(dado);
    expect(dados.emUso.map((m) => m.nome)).toEqual(['Losartana', 'Amoxicilina']);
    expect(regiaoTabela(estado, 'emUso').tabela.linhas.map((l) => l.raw)).toContain(invalida);
  });

  it('valor fora do vocabulário → mensagem em pt-BR com os valores aceitos (não o valor lido)', () => {
    const fonte = lerFixture(perfil('Mia (gata)', 'Vacinas.md')).replace('| antipulgas |', '| coleira |');
    const { dados, problemas } = vacinas.ler(fonte, ctx('V.md'));
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ linha: 14, codigo: 'linha_invalida' });
    expect(problemas[0]?.mensagem).toContain("coluna 'Tipo'");
    expect(problemas[0]?.mensagem).toContain('antipulgas, vermifugo');
    expect(problemas[0]?.mensagem).not.toContain('coleira');
    expect(problemas[0]?.mensagem).not.toMatch(/Invalid|expected/);
    expect(dados.antiparasitarios.map((a) => a.produto)).toEqual(['Drontal Gatos']);
  });

  it('Historico: `[tipo]` fora do vocabulário e data inexistente → `linha_invalida`; em branco → nada', () => {
    const fonte = lerFixture(perfil('Ana', 'Historico.md')).replace(
      '- **2026-06-05**',
      '- **2026-04-01** [exame] Resultado entregue.\n\n- **2026-02-30** Data errada.\n- **2026-06-05**',
    );
    const { dados, problemas, opacas } = historico.ler(fonte, ctx('H.md'));
    expect(problemas.map((p) => [p.linha, p.codigo])).toEqual([
      [7, 'linha_invalida'],
      [9, 'linha_invalida'],
    ]);
    expect(problemas[0]?.mensagem).not.toContain('Resultado entregue');
    expect(opacas).toEqual([]);
    expect(dados.eventos).toHaveLength(5);
  });

  it('CR solto → problema `cr_solto` com a linha, sem exceção e sem outros problemas', () => {
    const fonte = '# Medicamentos — X\n\n## Em uso\n| a |\rb\n';
    const { dados, problemas } = medicamentos.ler(fonte, ctx('M.md'));
    expect(problemas).toEqual([problema('M.md', 'cr_solto', 4)]);
    expect(dados).toEqual({ emUso: [], prescritos: [], descontinuados: [] });
  });

  describe('frontmatter da Ficha', () => {
    const BRUNO = lerFixture(perfil('Bruno', 'Ficha.md'));
    const ANA = lerFixture(perfil('Ana', 'Ficha.md'));

    it('YAML inválido → `yaml_invalido` com a linha; frontmatter undefined; tabelas lidas', () => {
      const fonte = BRUNO.replace('nome: Bruno\n', 'nome: Bruno\nnome: Outro\n');
      const { dados, problemas } = ficha.ler(fonte, ctx('F.md'));
      expect(problemas).toEqual([problema('F.md', 'yaml_invalido', 4)]);
      expect(problemas[0]?.mensagem).not.toContain('Outro');
      expect(dados.frontmatter).toBeUndefined();
      expect(dados.contatos).toHaveLength(1);
    });

    it('alias sem âncora (ou em excesso) não lança: `yaml_invalido`, frontmatter undefined, sem citar o conteúdo', () => {
      const semAncora = ficha.ler(BRUNO.replace('nome: Bruno', 'nome: *segredo'), ctx('F.md'));
      expect(semAncora.problemas).toEqual([problema('F.md', 'yaml_invalido', 1)]);
      expect(semAncora.problemas[0]?.mensagem).not.toContain('segredo');
      expect(semAncora.problemas[0]?.mensagem).toContain('alias'); // ReferenceError do `yaml`: o motivo é dito
      expect(semAncora.dados.frontmatter).toBeUndefined();
      expect(semAncora.dados.contatos).toHaveLength(1);
      expect(semAncora.estado.frontmatter?.lido).toBeUndefined(); // não se grava por cima
      const bomba = [
        'a: &a [x, x, x, x, x, x, x, x, x, x]',
        'b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a, *a]',
        'c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b, *b]',
        'd: [*c, *c, *c, *c, *c, *c, *c, *c, *c, *c]',
      ];
      const excesso = ficha.ler(['---', ...bomba, '---', ''].join('\n'), ctx('F.md'));
      expect(excesso.problemas.filter((p) => p.codigo === 'yaml_invalido')).toHaveLength(1);
      expect(excesso.dados.frontmatter).toBeUndefined();
    });

    it('`toJS` lançando algo que não é ReferenceError → mensagem genérica (sem "alias") e o mesmo código', () => {
      const espiao = vi.spyOn(Document.prototype, 'toJS').mockImplementation(() => {
        throw new TypeError('texto lido do arquivo: segredo');
      });
      try {
        const { dados, problemas } = ficha.ler(BRUNO, ctx('F.md'));
        expect(problemas).toEqual([problema('F.md', 'yaml_invalido', 1)]);
        expect(problemas[0]?.mensagem).toContain('não pôde ser convertido');
        expect(problemas[0]?.mensagem).not.toContain('alias');
        expect(problemas[0]?.mensagem).not.toContain('segredo');
        expect(dados.frontmatter).toBeUndefined();
        expect(dados.contatos).toHaveLength(1);
      } finally {
        espiao.mockRestore();
      }
    });

    it('`toJS` lançando um valor que não é `Error` não é engolido', () => {
      const espiao = vi.spyOn(Document.prototype, 'toJS').mockImplementation(() => {
        throw 'não é um Error';
      });
      try {
        expect(() => ficha.ler(BRUNO, ctx('F.md'))).toThrow();
      } finally {
        espiao.mockRestore();
      }
    });

    it('`id` inválido → `id_invalido` na linha do id; frontmatter undefined', () => {
      const { dados, problemas } = ficha.ler(ANA.replace('id: ana', 'id: Ana Maria'), ctx('F.md'));
      expect(problemas).toEqual([problema('F.md', 'id_invalido', 2)]);
      expect(problemas[0]?.mensagem).not.toContain('Ana Maria');
      expect(dados.frontmatter).toBeUndefined();
    });

    it('campo opcional inválido → `linha_invalida` na linha da chave; o campo vale o padrão', () => {
      const { dados, problemas } = ficha.ler(ANA.replace('"1985-03-10"', '"1985-02-30"'), ctx('F.md'));
      expect(problemas).toEqual([problema('F.md', 'linha_invalida', 5)]);
      expect(problemas[0]?.mensagem).toContain("'nascimento'");
      expect(problemas[0]?.mensagem).not.toContain('1985');
      expect(dados.frontmatter?.nascimento).toBe('');
      expect(dados.frontmatter?.alergias).toEqual(['Dipirona']);
    });

    it('número onde se espera texto (microchip sem aspas) → mensagem pede aspas', () => {
      const mia = lerFixture(perfil('Mia (gata)', 'Ficha.md')).replace('"985112000123456"', '985112000123456');
      const { dados, problemas } = ficha.ler(mia, ctx('F.md'));
      expect(problemas).toEqual([problema('F.md', 'linha_invalida', 12)]);
      expect(problemas[0]?.mensagem).toContain('aspas');
      expect(dados.frontmatter?.microchip).toBe('');
    });

    it('sem frontmatter → `frontmatter_ausente` na linha 1; frontmatter undefined', () => {
      const fonte = ANA.slice(ANA.indexOf('# Ficha'));
      const { dados, problemas } = ficha.ler(fonte, ctx('F.md'));
      expect(problemas).toEqual([problema('F.md', 'frontmatter_ausente', 1)]);
      expect(dados.frontmatter).toBeUndefined();
      expect(dados.profissionais).toHaveLength(2);
    });
  });

  it('Genetica sem o bloco `---` → `frontmatter_ausente` na linha 1 e lista vazia', () => {
    const { dados, problemas } = genetica.ler('# Genética\n\nNenhuma.\n', ctx('G.md'));
    expect(problemas).toEqual([problema('G.md', 'frontmatter_ausente', 1)]);
    expect(dados).toEqual({ condicoes_hereditarias: [] });
  });

  it('seção canônica repetida → `secao_duplicada` na linha de cada repetição; só a primeira é lida', () => {
    const repetida = linhas(
      '## Em uso',
      '',
      '| Medicamento | Dose | Frequência | Via | Desde | Prescrito por | Renova em | Término em | Obs |',
      '|---|---|---|---|---|---|---|---|---|',
      '| Fluoxetina | 20 mg | 1x ao dia | oral | 2026-01-01 | | | | |',
      '',
    );
    const fonte = `${MEDS}\n${repetida}\n${repetida}`;
    const { dados, problemas, estado } = medicamentos.ler(fonte, ctx('M.md'));
    const linhasDasRepeticoes = fonte
      .split('\n')
      .flatMap((l, i) => (l === '## Em uso' ? [i + 1] : []))
      .slice(1);
    expect(linhasDasRepeticoes).toHaveLength(2);
    expect(problemas).toEqual(linhasDasRepeticoes.map((l) => problema('M.md', 'secao_duplicada', l)));
    expect(problemas[0]?.mensagem).toContain("'## Em uso'");
    expect(problemas[0]?.mensagem).not.toContain('Fluoxetina');
    expect(dados.emUso.map((m) => m.nome)).toEqual(['Losartana', 'Amoxicilina']);
    expect(estado.regioes.filter((r) => r.chave === 'emUso')).toHaveLength(1);
    // regravar sem mudar devolve o arquivo byte a byte, com as repetições intactas
    expect(medicamentos.escrever(estado, dados)).toBe(fonte);
  });

  it('dois `## Hemograma` em Exames não são duplicata: os dois são exames, sem problema', () => {
    const { dados, problemas } = exames.ler(EXAMES + PERFIL_LIPIDICO + PERFIL_LIPIDICO, ctx('E.md'));
    expect(problemas).toEqual([]);
    expect(dados.marcadores).toHaveLength(10);
  });

  it('Genetica com YAML inválido → `yaml_invalido` e lista vazia', () => {
    const fonte = '---\ncondicoes_hereditarias: [Hipertensão\n---\n\n# Genética\n';
    const { dados, problemas } = genetica.ler(fonte, ctx('G.md'));
    expect(problemas.map((p) => p.codigo)).toEqual(['yaml_invalido']);
    expect(dados).toEqual({ condicoes_hereditarias: [] });
  });

  it('todo código usado está na lista fechada `CODIGOS_PROBLEMA`', () => {
    expect(CODIGOS_PROBLEMA).toEqual([
      'manifesto_invalido',
      'arquivo_ausente',
      'arquivo_ilegivel',
      'yaml_invalido',
      'cabecalho_invalido',
      'secao_ausente',
      'secao_duplicada',
      'tabela_nao_reconhecida',
      'frontmatter_ausente',
      'linha_invalida',
      'faixa_obrigatoria',
      'id_invalido',
      'id_duplicado',
      'bom',
      'cr_solto',
    ]);
  });
});

describe('índice dos codecs', () => {
  it('os 8 arquivos de verdade, cada um com o seu codec', () => {
    expect(ARQUIVOS_DE_VERDADE).toEqual([
      'Ficha.md',
      'Medicamentos.md',
      'Vacinas.md',
      'Exames.md',
      'Historico.md',
      'Pendencias.md',
      'Doses.md',
      'Genetica.md',
    ]);
    expect(Object.keys(codecs).sort()).toEqual(
      ['doses', 'exames', 'ficha', 'genetica', 'historico', 'medicamentos', 'pendencias', 'vacinas'].sort(),
    );
    expect(codecs[CODEC_DO_ARQUIVO['Medicamentos.md']]).toBe(codecs.medicamentos);
    expect(new Set(Object.values(CODEC_DO_ARQUIVO)).size).toBe(8);
  });
});

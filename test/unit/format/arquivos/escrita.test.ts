import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as exames from '../../../../src/core/format/arquivos/exames.js';
import * as ficha from '../../../../src/core/format/arquivos/ficha.js';
import * as genetica from '../../../../src/core/format/arquivos/genetica.js';
import * as historico from '../../../../src/core/format/arquivos/historico.js';
import {
  ARQUIVOS_DE_VERDADE,
  CODEC_DO_ARQUIVO,
  type Codec,
  codecs,
} from '../../../../src/core/format/arquivos/index.js';
import * as medicamentos from '../../../../src/core/format/arquivos/medicamentos.js';
import {
  BOM,
  FIXTURES,
  lerFixture,
  linhasDiferentes,
  MEMBROS,
  PERFIL_LIPIDICO,
  perfil,
  soCrlf,
} from './apoio.js';

const ctx = (arquivo: string) => ({ arquivo });

function capturar(fn: () => unknown): Error {
  try {
    fn();
  } catch (erro) {
    if (erro instanceof Error) return erro;
    throw erro;
  }
  throw new Error('não lançou');
}

describe('no-op: escrever(estado, dados) devolve a fonte byte a byte', () => {
  const casos = MEMBROS.flatMap((membro) => ARQUIVOS_DE_VERDADE.map((nome) => [membro, nome] as const));

  it.each(casos)('%s/%s', (membro, nome) => {
    const fonte = lerFixture(perfil(membro, nome));
    const codec: Codec<unknown> = codecs[CODEC_DO_ARQUIVO[nome]];
    const { dados, estado } = codec.ler(fonte, ctx(nome));
    expect(codec.escrever(estado, dados)).toBe(fonte);
  });

  /** Codec de cada arquivo do corpus sujo e os códigos de problema esperados na leitura. */
  const SUJOS: Record<string, { codec: Codec<unknown>; codigos: string[] }> = {
    'bom.md': { codec: medicamentos, codigos: ['bom'] },
    'coluna-extra.md': { codec: exames, codigos: [] },
    'crlf.md': { codec: medicamentos, codigos: [] },
    'espaco-final.md': { codec: medicamentos, codigos: [] },
    'flag-sem-faixa.md': { codec: exames, codigos: ['faixa_obrigatoria'] },
    'html-na-celula.md': { codec: exames, codigos: [] },
    'linha-opaca.md': { codec: medicamentos, codigos: [] },
    'linha-vazia.md': { codec: exames, codigos: [] },
    'pipe-escapado.md': { codec: medicamentos, codigos: [] },
  };

  it('o mapa acima cobre todo o corpus sujo', () => {
    expect(readdirSync(`${FIXTURES}dirty`).sort()).toEqual(Object.keys(SUJOS).sort());
  });

  it.each(Object.keys(SUJOS))('dirty/%s', (nome) => {
    const caso = SUJOS[nome];
    if (caso === undefined) throw new Error(nome);
    const fonte = lerFixture(`dirty/${nome}`);
    const { dados, problemas, estado } = caso.codec.ler(fonte, ctx(nome));
    expect(problemas.map((p) => p.codigo)).toEqual(caso.codigos);
    const saida = caso.codec.escrever(estado, dados);
    if (nome === 'bom.md') {
      // com BOM, o no-op devolve a fonte menos o BOM (o BOM é removido ao gravar)
      expect(fonte.startsWith(BOM)).toBe(true);
      expect(estado.tinhaBom).toBe(true);
      expect(saida).toBe(fonte.slice(BOM.length));
    } else {
      expect(estado.tinhaBom).toBe(false);
      expect(saida).toBe(fonte);
    }
  });
});

describe('escrita mínima: só a linha que mudou é regravada', () => {
  it('LF: mudar `emUso[0].renova_em` muda exatamente uma linha', () => {
    const fonte = lerFixture(perfil('Ana', 'Medicamentos.md'));
    const { dados, estado } = medicamentos.ler(fonte, ctx('M.md'));
    const alvo = dados.emUso[0];
    if (alvo === undefined) throw new Error('sem emUso[0]');
    alvo.renova_em = '2026-12-01';
    const saida = medicamentos.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toEqual([7]);
    expect(saida).toBe(fonte.replace('2026-11-05', '2026-12-01'));
    expect(medicamentos.ler(saida, ctx('M.md')).dados.emUso[0]?.renova_em).toBe('2026-12-01');
  });

  it('CRLF: a linha regravada mantém o CRLF e nenhuma outra muda', () => {
    const fonte = lerFixture('dirty/crlf.md');
    const { dados, estado } = medicamentos.ler(fonte, ctx('crlf.md'));
    const alvo = dados.emUso[0];
    if (alvo === undefined) throw new Error('sem emUso[0]');
    alvo.renova_em = '2026-12-01';
    const saida = medicamentos.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toHaveLength(1);
    expect(soCrlf(saida)).toBe(true);
    expect(saida).toBe(fonte.replace('2026-11-05', '2026-12-01'));
  });

  it('BOM: a gravação remove o BOM e muda só a linha alterada', () => {
    const fonte = lerFixture('dirty/bom.md');
    const { dados, estado } = medicamentos.ler(fonte, ctx('bom.md'));
    const alvo = dados.emUso[0];
    if (alvo === undefined) throw new Error('sem emUso[0]');
    alvo.renova_em = '2026-12-01';
    const saida = medicamentos.escrever(estado, dados);
    expect(saida.startsWith(BOM)).toBe(false);
    expect(linhasDiferentes(fonte.slice(BOM.length), saida)).toHaveLength(1);
    expect(saida).toBe(fonte.slice(BOM.length).replace('2026-11-05', '2026-12-01'));
  });

  it('escrever não altera o estado: a mesma leitura ainda dá no-op depois de uma gravação', () => {
    const fonte = lerFixture(perfil('Ana', 'Medicamentos.md'));
    const { dados, estado } = medicamentos.ler(fonte, ctx('M.md'));
    const original = structuredClone(dados);
    const amox = dados.emUso[1];
    if (amox === undefined) throw new Error('sem emUso[1]');
    amox.nome = 'Amoxicilina 875';
    const primeira = medicamentos.escrever(estado, dados);
    expect(linhasDiferentes(fonte, primeira)).toEqual([8]);
    expect(medicamentos.escrever(estado, dados)).toBe(primeira);
    expect(medicamentos.escrever(estado, original)).toBe(fonte);
    // outra gravação a partir do mesmo estado não carrega a mudança da primeira
    const outra = structuredClone(original);
    const losartana = outra.emUso[0];
    if (losartana === undefined) throw new Error('sem emUso[0]');
    losartana.dose = '100 mg';
    expect(linhasDiferentes(fonte, medicamentos.escrever(estado, outra))).toEqual([7]);
  });

  it('frontmatter com formatação própria: intocado no no-op e quando só uma tabela muda', () => {
    const fonte = lerFixture(perfil('Ana', 'Ficha.md'))
      .replace('id: ana', 'id:     ana')
      .replace('conjuges: [bruno]\n---', 'conjuges: [ bruno ]\n# comentário no fim do frontmatter\n\n---');
    const { dados, estado } = ficha.ler(fonte, ctx('F.md'));
    expect(ficha.escrever(estado, dados)).toBe(fonte);
    const contato = dados.contatos[0];
    if (contato === undefined) throw new Error('sem contato');
    contato.telefone = '(11) 90000-0009';
    const saida = ficha.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toHaveLength(1);
    expect(saida.slice(0, saida.indexOf('\n---\n'))).toBe(fonte.slice(0, fonte.indexOf('\n---\n')));
  });

  it('linha inválida fica crua: mudar o registro seguinte não a toca', () => {
    const invalida = '| Dipirona | 1 g | se dor | oral | 2026-13-45 | Dr. X | | | |';
    const meds = lerFixture(perfil('Ana', 'Medicamentos.md'));
    const fonte = meds.replace('| Amoxicilina |', `${invalida}\n| Amoxicilina |`);
    const { dados, estado } = medicamentos.ler(fonte, ctx('M.md'));
    const amox = dados.emUso[1];
    if (amox === undefined) throw new Error('sem emUso[1]');
    amox.obs = 'Tomar com alimento';
    const saida = medicamentos.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toEqual([9]);
    expect(saida.split('\n')[7]).toBe(invalida);
    expect(saida.split('\n')[8]).toBe(
      '| Amoxicilina | 500 mg | a cada 8 h | oral | 2026-10-18 | Dr. Paulo Mendes | | 2026-10-25 ' +
        '| Tomar com alimento |',
    );
  });

  it('flag sem faixa: a linha com problema é preservada quando a vizinha muda', () => {
    const fonte = lerFixture('dirty/flag-sem-faixa.md');
    const { dados, estado } = exames.ler(fonte, ctx('E.md'));
    const hemoglobina = dados.marcadores[0];
    if (hemoglobina === undefined) throw new Error('sem marcador');
    hemoglobina.obs = 'Em jejum';
    const saida = exames.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toEqual([26]);
    expect(saida.split('\n')[26]).toBe(fonte.split('\n')[26]);
  });

  it('coluna extra: a linha regenerada mantém a célula da coluna extra', () => {
    const fonte = lerFixture(perfil('Bruno', 'Exames.md'));
    const { dados, estado } = exames.ler(fonte, ctx('E.md'));
    const hemoglobina = dados.marcadores[0];
    if (hemoglobina === undefined) throw new Error('sem marcador');
    hemoglobina.obs = 'Sem queixas';
    const saida = exames.escrever(estado, dados);
    const [linha] = linhasDiferentes(fonte, saida);
    expect(saida.split('\n')[(linha ?? 0) - 1]).toBe(
      '| 2026-08-20 | Hemoglobina | 15,1 | g/dL | 13,5 a 17,5 | normal | Sem queixas | Laboratório Exemplo |',
    );
  });
});

describe('acréscimo e limites da escrita', () => {
  const MEDS = lerFixture(perfil('Ana', 'Medicamentos.md'));
  const PARACETAMOL = {
    nome: 'Paracetamol',
    dose: '750 mg',
    frequencia: 'se dor',
    via: 'oral',
    desde: '',
    prescrito_por: '',
    renova_em: '',
    termino_em: '',
    obs: '',
  };

  it('registro novo vai para o fim da tabela', () => {
    const { dados, estado } = medicamentos.ler(MEDS, ctx('M.md'));
    dados.emUso.push(PARACETAMOL);
    const saida = medicamentos.escrever(estado, dados);
    const esperadas = MEDS.split('\n');
    esperadas.splice(8, 0, '| Paracetamol | 750 mg | se dor | oral | | | | | |');
    expect(saida).toBe(esperadas.join('\n'));
    expect(medicamentos.ler(saida, ctx('M.md')).dados.emUso.map((m) => m.nome)).toEqual([
      'Losartana',
      'Amoxicilina',
      'Paracetamol',
    ]);
  });

  it('registro novo num arquivo CRLF usa CRLF', () => {
    const fonte = lerFixture('dirty/crlf.md');
    const { dados, estado } = medicamentos.ler(fonte, ctx('crlf.md'));
    dados.descontinuados.push({
      nome: 'Paracetamol',
      dose: '750 mg',
      frequencia: 'se dor',
      inicio: '2026-09-01',
      fim: '2026-09-03',
      prescrito_por: '',
      motivo: 'Fim da dor',
    });
    const saida = medicamentos.escrever(estado, dados);
    expect(soCrlf(saida)).toBe(true);
    expect(medicamentos.ler(saida, ctx('crlf.md')).dados.descontinuados).toHaveLength(2);
  });

  it('remover linhas ainda não é suportado (Fase 1B)', () => {
    const { dados, estado } = medicamentos.ler(MEDS, ctx('M.md'));
    expect(() => medicamentos.escrever(estado, { ...dados, emUso: dados.emUso.slice(1) })).toThrow(
      'remoção de linhas chega na Fase 1B',
    );
  });

  it('valor que não passa no schema → Error sem o valor na mensagem; nada é gravado', () => {
    const { dados, estado } = medicamentos.ler(MEDS, ctx('M.md'));
    const alvo = dados.emUso[0];
    if (alvo === undefined) throw new Error('sem emUso[0]');
    alvo.renova_em = '2026-13-01';
    const erro = capturar(() => medicamentos.escrever(estado, dados));
    expect(erro.message).toContain('renova_em');
    expect(erro.message).not.toContain('2026-13-01');
    expect(erro.message).not.toContain('Losartana');
  });

  it('tabela com cabeçalho inválido: no-op continua valendo, acrescentar lança', () => {
    const fonte = MEDS.replace('| Medicamento | Dose | Frequência | Via |', '| Remédio | Dose | Frequência | Via |');
    const { dados, estado } = medicamentos.ler(fonte, ctx('M.md'));
    expect(medicamentos.escrever(estado, dados)).toBe(fonte);
    dados.emUso.push(PARACETAMOL);
    expect(() => medicamentos.escrever(estado, dados)).toThrow(/Em uso/);
  });

  it('CR solto: no-op devolve a fonte; gravar algo lança', () => {
    const fonte = '# Medicamentos — X\n\n## Em uso\n| a |\rb\n';
    const { dados, estado } = medicamentos.ler(fonte, ctx('M.md'));
    expect(medicamentos.escrever(estado, dados)).toBe(fonte);
    dados.emUso.push(PARACETAMOL);
    expect(() => medicamentos.escrever(estado, dados)).toThrow();
  });

  describe('marcadores', () => {
    const EXAMES = lerFixture(perfil('Ana', 'Exames.md'));
    const FERRITINA = {
      exame: 'Hemograma',
      data: '2026-10-20',
      marcador: 'Ferritina',
      valor: '80',
      unidade: 'ng/mL',
      faixa_do_laudo: '15 a 150',
      flag: 'normal' as const,
      obs: '',
    };

    it('marcador novo vai para o fim da seção do seu exame', () => {
      const fonte = EXAMES + PERFIL_LIPIDICO;
      const { dados, estado } = exames.ler(fonte, ctx('E.md'));
      dados.marcadores.push(FERRITINA);
      const saida = exames.escrever(estado, dados);
      const esperadas = fonte.split('\n');
      esperadas.splice(35, 0, '| 2026-10-20 | Ferritina | 80 | ng/mL | 15 a 150 | normal | |');
      expect(saida).toBe(esperadas.join('\n'));
      const relido = exames.ler(saida, ctx('E.md')).dados.marcadores;
      expect(relido).toHaveLength(10);
      expect(relido.filter((m) => m.exame === 'Hemograma').at(-1)?.marcador).toBe('Ferritina');
    });

    it('exame sem seção ou troca de exame de um marcador lido → Error (Fase 1B)', () => {
      const novo = exames.ler(EXAMES, ctx('E.md'));
      novo.dados.marcadores.push({ ...FERRITINA, exame: 'Perfil de ferro' });
      expect(() => exames.escrever(novo.estado, novo.dados)).toThrow(/seção/);
      const troca = exames.ler(EXAMES, ctx('E.md'));
      const primeiro = troca.dados.marcadores[0];
      if (primeiro === undefined) throw new Error('sem marcador');
      primeiro.exame = 'Bioquímica';
      expect(() => exames.escrever(troca.estado, troca.dados)).toThrow(/exame/);
    });
  });

  describe('histórico', () => {
    const ANA = lerFixture(perfil('Ana', 'Historico.md'));
    const RETORNO = { data: '2026-10-21', tipo: 'consulta' as const, texto: 'Retorno com a cardiologista.' };

    it('evento novo vai para o fim da lista', () => {
      const { dados, estado } = historico.ler(ANA, ctx('H.md'));
      dados.eventos.push(RETORNO);
      const saida = historico.escrever(estado, dados);
      expect(saida).toBe(ANA.replace(/\n$/, '\n- **2026-10-21** [consulta] Retorno com a cardiologista.\n'));
    });

    it('evento novo em CRLF usa CRLF', () => {
      const crlf = ANA.replaceAll('\n', '\r\n');
      const { dados, estado } = historico.ler(crlf, ctx('H.md'));
      dados.eventos.push({ ...RETORNO, texto: 'Retorno.\nSem queixas.' });
      const saida = historico.escrever(estado, dados);
      expect(soCrlf(saida)).toBe(true);
      expect(saida.endsWith('- **2026-10-21** [consulta] Retorno.\r\n  Sem queixas.\r\n')).toBe(true);
    });

    it('lista de um item só em CRLF: o evento novo usa o fim de linha do arquivo', () => {
      const fonte = '# Histórico de Saúde — X\r\n\r\n## Eventos\r\n\r\n- **2026-01-10** Primeira anotação.\r\n';
      const { dados, estado } = historico.ler(fonte, ctx('H.md'));
      dados.eventos.push(RETORNO);
      const saida = historico.escrever(estado, dados);
      expect(soCrlf(saida)).toBe(true);
      expect(saida).toBe(`${fonte}- **2026-10-21** [consulta] Retorno com a cardiologista.\r\n`);
    });

    it('com item opaco no meio, mudar um evento muda só a linha dele', () => {
      const fonte = lerFixture(perfil('Bruno', 'Historico.md'));
      const { dados, estado } = historico.ler(fonte, ctx('H.md'));
      const coleta = dados.eventos[1];
      if (coleta === undefined) throw new Error('sem evento');
      coleta.texto = 'Coleta de sangue para hemograma completo.';
      const saida = historico.escrever(estado, dados);
      expect(linhasDiferentes(fonte, saida)).toEqual([7]);
      expect(saida.split('\n')[5]).toBe('- Primeira consulta em março');
    });

    it('seção `## Eventos` sem lista (modelo novo): lê vazio sem problema; acrescentar lança (Fase 1B)', () => {
      const fonte = '# Histórico de Saúde — X\n\n## Eventos\n';
      const { dados, problemas, estado } = historico.ler(fonte, ctx('H.md'));
      expect(dados.eventos).toEqual([]);
      expect(problemas).toEqual([]);
      expect(historico.escrever(estado, dados)).toBe(fonte);
      dados.eventos.push(RETORNO);
      expect(() => historico.escrever(estado, dados)).toThrow('Fase 1B');
    });
  });
});

describe('frontmatter: regravado só quando uma chave muda', () => {
  const ANA = lerFixture(perfil('Ana', 'Ficha.md'));

  it('mudar `plano` muda só a linha do plano (comentário e estilos preservados)', () => {
    const { dados, estado } = ficha.ler(ANA, ctx('F.md'));
    if (dados.frontmatter === undefined) throw new Error('sem frontmatter');
    dados.frontmatter.plano = 'Plano Novo';
    const saida = ficha.escrever(estado, dados);
    expect(linhasDiferentes(ANA, saida)).toEqual([8]);
    expect(saida).toBe(ANA.replace('plano: Plano Exemplo Saúde', 'plano: Plano Novo'));
  });

  it('listas em fluxo mantêm o estilo (aspas dos itens) e datas novas ficam entre aspas', () => {
    const { dados, estado } = ficha.ler(ANA, ctx('F.md'));
    if (dados.frontmatter === undefined) throw new Error('sem frontmatter');
    dados.frontmatter.alergias = ['Dipirona', 'Ibuprofeno'];
    dados.frontmatter.nascimento = '1985-03-11';
    const saida = ficha.escrever(estado, dados);
    expect(linhasDiferentes(ANA, saida)).toEqual([5, 11]);
    expect(saida).toContain('\nalergias: ["Dipirona", "Ibuprofeno"]\n');
    expect(saida).toContain('\nnascimento: "1985-03-11"\n');
  });

  it('null → lista e mudança numa tabela, na mesma gravação', () => {
    const mia = lerFixture(perfil('Mia (gata)', 'Ficha.md'));
    const { dados, estado } = ficha.ler(mia, ctx('F.md'));
    if (dados.frontmatter === undefined) throw new Error('sem frontmatter');
    dados.frontmatter.alergias = [];
    const vet = dados.profissionais[0];
    if (vet === undefined) throw new Error('sem profissional');
    vet.contato = '(11) 3000-0099';
    const saida = ficha.escrever(estado, dados);
    expect(linhasDiferentes(mia, saida)).toEqual([13, 37]);
    expect(saida).toContain('\nalergias: []\n');
    expect(ficha.ler(saida, ctx('F.md')).dados.frontmatter?.alergias).toEqual([]);
  });

  it('chave desconhecida é preservada ao regravar', () => {
    const fonte = ANA.replace('conjuges: [bruno]\n', 'conjuges: [bruno]\napelido: Aninha # do Obsidian\n');
    const { dados, estado } = ficha.ler(fonte, ctx('F.md'));
    if (dados.frontmatter === undefined) throw new Error('sem frontmatter');
    dados.frontmatter.sexo = 'Feminino';
    const saida = ficha.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toEqual([6]);
    expect(saida).toContain('\napelido: Aninha # do Obsidian\n');
  });

  it('CRLF: o frontmatter regravado continua CRLF', () => {
    const crlf = ANA.replaceAll('\n', '\r\n');
    const { dados, estado } = ficha.ler(crlf, ctx('F.md'));
    if (dados.frontmatter === undefined) throw new Error('sem frontmatter');
    dados.frontmatter.papel = 'Mãe e tutora';
    const saida = ficha.escrever(estado, dados);
    expect(soCrlf(saida)).toBe(true);
    expect(linhasDiferentes(crlf, saida)).toEqual([9]);
  });

  it('frontmatter ilegível: sem frontmatter nos dados é no-op; com frontmatter, lança', () => {
    const fonte = ANA.replace('id: ana', 'id: Ana Maria');
    const { dados, estado } = ficha.ler(fonte, ctx('F.md'));
    expect(dados.frontmatter).toBeUndefined();
    expect(ficha.escrever(estado, dados)).toBe(fonte);
    const valido = ficha.ler(ANA, ctx('F.md')).dados.frontmatter;
    expect(() => ficha.escrever(estado, { ...dados, frontmatter: valido })).toThrow(/frontmatter/);
  });

  it('Genetica: acrescentar uma condição muda só a linha da chave', () => {
    const fonte = lerFixture(perfil('Ana', 'Genetica.md'));
    const { dados, estado } = genetica.ler(fonte, ctx('G.md'));
    dados.condicoes_hereditarias.push('Diabetes tipo 2');
    const saida = genetica.escrever(estado, dados);
    expect(linhasDiferentes(fonte, saida)).toEqual([2]);
    expect(saida).toContain('condicoes_hereditarias: ["Hipertensão", "Diabetes tipo 2"]\n');
  });

  it('Genetica ilegível: lista vazia é no-op; gravar uma condição lança', () => {
    const fonte = '---\ncondicoes_hereditarias: [Hipertensão\n---\n\n# Genética\n';
    const { dados, estado } = genetica.ler(fonte, ctx('G.md'));
    expect(genetica.escrever(estado, dados)).toBe(fonte);
    expect(() => genetica.escrever(estado, { condicoes_hereditarias: ['X'] })).toThrow(/frontmatter/);
  });
});

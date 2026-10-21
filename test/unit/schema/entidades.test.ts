import { describe, expect, it } from 'vitest';
import { Dose } from '../../../src/core/schema/dose.js';
import { Evento } from '../../../src/core/schema/evento.js';
import {
  Glicemia,
  Marcador,
  Peso,
  Pressao,
  valorNumerico,
} from '../../../src/core/schema/exame.js';
import { SalusYaml } from '../../../src/core/schema/manifesto.js';
import {
  Contato,
  FichaFrontmatter,
  Membro,
  Profissional,
} from '../../../src/core/schema/membro.js';
import {
  MedicamentoDescontinuado,
  MedicamentoEmUso,
  MedicamentoPrescrito,
} from '../../../src/core/schema/medicamento.js';
import { Consulta, ExameSolicitado } from '../../../src/core/schema/pendencia.js';
import { Antiparasitario, Vacina } from '../../../src/core/schema/vacina.js';

const marcadorBase = {
  exame: 'Hemograma',
  data: '2026-09-15',
  marcador: 'Leucócitos',
  valor: '11800',
  unidade: '/mm³',
  faixa_do_laudo: '4000 a 11000',
  flag: 'alto',
  obs: '',
};

describe('Marcador', () => {
  it('rejeita flag preenchida sem faixa do laudo', () => {
    const r = Marcador.safeParse({ ...marcadorBase, flag: 'alto', faixa_do_laudo: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues).toHaveLength(1);
      expect(r.error.issues[0]?.path).toEqual(['faixa_do_laudo']);
      expect(r.error.issues[0]?.message).toContain('Faixa do laudo');
      // o codec do Exames.md mapeia este código para o problema `faixa_obrigatoria`
      const [problema] = r.error.issues;
      expect(problema?.code).toBe('custom');
      expect(problema && 'params' in problema ? problema.params : undefined).toEqual({ codigo: 'faixa_obrigatoria' });
    }
  });

  it('aceita flag acompanhada da faixa', () => {
    expect(Marcador.safeParse({ ...marcadorBase, flag: 'alto' }).success).toBe(true);
    expect(Marcador.safeParse({ ...marcadorBase, flag: 'baixo' }).success).toBe(true);
    expect(Marcador.safeParse({ ...marcadorBase, flag: 'normal' }).success).toBe(true);
  });

  it('aceita faixa sem flag e linha sem faixa nem flag', () => {
    expect(Marcador.safeParse({ ...marcadorBase, flag: '' }).success).toBe(true);
    expect(Marcador.safeParse({ ...marcadorBase, flag: '', faixa_do_laudo: '' }).success).toBe(true);
  });

  it('completa com vazio as colunas opcionais ausentes', () => {
    const r = Marcador.parse({
      exame: 'Hemograma',
      data: '2026-09-15',
      marcador: 'Hemoglobina',
      valor: '13,8',
    });
    expect(r).toEqual({
      exame: 'Hemograma',
      data: '2026-09-15',
      marcador: 'Hemoglobina',
      valor: '13,8',
      unidade: '',
      faixa_do_laudo: '',
      flag: '',
      obs: '',
    });
  });

  it('rejeita flag fora do vocabulário, data inexistente, marcador ou valor vazios', () => {
    expect(Marcador.safeParse({ ...marcadorBase, flag: 'crítico' }).success).toBe(false);
    expect(Marcador.safeParse({ ...marcadorBase, data: '2026-02-30' }).success).toBe(false);
    expect(Marcador.safeParse({ ...marcadorBase, marcador: '' }).success).toBe(false);
    expect(Marcador.safeParse({ ...marcadorBase, valor: '' }).success).toBe(false);
  });
});

describe('valorNumerico', () => {
  it('lê vírgula e ponto como separador decimal', () => {
    expect(valorNumerico('5,5')).toBe(5.5);
    expect(valorNumerico('5.5')).toBe(5.5);
    expect(valorNumerico('13,8')).toBe(13.8);
  });

  it('lê inteiros, negativos e ignora espaços nas pontas', () => {
    expect(valorNumerico('6800')).toBe(6800);
    expect(valorNumerico(' 12,0 ')).toBe(12);
    expect(valorNumerico('-3,2')).toBe(-3.2);
  });

  it('devolve null para o milhar ambíguo (11.800, 1,234): pode ser 11800 ou 11,8', () => {
    expect(valorNumerico('11.800')).toBeNull();
    expect(valorNumerico('1,234')).toBeNull();
    expect(valorNumerico('100,000')).toBeNull();
    expect(valorNumerico('-1,234')).toBeNull();
  });

  it('só trata como milhar três casas exatas com no máximo três dígitos antes; o resto é decimal', () => {
    expect(valorNumerico('0,500')).toBe(0.5);
    expect(valorNumerico('5,5')).toBe(5.5);
    expect(valorNumerico('5.5')).toBe(5.5);
    expect(valorNumerico('1234,567')).toBe(1234.567);
    expect(valorNumerico('1,23')).toBe(1.23);
    expect(valorNumerico('1,2345')).toBe(1.2345);
  });

  it('devolve null para comparador, texto e vazio', () => {
    expect(valorNumerico('< 0,5')).toBeNull();
    expect(valorNumerico('> 10')).toBeNull();
    expect(valorNumerico('')).toBeNull();
    expect(valorNumerico('   ')).toBeNull();
    expect(valorNumerico('negativo')).toBeNull();
    expect(valorNumerico('1e3')).toBeNull();
    expect(valorNumerico('5,5,5')).toBeNull();
    expect(valorNumerico('5,')).toBeNull();
  });
});

describe('Peso, Pressao e Glicemia', () => {
  it('Peso exige data válida e o valor, e completa a obs', () => {
    expect(Peso.parse({ data: '2026-03-10', peso: '68,4' })).toEqual({
      data: '2026-03-10',
      peso: '68,4',
      obs: '',
    });
    expect(Peso.safeParse({ data: '', peso: '68,4' }).success).toBe(false);
    expect(Peso.safeParse({ data: '2026-03-10', peso: '' }).success).toBe(false);
  });

  it('Pressao exige sistólica e diastólica; a FC é opcional', () => {
    expect(Pressao.parse({ data: '2026-09-15', sistolica: '128', diastolica: '82' })).toEqual({
      data: '2026-09-15',
      sistolica: '128',
      diastolica: '82',
      fc: '',
      obs: '',
    });
    expect(Pressao.safeParse({ data: '2026-09-15', sistolica: '128', diastolica: '' }).success).toBe(false);
  });

  it('Glicemia aceita hora vazia ou HH:MM e rejeita hora inválida', () => {
    expect(Glicemia.safeParse({ data: '2026-09-15', hora: '07:30', valor: '92', condicao: 'jejum' }).success).toBe(true);
    expect(Glicemia.safeParse({ data: '2026-09-15', valor: '92' }).success).toBe(true);
    expect(Glicemia.safeParse({ data: '2026-09-15', hora: '25:00', valor: '92' }).success).toBe(false);
  });
});

describe('FichaFrontmatter', () => {
  const minimo = { id: 'ana', nome: 'Ana', tipo: 'pessoa' };

  it('aceita alergias nos três estados: null, [] e lista', () => {
    expect(FichaFrontmatter.parse({ ...minimo, alergias: null }).alergias).toBeNull();
    expect(FichaFrontmatter.parse({ ...minimo, alergias: [] }).alergias).toEqual([]);
    expect(FichaFrontmatter.parse({ ...minimo, alergias: ['Dipirona'] }).alergias).toEqual(['Dipirona']);
  });

  it('alergias ausente é "ainda não perguntado" (null), nunca lista vazia', () => {
    expect(FichaFrontmatter.parse(minimo).alergias).toBeNull();
  });

  it('aplica [] nas listas ausentes e vazio nos textos ausentes', () => {
    expect(FichaFrontmatter.parse(minimo)).toEqual({
      id: 'ana',
      nome: 'Ana',
      tipo: 'pessoa',
      nascimento: '',
      sexo: '',
      tipo_sanguineo: '',
      plano: '',
      papel: '',
      raca: '',
      castrado: '',
      microchip: '',
      alergias: null,
      condicoes_ativas: [],
      marcadores_chave: [],
      pais_biologicos: [],
      responsaveis: [],
      tutores: [],
      conjuges: [],
    });
  });

  it('mantém as listas e os textos informados (animal)', () => {
    const r = FichaFrontmatter.parse({
      id: 'mia',
      nome: 'Mia',
      tipo: 'gato',
      nascimento: '2021-05-01',
      castrado: 'sim',
      microchip: '985112000123456',
      tutores: ['ana', 'bruno'],
      pais_biologicos: ['Maria (avó materna)'],
    });
    expect(r.tutores).toEqual(['ana', 'bruno']);
    expect(r.pais_biologicos).toEqual(['Maria (avó materna)']);
    expect(r.castrado).toBe('sim');
    expect(r.microchip).toBe('985112000123456');
  });

  it('exige id, nome e tipo', () => {
    expect(FichaFrontmatter.safeParse({ nome: 'Ana', tipo: 'pessoa' }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ id: 'ana', tipo: 'pessoa' }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ id: 'ana', nome: 'Ana' }).success).toBe(false);
  });

  it('rejeita id fora do padrão, tipo desconhecido e nascimento inexistente', () => {
    expect(FichaFrontmatter.safeParse({ ...minimo, id: 'Ana' }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ ...minimo, tipo: 'ave' }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ ...minimo, nascimento: '2026-02-30' }).success).toBe(false);
  });

  it('chave presente mas vazia (`plano:` sem valor chega como null) vale vazio, como a ausente', () => {
    expect(FichaFrontmatter.parse({ ...minimo, plano: null }).plano).toBe('');
    expect(FichaFrontmatter.parse({ id: 'x', nome: 'X', tipo: 'pessoa', plano: null }).plano).toBe('');
    expect(FichaFrontmatter.parse({ ...minimo, nascimento: null }).nascimento).toBe('');
    expect(FichaFrontmatter.parse({ ...minimo, tutores: null }).tutores).toEqual([]);
    expect(FichaFrontmatter.parse({ ...minimo, alergias: null }).alergias).toBeNull();
  });

  it('nome, id e tipo vazios (null) continuam obrigatórios', () => {
    expect(FichaFrontmatter.safeParse({ ...minimo, nome: null }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ ...minimo, id: null }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ ...minimo, tipo: null }).success).toBe(false);
  });

  it('rejeita escalar que não é texto (microchip sem aspas vira número no YAML)', () => {
    expect(FichaFrontmatter.safeParse({ ...minimo, microchip: 985112000123456 }).success).toBe(false);
  });

  it('rejeita lista com item que não é texto e alergias que não é null nem lista', () => {
    expect(FichaFrontmatter.safeParse({ ...minimo, conjuges: [1] }).success).toBe(false);
    expect(FichaFrontmatter.safeParse({ ...minimo, alergias: 'Dipirona' }).success).toBe(false);
  });

  it('ignora chaves desconhecidas (o codec as preserva no YAML)', () => {
    const r = FichaFrontmatter.parse({ ...minimo, apelido: 'Aninha' });
    expect('apelido' in r).toBe(false);
  });
});

describe('Contato e Profissional', () => {
  it('exigem o nome e completam o resto com vazio', () => {
    expect(Contato.parse({ nome: 'Bruno' })).toEqual({ nome: 'Bruno', relacao: '', telefone: '' });
    expect(Contato.safeParse({ relacao: 'Cônjuge' }).success).toBe(false);
    expect(Profissional.parse({ nome: 'Dra. Helena Prado', especialidade: 'Cardiologia' })).toEqual({
      nome: 'Dra. Helena Prado',
      especialidade: 'Cardiologia',
      contato: '',
      acompanha: '',
    });
    expect(Profissional.safeParse({ nome: '' }).success).toBe(false);
  });
});

describe('medicamentos', () => {
  it('MedicamentoEmUso aceita datas vazias e válidas e completa as colunas ausentes', () => {
    const r = MedicamentoEmUso.parse({
      nome: 'Losartana',
      dose: '50 mg',
      frequencia: '1x ao dia',
      via: 'oral',
      desde: '2024-08-20',
      prescrito_por: 'Dra. Helena Prado',
      renova_em: '2026-11-05',
      termino_em: '',
    });
    expect(r.renova_em).toBe('2026-11-05');
    expect(r.termino_em).toBe('');
    expect(r.obs).toBe('');
  });

  it('MedicamentoEmUso rejeita data inexistente e nome vazio', () => {
    expect(MedicamentoEmUso.safeParse({ nome: 'Losartana', renova_em: '2026-02-30' }).success).toBe(false);
    expect(MedicamentoEmUso.safeParse({ nome: 'Losartana', desde: '20/08/2024' }).success).toBe(false);
    expect(MedicamentoEmUso.safeParse({ nome: '' }).success).toBe(false);
  });

  it('MedicamentoPrescrito e MedicamentoDescontinuado validam suas datas', () => {
    expect(
      MedicamentoPrescrito.safeParse({ nome: 'Atorvastatina', data_receita: '2026-10-10', validade_receita: '2026-12-01' }).success,
    ).toBe(true);
    expect(MedicamentoPrescrito.safeParse({ nome: 'Atorvastatina', validade_receita: '2026-12-32' }).success).toBe(false);
    expect(MedicamentoDescontinuado.safeParse({ nome: 'Amoxicilina', inicio: '2026-10-18', fim: '2026-10-25' }).success).toBe(true);
    expect(MedicamentoDescontinuado.safeParse({ nome: 'Amoxicilina', fim: 'ontem' }).success).toBe(false);
  });
});

describe('vacinas e antiparasitários', () => {
  it('Vacina aceita próxima dose vazia', () => {
    expect(Vacina.parse({ nome: 'COVID-19 (reforço)', aplicada_em: '2025-11-20' })).toEqual({
      nome: 'COVID-19 (reforço)',
      aplicada_em: '2025-11-20',
      proxima_em: '',
      obs: '',
    });
    expect(Vacina.safeParse({ nome: 'Influenza', proxima_em: '2027-13-15' }).success).toBe(false);
  });

  it('Antiparasitario exige o tipo do vocabulário', () => {
    expect(
      Antiparasitario.safeParse({ produto: 'Drontal Gatos', tipo: 'vermifugo', aplicado_em: '2026-08-10', proximo_em: '2027-02-10' }).success,
    ).toBe(true);
    expect(Antiparasitario.safeParse({ produto: 'Drontal Gatos', tipo: 'vermífugo' }).success).toBe(false);
    expect(Antiparasitario.safeParse({ produto: 'Drontal Gatos' }).success).toBe(false);
  });
});

describe('Evento', () => {
  it('aceita tipo do vocabulário e tipo null (evento sem tipo)', () => {
    expect(Evento.safeParse({ data: '2026-03-10', tipo: 'consulta', texto: 'Consulta de rotina.' }).success).toBe(true);
    expect(Evento.safeParse({ data: '2026-03-12', tipo: null, texto: 'Coleta de sangue.' }).success).toBe(true);
  });

  it('rejeita tipo desconhecido, data inexistente, texto vazio e tipo ausente', () => {
    expect(Evento.safeParse({ data: '2026-03-10', tipo: 'exame', texto: 'x' }).success).toBe(false);
    expect(Evento.safeParse({ data: '2026-02-30', tipo: null, texto: 'x' }).success).toBe(false);
    expect(Evento.safeParse({ data: '2026-03-10', tipo: null, texto: '' }).success).toBe(false);
    expect(Evento.safeParse({ data: '2026-03-10', texto: 'x' }).success).toBe(false);
  });
});

describe('pendências e doses', () => {
  it('ExameSolicitado aceita "Realizar até" vazio', () => {
    const r = ExameSolicitado.parse({ exame: 'Perfil lipídico completo', solicitado_em: '2026-10-10' });
    expect(r.realizar_ate).toBe('');
    expect(ExameSolicitado.safeParse({ exame: 'Perfil', realizar_ate: '2027-02-31' }).success).toBe(false);
    expect(ExameSolicitado.safeParse({ exame: '' }).success).toBe(false);
  });

  it('Consulta aceita data vazia (entra na agenda como sem data)', () => {
    expect(Consulta.safeParse({ tipo: 'Check-up anual' }).success).toBe(true);
    expect(Consulta.safeParse({ tipo: 'Retorno de cardiologia', data: '2027-03-18' }).success).toBe(true);
    expect(Consulta.safeParse({ tipo: 'Retorno', data: '2027-03-32' }).success).toBe(false);
  });

  it('Dose exige data, medicamento e hora vazia ou HH:MM', () => {
    expect(Dose.parse({ data: '2026-10-20', hora: '08:00', medicamento: 'Losartana', dose: '50 mg' })).toEqual({
      data: '2026-10-20',
      hora: '08:00',
      medicamento: 'Losartana',
      dose: '50 mg',
      obs: '',
    });
    expect(Dose.safeParse({ data: '2026-10-20', medicamento: 'Losartana' }).success).toBe(true);
    expect(Dose.safeParse({ data: '2026-10-20', hora: '8h', medicamento: 'Losartana' }).success).toBe(false);
    expect(Dose.safeParse({ data: '', medicamento: 'Losartana' }).success).toBe(false);
    expect(Dose.safeParse({ data: '2026-10-20', medicamento: '' }).success).toBe(false);
  });
});

describe('SalusYaml', () => {
  const valido = {
    schema_versao: 2,
    versao_salus: '0.5.0',
    familia: 'Exemplo',
    criado_em: '2026-01-15',
    ultima_revisao: '2026-09-15',
  };

  it('aceita o manifesto do cofre de exemplo e ultima_revisao null', () => {
    expect(SalusYaml.safeParse(valido).success).toBe(true);
    expect(SalusYaml.parse({ ...valido, ultima_revisao: null }).ultima_revisao).toBeNull();
  });

  it('ultima_revisao ausente vale null', () => {
    const { ultima_revisao: _omitida, ...semRevisao } = valido;
    expect(SalusYaml.parse(semRevisao).ultima_revisao).toBeNull();
  });

  it('rejeita schema_versao 1 (formato antigo) e qualquer outro valor', () => {
    expect(SalusYaml.safeParse({ ...valido, schema_versao: 1 }).success).toBe(false);
    expect(SalusYaml.safeParse({ ...valido, schema_versao: 3 }).success).toBe(false);
    expect(SalusYaml.safeParse({ ...valido, schema_versao: '2' }).success).toBe(false);
  });

  it('rejeita data inexistente e campos obrigatórios ausentes', () => {
    expect(SalusYaml.safeParse({ ...valido, criado_em: '2026-02-30' }).success).toBe(false);
    expect(SalusYaml.safeParse({ ...valido, ultima_revisao: '15/09/2026' }).success).toBe(false);
    expect(SalusYaml.safeParse({ ...valido, versao_salus: undefined }).success).toBe(false);
    expect(SalusYaml.safeParse({ ...valido, familia: '' }).success).toBe(false);
  });
});

describe('Membro', () => {
  const membroMinimo = {
    id: 'ana',
    pasta: 'Ana',
    ficha: {
      frontmatter: { id: 'ana', nome: 'Ana', tipo: 'pessoa' },
      contatos: [],
      profissionais: [],
    },
    medicamentos: { emUso: [], prescritos: [], descontinuados: [] },
    vacinas: [],
    antiparasitarios: [],
    exames: { pesos: [], pressoes: [], glicemias: [], marcadores: [] },
    historico: [],
    pendencias: { examesSolicitados: [], consultas: [] },
    doses: [],
    genetica: { condicoes_hereditarias: [] },
  };

  it('aceita o agregado de um membro sem registros e aplica os defaults da ficha', () => {
    const r = Membro.parse(membroMinimo);
    expect(r.ficha.frontmatter.alergias).toBeNull();
    expect(r.ficha.frontmatter.tutores).toEqual([]);
    expect(r.genetica.condicoes_hereditarias).toEqual([]);
  });

  it('valida as entidades aninhadas', () => {
    const comMarcadorInvalido = {
      ...membroMinimo,
      exames: {
        ...membroMinimo.exames,
        marcadores: [{ ...marcadorBase, flag: 'alto', faixa_do_laudo: '' }],
      },
    };
    expect(Membro.safeParse(comMarcadorInvalido).success).toBe(false);

    const comMarcadorValido = {
      ...membroMinimo,
      exames: { ...membroMinimo.exames, marcadores: [marcadorBase] },
    };
    expect(Membro.safeParse(comMarcadorValido).success).toBe(true);
  });

  it('exige pasta e cada grupo do agregado', () => {
    expect(Membro.safeParse({ ...membroMinimo, pasta: '' }).success).toBe(false);
    const { doses: _doses, ...semDoses } = membroMinimo;
    expect(Membro.safeParse(semDoses).success).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { type EspecComando, parseArgumentos } from '../../src/cli/args.js';
import { comandos } from '../../src/cli/main.js';

// `parseArgumentos` contra o registro de verdade: as flags válidas vêm dele, não de uma lista à parte.

const parse = (argv: string[]) => parseArgumentos(argv, comandos);

describe('parseArgumentos: ajuda, versão e comando', () => {
  it('--version e -v viram opcoes.version, sem erro', () => {
    for (const flag of ['--version', '-v']) {
      const r = parse([flag]);
      expect(r.erro, flag).toBeUndefined();
      expect(r.opcoes.version, flag).toBe(true);
    }
  });

  it('sem argumentos não tem comando nem erro (o main mostra a ajuda)', () => {
    const r = parse([]);
    expect(r.comando).toBeUndefined();
    expect(r.posicionais).toEqual([]);
    expect(r.erro).toBeUndefined();
  });

  it('--help e -h viram opcoes.help, sem erro', () => {
    for (const flag of ['--help', '-h']) {
      const r = parse([flag]);
      expect(r.erro, flag).toBeUndefined();
      expect(r.opcoes.help, flag).toBe(true);
    }
  });

  it('--version e --help juntos: as duas ficam marcadas e nenhum erro (o main decide: --version vence)', () => {
    const r = parse(['--help', '--version']);
    expect(r.erro).toBeUndefined();
    expect(r.opcoes.version).toBe(true);
    expect(r.opcoes.help).toBe(true);
  });

  it('opção desconhecida: erro opcao_desconhecida com a opção como escrita', () => {
    expect(parse(['--froce']).erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--froce' });
  });

  it('todas as opções desconhecidas entram no detalhe, sem repetir', () => {
    const r = parse(['init', '--a', '-x', '--a', 'Nova']);
    expect(r.erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--a, -x' });
  });

  it('opção desconhecida vence --version', () => {
    const r = parse(['init', 'Nova', '--version', '--froce']);
    expect(r.erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--froce' });
  });

  it('opção desconhecida vence valor ausente', () => {
    expect(parse(['--cofre', '--froce']).erro?.tipo).toBe('opcao_desconhecida');
  });

  it('comando desconhecido: erro comando_desconhecido com o texto digitado', () => {
    const r = parse(['foo']);
    expect(r.erro).toEqual({ tipo: 'comando_desconhecido', detalhe: 'foo' });
  });

  it('--help e --version valem mesmo com comando desconhecido', () => {
    expect(parse(['foo', '--help']).erro).toBeUndefined();
    expect(parse(['foo', '--version']).erro).toBeUndefined();
  });

  it('init Nova --help: comando init, posicional Nova, help ligado, sem erro', () => {
    const r = parse(['init', 'Nova', '--help']);
    expect(r.comando).toBe('init');
    expect(r.posicionais).toEqual(['Nova']);
    expect(r.opcoes.help).toBe(true);
    expect(r.erro).toBeUndefined();
  });

  it('opções valem em qualquer posição e -f é --force', () => {
    for (const argv of [['--force', 'init', 'Nova'], ['init', 'Nova', '-f'], ['init', '--force', 'Nova']]) {
      const r = parse(argv);
      expect(r.comando, argv.join(' ')).toBe('init');
      expect(r.posicionais, argv.join(' ')).toEqual(['Nova']);
      expect(r.opcoes.force, argv.join(' ')).toBe(true);
    }
  });

  it('check e status são aliases de doctor; o comando devolvido é o nome oficial', () => {
    expect(parse(['check', 'Nova']).comando).toBe('doctor');
    expect(parse(['status']).comando).toBe('doctor');
    expect(parse(['doctor']).comando).toBe('doctor');
  });

  it('opção de outro comando é aceita (e ignorada pelo comando): update --force', () => {
    const r = parse(['update', '--force', 'Nova']);
    expect(r.erro).toBeUndefined();
    expect(r.comando).toBe('update');
    expect(r.posicionais).toEqual(['Nova']);
    expect(r.opcoes.force).toBe(true);
  });
});

describe('parseArgumentos: opções com valor e posicionais obrigatórios', () => {
  it('--cofre=x e --cofre x são equivalentes', () => {
    const a = parse(['membros', '--cofre=Minha Pasta', '--json']);
    const b = parse(['membros', '--cofre', 'Minha Pasta', '--json']);
    expect(a.erro).toBeUndefined();
    expect(a.opcoes).toEqual({ cofre: 'Minha Pasta', json: true });
    expect(b).toEqual(a);
  });

  it('--secao medicamentos,exames chega inteira, como texto', () => {
    const r = parse(['perfil', 'ana', '--secao', 'medicamentos,exames']);
    expect(r.erro).toBeUndefined();
    expect(r.posicionais).toEqual(['ana']);
    expect(r.opcoes.secao).toBe('medicamentos,exames');
  });

  it('posicional obrigatório ausente: erro posicional_faltando com o nome do argumento', () => {
    expect(parse(['perfil']).erro).toEqual({ tipo: 'posicional_faltando', detalhe: 'id' });
    expect(parse(['buscar', '--json']).erro).toEqual({ tipo: 'posicional_faltando', detalhe: 'texto' });
    expect(parse(['marcador', 'ana']).erro).toEqual({ tipo: 'posicional_faltando', detalhe: 'nome' });
  });

  it('posicional opcional pode faltar: init, update, doctor, membros, agenda', () => {
    for (const comando of ['init', 'update', 'doctor', 'membros', 'agenda']) {
      expect(parse([comando]).erro, comando).toBeUndefined();
    }
  });

  it('com --help ou --version, posicional faltando não é erro', () => {
    expect(parse(['perfil', '--help']).erro).toBeUndefined();
    expect(parse(['perfil', '--version']).erro).toBeUndefined();
  });

  it('valor ausente: --cofre como último argumento', () => {
    expect(parse(['membros', '--json', '--cofre']).erro).toEqual({ tipo: 'valor_faltando', detalhe: '--cofre' });
  });

  it('valor ausente: --cofre seguido de outra opção', () => {
    expect(parse(['membros', '--cofre', '--json']).erro).toEqual({ tipo: 'valor_faltando', detalhe: '--cofre' });
  });

  it('valor ausente: --cofre= vazio', () => {
    expect(parse(['membros', '--cofre=']).erro).toEqual({ tipo: 'valor_faltando', detalhe: '--cofre' });
  });

  it('valor ausente vence --version e --help', () => {
    expect(parse(['--cofre', '--version']).erro?.tipo).toBe('valor_faltando');
    expect(parse(['membros', '--hoje', '--help']).erro).toEqual({ tipo: 'valor_faltando', detalhe: '--hoje' });
  });

  it('valor ausente vence comando desconhecido e posicional faltando', () => {
    expect(parse(['foo', '--cofre']).erro?.tipo).toBe('valor_faltando');
    expect(parse(['perfil', '--cofre']).erro?.tipo).toBe('valor_faltando');
  });

  it('o valor de uma opção não vira posicional nem comando', () => {
    const r = parse(['--cofre', 'x', 'membros']);
    expect(r.comando).toBe('membros');
    expect(r.posicionais).toEqual([]);
    expect(r.opcoes.cofre).toBe('x');
  });
});

describe('parseArgumentos: registro próprio', () => {
  const specs: EspecComando[] = [
    {
      nome: 'copiar',
      aliases: ['cp'],
      posicionais: [
        { nome: 'origem', obrigatorio: true },
        { nome: 'destino', obrigatorio: true },
      ],
      opcoes: { semente: { tipo: 'string', curto: 's' }, quieto: { tipo: 'boolean', curto: 'q' } },
    },
  ];

  it('opções curtas com valor: -s 7', () => {
    const r = parseArgumentos(['cp', 'a', 'b', '-s', '7', '-q'], specs);
    expect(r.erro).toBeUndefined();
    expect(r.comando).toBe('copiar');
    expect(r.posicionais).toEqual(['a', 'b']);
    expect(r.opcoes).toEqual({ semente: '7', quieto: true });
  });

  it('-s sem valor também é valor ausente', () => {
    expect(parseArgumentos(['cp', 'a', 'b', '-s'], specs).erro).toEqual({
      tipo: 'valor_faltando',
      detalhe: '--semente',
    });
  });

  it('opções globais existem sem o comando declarar', () => {
    expect(parseArgumentos(['-h'], specs).opcoes.help).toBe(true);
    expect(parseArgumentos(['--force'], specs).erro?.tipo).toBe('opcao_desconhecida');
  });

  it('o primeiro posicional que falta é o que o erro nomeia', () => {
    expect(parseArgumentos(['copiar'], specs).erro).toEqual({ tipo: 'posicional_faltando', detalhe: 'origem' });
    expect(parseArgumentos(['copiar', 'a'], specs).erro).toEqual({ tipo: 'posicional_faltando', detalhe: 'destino' });
  });
});

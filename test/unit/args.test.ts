import { describe, expect, it } from 'vitest';
import { type EspecComando, parseArgumentos, validarRegistro } from '../../src/cli/args.js';
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

describe('parseArgumentos: posicional a mais', () => {
  it('nos comandos novos, um posicional além dos declarados é erro argumento_extra com o primeiro extra', () => {
    expect(parse(['buscar', 'colesterol', 'total', '--json']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'total' });
    expect(parse(['membros', 'sobra', 'outra']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'sobra' });
    expect(parse(['perfil', 'ana', 'bruno']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'bruno' });
    expect(parse(['marcador', 'ana', 'Colesterol', 'total']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'total' });
    expect(parse(['agenda', 'x']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'x' });
    expect(parse(['inspecionar', 'a', 'b']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'b' });
    expect(parse(['anonimizar', 'a', 'b', 'c']).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'c' });
  });

  it('texto com espaços entre aspas é um posicional só: não é extra', () => {
    expect(parse(['buscar', 'colesterol total', '--json']).erro).toBeUndefined();
    expect(parse(['marcador', 'ana', 'Colesterol total']).erro).toBeUndefined();
  });

  it('init, update e doctor (e os aliases) aceitam extras, como antes', () => {
    for (const comando of ['init', 'update', 'doctor', 'check', 'status']) {
      const r = parse([comando, 'Pasta', 'sobra']);
      expect(r.erro, comando).toBeUndefined();
      expect(r.posicionais, comando).toEqual(['Pasta', 'sobra']);
    }
  });

  it('posicional faltando vem antes de argumento a mais; --help e --version não dão erro', () => {
    const specs: EspecComando[] = [
      { nome: 'c', posicionais: [{ nome: 'x', obrigatorio: true }], opcoes: {} },
    ];
    expect(parseArgumentos(['c'], specs).erro).toEqual({ tipo: 'posicional_faltando', detalhe: 'x' });
    expect(parseArgumentos(['c', 'a', 'b'], specs).erro).toEqual({ tipo: 'argumento_extra', detalhe: 'b' });
    expect(parseArgumentos(['c', 'a', 'b', '--help'], specs).erro).toBeUndefined();
    expect(parseArgumentos(['c', 'a', 'b', '--version'], specs).erro).toBeUndefined();
    const comExtras: EspecComando[] = [
      { nome: 'c', posicionais: [{ nome: 'x', obrigatorio: true }], opcoes: {}, aceitaExtras: true },
    ];
    expect(parseArgumentos(['c', 'a', 'b'], comExtras).erro).toBeUndefined();
  });

  it('opção desconhecida e valor ausente vencem argumento a mais', () => {
    expect(parse(['buscar', 'a', 'b', '--xpto']).erro?.tipo).toBe('opcao_desconhecida');
    expect(parse(['buscar', 'a', 'b', '--cofre']).erro?.tipo).toBe('valor_faltando');
  });
});

describe('parseArgumentos: opção booleana com =valor é desconhecida (como antes)', () => {
  it('--force=false não liga o force: é opcao_desconhecida com a opção inteira', () => {
    const r = parse(['init', '--force=false']);
    expect(r.erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--force=false' });
    expect(r.opcoes.force).toBeUndefined();
  });

  it('--json=x, --help=1 e --version=1 também', () => {
    expect(parse(['membros', '--json=x']).erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--json=x' });
    expect(parse(['--help=1']).erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--help=1' });
    expect(parse(['--version=1']).erro).toEqual({ tipo: 'opcao_desconhecida', detalhe: '--version=1' });
  });

  it('entra na lista junto com as outras desconhecidas, na ordem digitada', () => {
    expect(parse(['--froce=1', 'init', '--force=0']).erro).toEqual({
      tipo: 'opcao_desconhecida',
      detalhe: '--froce=1, --force=0',
    });
  });

  it('vence --version', () => {
    expect(parse(['--version', '--force=false']).erro?.tipo).toBe('opcao_desconhecida');
  });
});

describe('parseArgumentos: casos de borda fixados', () => {
  it('-- sozinho: sem comando (cai na ajuda)', () => {
    const r = parse(['--']);
    expect(r.comando).toBeUndefined();
    expect(r.posicionais).toEqual([]);
    expect(r.erro).toBeUndefined();
  });

  it('depois de --, o que parece opção é posicional: init -- -x', () => {
    const r = parse(['init', '--', '-x']);
    expect(r.erro).toBeUndefined();
    expect(r.comando).toBe('init');
    expect(r.posicionais).toEqual(['-x']);
  });

  it('- sozinho é posicional (e, como 1º posicional, um comando desconhecido)', () => {
    const r = parse(['-']);
    expect(r.erro).toEqual({ tipo: 'comando_desconhecido', detalhe: '-' });
    expect(parse(['init', '-']).posicionais).toEqual(['-']);
  });

  it('init --cofre Nova: --cofre (de outro comando) consome Nova e não sobra posicional', () => {
    const r = parse(['init', '--cofre', 'Nova']);
    expect(r.erro).toBeUndefined();
    expect(r.posicionais).toEqual([]);
    expect(r.opcoes.cofre).toBe('Nova');
  });
});

describe('parseArgumentos: registro próprio', () => {
  const comOpcao = (opcoes: EspecComando['opcoes']): EspecComando[] => [
    { nome: 'a', posicionais: [], opcoes: { x: { tipo: 'boolean' } } },
    { nome: 'b', posicionais: [], opcoes },
  ];

  it('mesma opção com o mesmo tipo e o mesmo curto em dois comandos é aceita', () => {
    expect(() => parseArgumentos(['a'], comOpcao({ x: { tipo: 'boolean' } }))).not.toThrow();
  });

  it('mesma opção com tipos diferentes em dois comandos é erro de programação', () => {
    expect(() => parseArgumentos(['a'], comOpcao({ x: { tipo: 'string' } }))).toThrow(/--x/);
  });

  it('mesma opção com curtos diferentes em dois comandos é erro de programação', () => {
    expect(() => parseArgumentos(['a'], comOpcao({ x: { tipo: 'boolean', curto: 'x' } }))).toThrow(/--x/);
  });

  it('opção de comando que redefine uma global (help) com outro tipo também é erro', () => {
    expect(() => parseArgumentos([], comOpcao({ help: { tipo: 'string' } }))).toThrow(/--help/);
  });

  it('o registro de verdade não tem conflito', () => {
    expect(() => validarRegistro(comandos)).not.toThrow();
  });

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

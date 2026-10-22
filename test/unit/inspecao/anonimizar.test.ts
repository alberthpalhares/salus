import * as fs from 'node:fs';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { anonimizar, type RelatorioAnonimizacao } from '../../../src/core/inspecao/anonimizar.js';
import { inspecionar } from '../../../src/core/inspecao/inspecionar.js';
import { normalizarParaBusca } from '../../../src/core/queries/normalizar.js';
import { somarDias } from '../../../src/core/queries/datas.js';
import { copiaDoExemplo, EXEMPLO, removerCopias, substituir } from '../../helpers/cofre-exemplo.js';
import {
  type CofreV1,
  criarCofreV1,
  DATA_BR_V1,
  EMAILS_V1,
  NOMES_V1,
  TELEFONES_V1,
  TERCEIROS_V1,
} from '../../helpers/v1.js';
import { makeTempRoot, readTree, removeTempRoot } from '../../helpers/vault.js';

// `anonimizar` grava uma cópia determinística sem nenhum nome, data, telefone ou e-mail original.

const SEMENTE = 42;

let v1: CofreV1;
let tmp: string;
let contador = 0;

beforeAll(async () => {
  v1 = await criarCofreV1();
  tmp = await makeTempRoot();
});

afterAll(async () => {
  removerCopias();
  await v1.limpar();
  await removeTempRoot(tmp);
});

/** Uma pasta de destino nova (que ainda não existe) dentro da pasta temporária do teste. */
function destinoNovo(): string {
  contador++;
  return path.join(tmp, `destino-${contador}`);
}

/** Inspeção sem a raiz e sem o ANONIMIZACAO.md, para comparar a árvore de origem com a de destino. */
function estrutura(dir: string): unknown {
  const { raiz: _raiz, ...resto } = inspecionar(dir);
  return { ...resto, arquivos: resto.arquivos.filter((a) => a.caminho !== 'ANONIMIZACAO.md') };
}

/** Todos os textos (concatenados) e os caminhos relativos do destino. */
function conteudoDe(dir: string): { textos: string; caminhos: string[] } {
  const arvore = readTree(dir);
  return {
    textos: [...arvore.values()].map((b) => b.toString('utf8')).join('\n'),
    caminhos: [...arvore.keys()],
  };
}

/** Datas (nos dois formatos) que aparecem nos textos de `dir`. */
function datasDe(dir: string): string[] {
  const datas = new Set<string>();
  for (const [rel, conteudo] of readTree(dir)) {
    const texto = `${rel}\n${conteudo.toString('utf8')}`;
    for (const m of texto.matchAll(/(?<!\d)\d{4}-\d{2}-\d{2}(?!\d)|(?<!\d)\d{2}\/\d{2}\/\d{4}(?!\d)/g)) datas.add(m[0]);
  }
  return [...datas];
}

/** A data deslocada por `dias` no mesmo formato (`undefined` se não existe no calendário). */
function deslocar(data: string, dias: number): string | undefined {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
  const iso = br === null ? data : `${br[3]}-${br[2]}-${br[1]}`;
  let saida: string;
  try {
    saida = somarDias(iso, dias);
  } catch {
    return undefined;
  }
  if (br === null) return saida;
  const [a, m, d] = saida.split('-');
  return `${d}/${m}/${a}`;
}

/**
 * Datas originais que precisam sumir do destino: tira as que são também a imagem deslocada de outra
 * data original (essa coincidência não é vazamento: no destino a data representa a outra).
 */
function datasQueNaoPodemSobrar(dir: string, dias: number): string[] {
  const datas = datasDe(dir);
  const imagens = new Set(datas.map((d) => deslocar(d, dias)));
  return datas.filter((d) => !imagens.has(d));
}

function escaparRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A palavra aparece em `texto`, sem distinguir acento nem caixa, como palavra inteira? */
function temPalavra(texto: string, palavra: string): boolean {
  const alvo = escaparRegex(normalizarParaBusca(palavra));
  return new RegExp(`(?<![\\p{L}\\p{N}])${alvo}(?![\\p{L}\\p{N}])`, 'u').test(normalizarParaBusca(texto));
}

/** Afirma que nenhum dos `valores` aparece nos textos nem nos caminhos do destino. */
function semVazamento(dir: string, palavras: readonly string[], literais: readonly string[]): void {
  const { textos, caminhos } = conteudoDe(dir);
  const todosOsCaminhos = caminhos.join('\n');
  for (const palavra of palavras) {
    expect(temPalavra(textos, palavra), `nome nos textos: ${palavra}`).toBe(false);
    expect(temPalavra(todosOsCaminhos, palavra), `nome nos caminhos: ${palavra}`).toBe(false);
  }
  const textosNormalizados = normalizarParaBusca(textos);
  const caminhosNormalizados = normalizarParaBusca(todosOsCaminhos);
  for (const literal of literais) {
    expect(textosNormalizados.includes(normalizarParaBusca(literal)), `valor nos textos: ${literal}`).toBe(false);
    expect(caminhosNormalizados.includes(normalizarParaBusca(literal)), `valor nos caminhos: ${literal}`).toBe(false);
  }
}

describe('anonimizar: cofre v2 de exemplo (semente 42)', () => {
  let destino: string;
  let relatorio: RelatorioAnonimizacao;

  beforeAll(() => {
    destino = destinoNovo();
    relatorio = anonimizar(EXEMPLO, destino, { semente: SEMENTE });
  });

  it('relatório com a semente, o deslocamento em [100, 900] e as contagens', () => {
    expect(relatorio.semente).toBe(SEMENTE);
    expect(relatorio.deslocamentoDias).toBeGreaterThanOrEqual(100);
    expect(relatorio.deslocamentoDias).toBeLessThanOrEqual(900);
    expect(relatorio).toMatchObject({ membros: 3, arquivosTexto: 27, binarios: 0, ignorados: 0 });
  });

  it('o destino tem a mesma árvore da origem (pela inspeção)', () => {
    expect(estrutura(destino)).toEqual(estrutura(EXEMPLO));
  });

  it('nenhum nome, data, telefone, identificador ou profissional original sobra no destino', () => {
    const datas = datasQueNaoPodemSobrar(EXEMPLO, relatorio.deslocamentoDias);
    expect(datas.length).toBeGreaterThan(30);
    semVazamento(
      destino,
      ['Ana', 'Bruno', 'Mia', 'Helena', 'Prado', 'Paulo', 'Mendes', 'Clara', 'Nunes', 'Maria'],
      [...datas, '90000-0001', '90000-0002', '3000-0001', '3000-0002', '3000-0003', '985112000123456'],
    );
  });

  it('as pastas de perfil viram Membro A, B, C', () => {
    expect(fs.readdirSync(path.join(destino, 'Perfis')).sort()).toEqual(['Membro A', 'Membro B', 'Membro C']);
  });

  it('frontmatter: ids e nomes trocados, família Exemplo, schema intacto', () => {
    const ficha = fs.readFileSync(path.join(destino, 'Perfis', 'Membro C', 'Ficha.md'), 'utf8');
    expect(ficha).toContain('id: membro-c');
    expect(ficha).toContain('nome: Membro C');
    expect(ficha).toContain('tutores: [membro-a, membro-b]');
    expect(ficha).toContain('microchip: "000000000000000"');
    expect(ficha).toContain('# Ficha de Saúde — Membro C');
    const manifesto = fs.readFileSync(path.join(destino, 'salus.yaml'), 'utf8');
    expect(manifesto).toContain('schema_versao: 2');
    expect(manifesto).toContain('familia: Família Exemplo');
  });

  it('datas deslocadas pelo deslocamento do relatório', () => {
    const doses = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Doses.md'), 'utf8');
    expect(doses).toContain(`| ${somarDias('2026-10-20', relatorio.deslocamentoDias)} | 08:00 | Losartana |`);
  });

  it('números de células perturbados em até 15%, com as mesmas casas decimais e vírgula', () => {
    const exames = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Exames.md'), 'utf8');
    const linha = exames.split('\n').find((l) => l.startsWith(`| ${somarDias('2026-03-10', relatorio.deslocamentoDias)} | `));
    const peso = linha?.split('|')[2]?.trim() ?? '';
    expect(peso).toMatch(/^\d+,\d$/);
    const valor = Number(peso.replace(',', '.'));
    expect(valor).toBeGreaterThanOrEqual(68.4 * 0.85 - 0.05);
    expect(valor).toBeLessThanOrEqual(68.4 * 1.15 + 0.05);
  });

  it('telefones zerados; Prescrito por, Profissional e o nome dos profissionais viram Dr. Alias N', () => {
    const ficha = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Ficha.md'), 'utf8');
    expect(ficha).toContain('| Membro B | Cônjuge | (00) 00000-0000 |');
    expect(ficha).toMatch(/\| Dr\. Alias \d+ \| Cardiologia \| \(00\) 00000-0000 \| Hipertensão \|/);
    const medicamentos = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Medicamentos.md'), 'utf8');
    expect(medicamentos).toMatch(/\| Losartana \| 50 mg \| 1x ao dia \| oral \| [\d-]+ \| Dr\. Alias \d+ \|/);
    const pendencias = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Pendencias.md'), 'utf8');
    expect(pendencias).toMatch(/\| Retorno de cardiologia \| [\d-]+ \| Dr\. Alias \d+ \|/);
  });

  it('texto livre vira "Texto anonimizado (N caracteres)." e o prefixo estrutural fica', () => {
    const ficha = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Ficha.md'), 'utf8');
    expect(ficha).toMatch(/^Texto anonimizado \(\d+ caracteres\)\.$/m);
    const historico = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Historico.md'), 'utf8');
    const data = somarDias('2026-03-10', relatorio.deslocamentoDias);
    expect(historico).toContain(`- **${data}** [consulta] Texto anonimizado (`);
    const bruno = fs.readFileSync(path.join(destino, 'Perfis', 'Membro B', 'Historico.md'), 'utf8');
    expect(bruno).toContain('- Texto anonimizado (26 caracteres).');
  });

  it('ANONIMIZACAO.md tem a semente e o deslocamento, nunca o mapa de nomes', () => {
    const relato = fs.readFileSync(path.join(destino, 'ANONIMIZACAO.md'), 'utf8');
    expect(relato).toContain(String(SEMENTE));
    expect(relato).toContain(`${relatorio.deslocamentoDias} dias`);
    for (const nome of ['Ana', 'Bruno', 'Mia']) expect(temPalavra(relato, nome), nome).toBe(false);
  });

  it('mesma semente, mesma entrada → bytes idênticos', () => {
    const outro = destinoNovo();
    anonimizar(EXEMPLO, outro, { semente: SEMENTE });
    expect(readTree(outro)).toEqual(readTree(destino));
  });

  it('outra semente muda o deslocamento', () => {
    const outro = anonimizar(EXEMPLO, destinoNovo(), { semente: SEMENTE + 1 });
    expect(outro.deslocamentoDias).not.toBe(relatorio.deslocamentoDias);
  });
});

describe('anonimizar: cofre v1 (semente 42)', () => {
  let destino: string;
  let relatorio: RelatorioAnonimizacao;

  beforeAll(() => {
    destino = destinoNovo();
    relatorio = anonimizar(v1.dir, destino, { semente: SEMENTE });
  });

  it('o destino tem a mesma árvore da origem (pela inspeção)', () => {
    expect(relatorio.membros).toBe(2);
    expect(relatorio.binarios).toBe(3);
    expect(estrutura(destino)).toEqual(estrutura(v1.dir));
  });

  it('nenhum nome, data, telefone ou e-mail original sobra no destino', () => {
    expect(datasDe(v1.dir)).toEqual(expect.arrayContaining(['2026-03-10', '2025-11-28', '2026-04-02', '2026-05-30', DATA_BR_V1]));
    const datas = datasQueNaoPodemSobrar(v1.dir, relatorio.deslocamentoDias);
    semVazamento(destino, [...NOMES_V1, ...TERCEIROS_V1], [...datas, ...TELEFONES_V1, ...EMAILS_V1]);
  });

  it('o .pdf vira um arquivo vazio com a data do nome deslocada', () => {
    const pdf = path.join(
      destino,
      'Perfis',
      'Membro B',
      'Documentos',
      'Exames',
      `${somarDias('2026-03-10', relatorio.deslocamentoDias)}_Hemograma.pdf`,
    );
    expect(fs.statSync(pdf).size).toBe(0);
    expect(fs.statSync(path.join(destino, '_Caixa de Entrada', 'exame.pdf')).size).toBe(0);
  });

  it('índice v1: família, ids, nomes e prescritor trocados; números perturbados', () => {
    const indice = fs.readFileSync(path.join(destino, 'Familia', '_index.yaml'), 'utf8');
    expect(indice).toContain('familia: "Família Exemplo"');
    expect(indice).toContain('id: "membro-b"');
    expect(indice).toContain('nome: "Membro B"');
    expect(indice).toContain('perfil: "Perfis/Membro B/"');
    expect(indice).toMatch(/prescrito_por: "Dr\. Alias \d+"/);
    expect(indice).toMatch(/valor: \d\.\d\n/);
  });

  it('META.md: tabela de membros com os aliases', () => {
    const meta = fs.readFileSync(path.join(destino, 'Familia', 'META.md'), 'utf8');
    expect(meta).toContain('| Membro B | Humano | Mãe | `Perfis/Membro B/` |');
    expect(meta).toContain('| Membro A | Humano | Pai | `Perfis/Membro A/` |');
    expect(meta).toMatch(/^\*\*Família:\*\* Texto anonimizado \(7 caracteres\)\.$/m);
  });

  it('comentários YAML (do índice e do modelo copiado com o framework) viram texto anonimizado', () => {
    const arquivos = [
      path.join(destino, 'Familia', '_index.yaml'),
      path.join(destino, '.agents', 'skills', 'salus-onboarding', 'templates', 'Familia', '_index.yaml'),
    ];
    for (const arquivo of arquivos) {
      const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');
      const comentarios = linhas.filter((l) => /(^|\s)#/.test(l));
      expect(comentarios.length, arquivo).toBeGreaterThan(2);
      for (const linha of comentarios) {
        const comentario = linha.slice(linha.search(/(^|\s)#/)).trimStart();
        expect(comentario, `${arquivo}: ${linha}`).toMatch(/^#\s*(Texto anonimizado \(\d+ caracteres\)\.)?$/);
      }
    }
    const indice = fs.readFileSync(arquivos[0] ?? '', 'utf8');
    expect(indice).toMatch(/^ {6}# {3}Texto anonimizado \(\d+ caracteres\)\.$/m);
  });

  it('Arvore.md: Mermaid e bloco de código anonimizados, callout com o prefixo mantido', () => {
    const arvore = fs.readFileSync(path.join(destino, 'Familia', 'Arvore.md'), 'utf8');
    expect(arvore).toContain('# Árvore da família Sobrenome');
    expect(arvore).toContain('```mermaid\n');
    expect(arvore).toMatch(/^> Texto anonimizado \(\d+ caracteres\)\.$/m);
    expect(arvore).not.toMatch(/Gertrudes|Ramalho|Ofélia|Ofelia|Caetano/);
  });

  it('data dia/mês/ano deslocada no mesmo formato; CRLF preservado', () => {
    const exames = fs.readFileSync(path.join(destino, 'Perfis', 'Membro B', 'Exames.md'), 'utf8');
    const [ano, mes, dia] = somarDias('2026-04-12', relatorio.deslocamentoDias).split('-');
    expect(exames).toContain(`| ${dia}/${mes}/${ano} |`);
    const historico = fs.readFileSync(path.join(destino, 'Perfis', 'Membro B', 'Historico.md'), 'utf8');
    expect(historico.split('\r\n').length).toBeGreaterThan(5);
    expect(historico.replaceAll('\r\n', '')).not.toContain('\n');
  });
});

describe('anonimizar: regras de segurança', () => {
  it('destino não vazio → lança e não grava nada', () => {
    const destino = destinoNovo();
    fs.mkdirSync(destino);
    fs.writeFileSync(path.join(destino, 'algo.txt'), 'x');
    expect(() => anonimizar(EXEMPLO, destino, { semente: 1 })).toThrow(/não está vazia/);
    expect(fs.readdirSync(destino)).toEqual(['algo.txt']);
  });

  it('destino vazio que já existe é aceito', () => {
    const destino = destinoNovo();
    fs.mkdirSync(destino);
    expect(anonimizar(EXEMPLO, destino, { semente: 1 }).membros).toBe(3);
  });

  it('destino dentro da origem, ou origem dentro do destino → lança antes de ler', () => {
    const origem = copiaDoExemplo();
    expect(() => anonimizar(origem, path.join(origem, 'saida'), { semente: 1 })).toThrow(/dentro/);
    expect(fs.existsSync(path.join(origem, 'saida'))).toBe(false);
    expect(() => anonimizar(origem, path.dirname(origem), { semente: 1 })).toThrow(/dentro|não está vazia/);
    expect(() => anonimizar(origem, origem, { semente: 1 })).toThrow(/dentro|mesma/);
  });

  it('origem que não existe → lança "Pasta não encontrada"', () => {
    expect(() => anonimizar(path.join(tmp, 'nao-existe'), destinoNovo(), { semente: 1 })).toThrow(
      /Pasta não encontrada/,
    );
  });

  it('links simbólicos e junções não são seguidos e entram em "ignorados"', () => {
    const origem = copiaDoExemplo();
    const fora = path.join(origem, '..', 'fora');
    fs.mkdirSync(fora);
    fs.writeFileSync(path.join(fora, 'segredo.md'), '# Segredo de Ofélia\n');
    fs.symlinkSync(fora, path.join(origem, 'Perfis', 'Ana', 'Atalho'), 'junction');
    const destino = destinoNovo();
    const relatorio = anonimizar(origem, destino, { semente: 1 });
    expect(relatorio.ignorados).toBe(1);
    expect(fs.existsSync(path.join(destino, 'Perfis', 'Membro A', 'Atalho'))).toBe(false);
    expect(conteudoDe(destino).textos).not.toContain('Segredo');
  });

  it('sem semente escolhe uma (inteiro não negativo) e a informa', () => {
    const relatorio = anonimizar(EXEMPLO, destinoNovo(), {});
    expect(Number.isSafeInteger(relatorio.semente) && relatorio.semente >= 0).toBe(true);
  });

  it('data que não existe no calendário vira 0000-00-00', () => {
    const origem = copiaDoExemplo();
    fs.writeFileSync(
      path.join(origem, 'Familia', 'datas.md'),
      '# Datas 2026-02-30 e 31/04/2026\n\n| Data | Valor |\n|---|---|\n| 2026-13-01 | 3 |\n',
    );
    const destino = destinoNovo();
    anonimizar(origem, destino, { semente: 1 });
    const texto = fs.readFileSync(path.join(destino, 'Familia', 'datas.md'), 'utf8');
    expect(texto).toContain('# Datas 0000-00-00 e 00/00/0000');
    expect(texto).toContain('| 0000-00-00 |');
  });

  it('YAML: números perturbados com as mesmas casas, versão intacta, 8+ dígitos zerados, comentário tratado', () => {
    const origem = copiaDoExemplo();
    fs.writeFileSync(
      path.join(origem, 'Familia', 'extra.yaml'),
      '# Notas de Bruno em 2026-01-02\nversao: 3\npeso: 68.4\naltura: 170\ncpf: 12345678901\nobs: "Ligar para a tia"\n',
    );
    const destino = destinoNovo();
    anonimizar(origem, destino, { semente: 3 });
    const texto = fs.readFileSync(path.join(destino, 'Familia', 'extra.yaml'), 'utf8');
    expect(texto).not.toMatch(/Bruno|2026-01-02|12345678901|tia/);
    expect(texto).toMatch(/^# Texto anonimizado \(28 caracteres\)\.$/m);
    expect(texto).toContain('versao: 3\n');
    expect(texto).toContain('cpf: 0\n');
    expect(texto).toContain('obs: "Texto anonimizado (16 caracteres)."');
    const peso = Number(/peso: (\d+\.\d)\n/.exec(texto)?.[1]);
    expect(peso).toBeGreaterThanOrEqual(58.1);
    expect(peso).toBeLessThanOrEqual(78.7);
    const altura = /altura: (\d+)\n/.exec(texto)?.[1] ?? '';
    expect(Number(altura)).toBeGreaterThanOrEqual(144);
    expect(Number(altura)).toBeLessThanOrEqual(196);
  });

  it('e-mail e telefone em células e títulos', () => {
    const origem = copiaDoExemplo();
    fs.writeFileSync(
      path.join(origem, 'Familia', 'contatos.md'),
      '# Contatos de ana.souza@gmail.com\n\n| Contato | Tipo |\n|---|---|\n| +55 (11) 98888-7777 · bia@x.com.br | casa |\n',
    );
    const destino = destinoNovo();
    anonimizar(origem, destino, { semente: 1 });
    const texto = fs.readFileSync(path.join(destino, 'Familia', 'contatos.md'), 'utf8');
    expect(texto).toContain('# Contatos de pessoa@exemplo.com');
    expect(texto).toContain('| (00) 00000-0000 · pessoa@exemplo.com | casa |');
  });
});

describe('anonimizar: estruturas que escapavam (rodada de correção 1)', () => {
  /** Grava `arquivos` (caminho relativo → conteúdo) numa cópia do v2-exemplo, anonimiza e devolve o destino. */
  function anonimizarCom(arquivos: Record<string, string>, ajustar?: (origem: string) => void): string {
    const origem = copiaDoExemplo();
    for (const [rel, conteudo] of Object.entries(arquivos)) {
      fs.mkdirSync(path.dirname(path.join(origem, rel)), { recursive: true });
      fs.writeFileSync(path.join(origem, rel), conteudo);
    }
    ajustar?.(origem);
    const destino = destinoNovo();
    anonimizar(origem, destino, { semente: 5 });
    return destino;
  }

  it('linha colada logo abaixo da tabela (sem |) vira texto anonimizado', () => {
    const destino = anonimizarCom({
      'Familia/colada.md': [
        '# Colada',
        '',
        '| Data | Flag |',
        '|---|---|',
        '| 2026-01-01 | normal |',
        'Linha livre colada na tabela com Roberto e sua vizinha Gertrudes Ramalho',
        '',
        '| Data | Flag |',
        '|---|---|',
        '| 2026-01-02 | normal |',
        '*Fonte: laudo do Dr. Silva*',
        '',
      ].join('\n'),
    });
    const texto = fs.readFileSync(path.join(destino, 'Familia', 'colada.md'), 'utf8');
    expect(texto).not.toMatch(/Roberto|Gertrudes|Ramalho|Silva|Fonte/);
    expect(texto).toContain('\nTexto anonimizado (72 caracteres).\n');
    expect(texto).toContain('\nTexto anonimizado (27 caracteres).\n');
    expect(texto).toMatch(/\| \d{4}-\d{2}-\d{2} \| normal \|/);
  });

  it('comentários YAML (linha inteira e no fim da linha) viram texto anonimizado; # entre aspas fica', () => {
    const destino = anonimizarCom({
      'Familia/notas.yaml': [
        '# Família Souza Lima — anotação: Ana parou o remédio por causa do enjoo forte',
        'dose: "50 mg # manhã" # tomar junto com a Gertrudes',
        'lista:',
        '  # vizinha Gertrudes ajuda',
        '  - item',
        '#   prescrito_por: "Dra. Iolanda Barros"',
        '',
      ].join('\n'),
    });
    const texto = fs.readFileSync(path.join(destino, 'Familia', 'notas.yaml'), 'utf8');
    expect(texto).not.toMatch(/Souza|Lima|anotação|enjoo|Ana|Gertrudes|Iolanda|Barros|prescrito/);
    expect(texto).toContain('# Texto anonimizado (75 caracteres).\n');
    expect(texto).toContain('dose: "50 mg # manhã" # Texto anonimizado (27 caracteres).\n');
    expect(texto).toContain('  # Texto anonimizado (23 caracteres).\n');
    expect(texto).toContain('#   Texto anonimizado (36 caracteres).\n');
  });

  it('frontmatter: o comentário também vira texto anonimizado', () => {
    const destino = anonimizarCom({});
    const ficha = fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Ficha.md'), 'utf8');
    expect(ficha).toMatch(/^# Texto anonimizado \(\d+ caracteres\)\.\nalergias: \["Dipirona"\]$/m);
  });

  it('destino numa pasta da origem cujo nome começa com ".." → lança', () => {
    const origem = copiaDoExemplo();
    expect(() => anonimizar(origem, path.join(origem, '..copia'), { semente: 1 })).toThrow(/dentro/);
    expect(fs.existsSync(path.join(origem, '..copia'))).toBe(false);
  });

  it('nome colado a dígito, hífen ou outro nome em nome de arquivo é trocado; no texto, Anabela fica', () => {
    const destino = anonimizarCom(
      {
        'Perfis/Ana/Documentos/Exame-Ana2026.pdf': '',
        'Perfis/Ana/Documentos/AnaSouza.pdf': '',
        'Perfis/Ana/Documentos/Anabela.md': '# Anabela\n',
      },
      (origem) => substituir(origem, 'Perfis/Ana/Ficha.md', 'nome: Ana\n', 'nome: Ana Souza\n'),
    );
    const documentos = fs.readdirSync(path.join(destino, 'Perfis', 'Membro A', 'Documentos')).sort();
    expect(documentos).toEqual(['Anabela.md', 'Exame-Membro A2026.pdf', 'Membro A.pdf']);
    expect(fs.readFileSync(path.join(destino, 'Perfis', 'Membro A', 'Documentos', 'Anabela.md'), 'utf8')).toBe(
      '# Anabela\n',
    );
  });

  it('data com sublinhado em nome de arquivo é deslocada, mantendo o sublinhado', () => {
    const origem = copiaDoExemplo();
    fs.writeFileSync(path.join(origem, '_Caixa de Entrada', '2026_03_10_laudo.pdf'), '');
    const destino = destinoNovo();
    const { deslocamentoDias } = anonimizar(origem, destino, { semente: 5 });
    const esperado = `${somarDias('2026-03-10', deslocamentoDias).replaceAll('-', '_')}_laudo.pdf`;
    expect(fs.readdirSync(path.join(destino, '_Caixa de Entrada'))).toContain(esperado);
  });

  it('rótulo em negrito com até 4 palavras fica; mais longo é texto livre', () => {
    const destino = anonimizarCom({
      'Familia/rotulos.md': [
        '# Rótulos',
        '',
        '**Próxima revisão sugerida:** 2026-10-02',
        '**Ana teve febre após vacina:** sim',
        '',
        '- **Bruno caiu da bicicleta ontem:** nada grave',
        '- **Peso atual:** 70 kg',
        '',
      ].join('\n'),
    });
    const texto = fs.readFileSync(path.join(destino, 'Familia', 'rotulos.md'), 'utf8');
    expect(texto).toContain('**Próxima revisão sugerida:** Texto anonimizado (10 caracteres).\n');
    expect(texto).toContain('\nTexto anonimizado (35 caracteres).\n');
    expect(texto).toContain('- Texto anonimizado (45 caracteres).\n');
    expect(texto).toContain('- **Peso atual:** Texto anonimizado (5 caracteres).\n');
    expect(texto).not.toMatch(/febre|bicicleta|vacina/);
  });
});

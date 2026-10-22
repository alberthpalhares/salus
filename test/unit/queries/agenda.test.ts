import { afterAll, describe, expect, it } from 'vitest';
import { type Agenda, calcularAgenda, type ItemAgenda } from '../../../src/core/queries/agenda.js';
import { Vault } from '../../../src/core/vault/Vault.js';
import { copiaDoExemplo, EXEMPLO, removerCopias, substituir } from '../../helpers/cofre-exemplo.js';

afterAll(removerCopias);

const FAIXAS = ['vencido', 'ate30', 'de31a90', 'semData'] as const;

/** Em que faixa está o item cuja descrição contém `trecho` (`undefined`: fora da agenda). */
function faixaDe(agenda: Agenda, trecho: string): (typeof FAIXAS)[number] | undefined {
  return FAIXAS.find((faixa) => agenda[faixa].some((item) => item.descricao.includes(trecho)));
}

const item = (i: ItemAgenda): ItemAgenda => i;

describe('calcularAgenda — v2-exemplo em 2026-10-21', () => {
  const vault = Vault.abrir(EXEMPLO);
  const agenda = calcularAgenda(vault, '2026-10-21');

  it('devolve `hoje` e as quatro faixas, cada item com membro, nome, tipo, descrição e data', () => {
    expect(agenda.hoje).toBe('2026-10-21');
    expect(agenda.vencido).toEqual([
      item({ membro: 'mia', nome: 'Mia', tipo: 'vacina', descricao: 'Vacina V4 (quádrupla felina)', data: '2026-09-01' }),
    ]);
    expect(agenda.ate30).toEqual([
      item({ membro: 'ana', nome: 'Ana', tipo: 'termino', descricao: 'Amoxicilina — término do tratamento', data: '2026-10-25' }),
      item({ membro: 'mia', nome: 'Mia', tipo: 'antiparasitario', descricao: 'Antipulgas Revolution 45 mg', data: '2026-10-30' }),
      item({ membro: 'ana', nome: 'Ana', tipo: 'renovacao', descricao: 'Losartana — renovação da receita', data: '2026-11-05' }),
    ]);
    expect(agenda.de31a90).toEqual([
      item({ membro: 'ana', nome: 'Ana', tipo: 'receita', descricao: 'Atorvastatina — validade da receita', data: '2026-12-01' }),
    ]);
    expect(agenda.semData).toEqual([
      item({ membro: 'bruno', nome: 'Bruno', tipo: 'receita', descricao: 'Omeprazol — receita sem data de validade', data: null }),
    ]);
  });

  it('o que está além de 90 dias fica fora (vacinas anuais, exame solicitado, consulta)', () => {
    for (const trecho of ['Influenza', 'dT (difteria', 'Antirrábica', 'Drontal', 'Perfil lipídico', 'Retorno de cardiologia']) {
      expect(faixaDe(agenda, trecho)).toBeUndefined();
    }
  });

  it('vacina sem próxima data e medicamento em uso sem renovação nem término não entram na agenda', () => {
    expect(faixaDe(agenda, 'COVID-19')).toBeUndefined();
    expect(faixaDe(agenda, 'Febre amarela')).toBeUndefined();
    expect(faixaDe(agenda, 'Vitamina D3')).toBeUndefined();
  });

  it('não altera o cofre e dá o mesmo resultado a cada chamada', () => {
    const antes = JSON.stringify(vault.membros);
    expect(calcularAgenda(vault, '2026-10-21')).toEqual(agenda);
    expect(JSON.stringify(vault.membros)).toBe(antes);
  });
});

describe('calcularAgenda — limites das faixas (Losartana renova em 2026-11-05)', () => {
  const vault = Vault.abrir(EXEMPLO);
  const faixaDaLosartana = (hoje: string) => faixaDe(calcularAgenda(vault, hoje), 'Losartana');

  it('item com data igual a hoje cai em `ate30` (d = 0), e ontem já é `vencido` (d = -1)', () => {
    expect(faixaDaLosartana('2026-11-05')).toBe('ate30');
    expect(faixaDaLosartana('2026-11-06')).toBe('vencido');
    const naData = calcularAgenda(vault, '2026-10-25');
    expect(naData.ate30[0]).toMatchObject({ tipo: 'termino', data: '2026-10-25' });
    expect(faixaDe(calcularAgenda(vault, '2026-10-26'), 'Amoxicilina')).toBe('vencido');
  });

  it('d = 30 é `ate30` e d = 31 é `de31a90`', () => {
    expect(faixaDaLosartana('2026-10-06')).toBe('ate30');
    expect(faixaDaLosartana('2026-10-05')).toBe('de31a90');
  });

  it('d = 90 é `de31a90` e d = 91 fica fora da agenda', () => {
    expect(faixaDaLosartana('2026-08-07')).toBe('de31a90');
    expect(faixaDaLosartana('2026-08-06')).toBeUndefined();
  });

  it('atravessa a virada de ano: de 2026-12-31, a antirrábica de 2027-02-10 (d = 41) é `de31a90`', () => {
    const agenda = calcularAgenda(vault, '2026-12-31');
    expect(faixaDe(agenda, 'Vacina Antirrábica')).toBe('de31a90');
    expect(faixaDe(agenda, 'Atorvastatina')).toBe('vencido');
  });

  it('29 de fevereiro de ano bissexto é aceito como `hoje`: tudo o que veio antes está vencido, em ordem', () => {
    const agenda = calcularAgenda(vault, '2028-02-29');
    expect(agenda.hoje).toBe('2028-02-29');
    expect(agenda.ate30).toEqual([]);
    expect(agenda.de31a90).toEqual([]);
    expect(agenda.vencido).toHaveLength(11); // os 12 itens datados, menos a dT de 2032 (fora dos 90 dias)
    const datas = agenda.vencido.map((i) => i.data);
    expect(datas).toEqual([...datas].sort());
    // empate de data (Influenza de Ana e de Bruno em 2027-04-15): desempata pelo nome
    expect(agenda.vencido.slice(-2).map((i) => [i.nome, i.data])).toEqual([
      ['Ana', '2027-04-15'],
      ['Bruno', '2027-04-15'],
    ]);
  });

  it('`hoje` que não existe no calendário (2027-02-29) ou que não é data lança RangeError', () => {
    expect(() => calcularAgenda(vault, '2027-02-29')).toThrow(RangeError);
    expect(() => calcularAgenda(vault, 'hoje')).toThrow(RangeError);
    expect(() => calcularAgenda(vault, '')).toThrow(RangeError);
  });
});

describe('calcularAgenda — cofre alterado', () => {
  it('em uso com renovação e término gera dois itens; empate de data desempata por nome e depois por descrição', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Bruno/Medicamentos.md', '| Dr. Paulo Mendes | | | |', '| Dr. Paulo Mendes | 2026-10-25 | 2026-10-25 | |');
    const agenda = calcularAgenda(Vault.abrir(dir), '2026-10-21');
    expect(agenda.ate30.slice(0, 3).map((i) => [i.nome, i.tipo, i.data])).toEqual([
      ['Ana', 'termino', '2026-10-25'],
      ['Bruno', 'renovacao', '2026-10-25'],
      ['Bruno', 'termino', '2026-10-25'],
    ]);
    // mesmo nome e mesma data: "Vitamina D3 — renovação…" vem antes de "Vitamina D3 — término…"
    expect(agenda.ate30[1]?.descricao).toBe('Vitamina D3 — renovação da receita');
    expect(agenda.ate30[2]?.descricao).toBe('Vitamina D3 — término do tratamento');
  });

  it('exame solicitado e consulta com data entram na faixa certa, com a descrição montada da linha', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Ana/Pendencias.md', '| 2027-02-15 |', '| 2026-10-22 |');
    substituir(dir, 'Perfis/Ana/Pendencias.md', '| 2027-03-18 |', '| 2026-11-10 |');
    const agenda = calcularAgenda(Vault.abrir(dir), '2026-10-21');
    expect(agenda.ate30.find((i) => i.tipo === 'exame_solicitado')).toEqual(
      item({ membro: 'ana', nome: 'Ana', tipo: 'exame_solicitado', descricao: 'Perfil lipídico completo (solicitado)', data: '2026-10-22' }),
    );
    expect(agenda.ate30.find((i) => i.tipo === 'consulta')).toEqual(
      item({ membro: 'ana', nome: 'Ana', tipo: 'consulta', descricao: 'Retorno de cardiologia — Dra. Helena Prado', data: '2026-11-10' }),
    );
  });

  it('exame solicitado sem `Realizar até` e consulta sem data vão para `semData`, por nome e depois por descrição', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Ana/Pendencias.md', '| 2027-02-15 |', '| |');
    substituir(dir, 'Perfis/Ana/Pendencias.md', '| 2027-03-18 |', '| |');
    const { semData } = calcularAgenda(Vault.abrir(dir), '2026-10-21');
    expect(semData.map((i) => [i.nome, i.tipo, i.descricao, i.data])).toEqual([
      ['Ana', 'exame_solicitado', 'Perfil lipídico completo (solicitado)', null],
      ['Ana', 'consulta', 'Retorno de cardiologia — Dra. Helena Prado', null],
      ['Bruno', 'receita', 'Omeprazol — receita sem data de validade', null],
    ]);
  });

  it('consulta sem profissional não deixa travessão sobrando na descrição', () => {
    const dir = copiaDoExemplo();
    substituir(dir, 'Perfis/Ana/Pendencias.md', '| Dra. Helena Prado | Levar o diário de pressão |', '| | |');
    substituir(dir, 'Perfis/Ana/Pendencias.md', '| 2027-03-18 |', '| 2026-11-10 |');
    const consulta = calcularAgenda(Vault.abrir(dir), '2026-10-21').ate30.find((i) => i.tipo === 'consulta');
    expect(consulta?.descricao).toBe('Retorno de cardiologia');
  });
});

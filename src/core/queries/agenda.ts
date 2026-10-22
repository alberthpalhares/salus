import type { DataIso, DataOuVazia } from '../schema/comuns.js';
import type { Membro } from '../schema/membro.js';
import type { Vault } from '../vault/Vault.js';
import { compararDatas, diasEntre, exigirDataValida } from './datas.js';
import { compararTexto } from './normalizar.js';

export type TipoItemAgenda =
  | 'renovacao'
  | 'termino'
  | 'receita'
  | 'vacina'
  | 'antiparasitario'
  | 'exame_solicitado'
  | 'consulta';

export type ItemAgenda = {
  /** `id` do membro. */
  membro: string;
  /** Nome do membro (`nome` da `Ficha.md`). */
  nome: string;
  tipo: TipoItemAgenda;
  /** Texto para gente ler, montado da linha de origem (ex.: `Losartana — renovação da receita`). */
  descricao: string;
  /** `null` só em `semData`. */
  data: DataIso | null;
};

/** O que pede atenção, em quatro faixas a partir de `hoje`. Passado o 90º dia, o item fica fora. */
export type Agenda = {
  hoje: DataIso;
  /** Data antes de `hoje`. */
  vencido: ItemAgenda[];
  /** De `hoje` (inclusive) até 30 dias depois. */
  ate30: ItemAgenda[];
  /** De 31 a 90 dias depois de `hoje`. */
  de31a90: ItemAgenda[];
  /** Receita prescrita sem validade, exame solicitado sem prazo e consulta sem data. */
  semData: ItemAgenda[];
};

const ULTIMO_DIA_DE_ATE30 = 30;
const ULTIMO_DIA_DE_DE31A90 = 90;

type Dono = { membro: string; nome: string };

function criar(dono: Dono, tipo: TipoItemAgenda, descricao: string, data: DataOuVazia): ItemAgenda {
  return { ...dono, tipo, descricao, data: data === '' ? null : data };
}

/**
 * Os itens datáveis de um membro. Vacina, antiparasitário e medicamento em uso sem data não têm
 * vencimento e ficam de fora; receita prescrita, exame solicitado e consulta sem data entram sem data.
 */
function itensDoMembro(membro: Membro): ItemAgenda[] {
  const dono: Dono = { membro: membro.id, nome: membro.ficha.frontmatter.nome };
  const itens: ItemAgenda[] = [];
  for (const m of membro.medicamentos.emUso) {
    if (m.renova_em !== '') itens.push(criar(dono, 'renovacao', `${m.nome} — renovação da receita`, m.renova_em));
    if (m.termino_em !== '') itens.push(criar(dono, 'termino', `${m.nome} — término do tratamento`, m.termino_em));
  }
  for (const m of membro.medicamentos.prescritos) {
    const descricao = m.validade_receita === '' ? `${m.nome} — receita sem data de validade` : `${m.nome} — validade da receita`;
    itens.push(criar(dono, 'receita', descricao, m.validade_receita));
  }
  for (const v of membro.vacinas) {
    if (v.proxima_em !== '') itens.push(criar(dono, 'vacina', `Vacina ${v.nome}`, v.proxima_em));
  }
  for (const a of membro.antiparasitarios) {
    if (a.proximo_em === '') continue;
    const rotulo = a.tipo === 'vermifugo' ? 'Vermífugo' : 'Antipulgas';
    itens.push(criar(dono, 'antiparasitario', `${rotulo} ${a.produto}`, a.proximo_em));
  }
  for (const e of membro.pendencias.examesSolicitados) {
    itens.push(criar(dono, 'exame_solicitado', `${e.exame} (solicitado)`, e.realizar_ate));
  }
  for (const c of membro.pendencias.consultas) {
    itens.push(criar(dono, 'consulta', c.profissional === '' ? c.tipo : `${c.tipo} — ${c.profissional}`, c.data));
  }
  return itens;
}

/** Por data, depois por nome do membro e por descrição (as sem data, todas `null`, caem no nome). */
function comparar(a: ItemAgenda, b: ItemAgenda): number {
  return (
    compararDatas(a.data ?? '', b.data ?? '') || compararTexto(a.nome, b.nome) || compararTexto(a.descricao, b.descricao)
  );
}

/**
 * A agenda do cofre em `hoje`, com `d = diasEntre(hoje, data)`: `d < 0` vencido; `0 ≤ d ≤ 30` `ate30`
 * (o que vence hoje entra aqui); `31 ≤ d ≤ 90` `de31a90`; `d > 90` fora. `hoje` vem de quem chama
 * (nunca do relógio): `RangeError` se não for uma data que existe.
 */
export function calcularAgenda(vault: Vault, hoje: DataIso): Agenda {
  exigirDataValida(hoje);
  const agenda: Agenda = { hoje, vencido: [], ate30: [], de31a90: [], semData: [] };
  for (const item of vault.membros.flatMap(itensDoMembro)) {
    if (item.data === null) {
      agenda.semData.push(item);
      continue;
    }
    const dias = diasEntre(hoje, item.data);
    if (dias < 0) agenda.vencido.push(item);
    else if (dias <= ULTIMO_DIA_DE_ATE30) agenda.ate30.push(item);
    else if (dias <= ULTIMO_DIA_DE_DE31A90) agenda.de31a90.push(item);
  }
  for (const faixa of [agenda.vencido, agenda.ate30, agenda.de31a90, agenda.semData]) faixa.sort(comparar);
  return agenda;
}

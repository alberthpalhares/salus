/**
 * Aritmética de datas civis (`AAAA-MM-DD`) das consultas. Tudo em UTC, sem fuso nem horário de verão:
 * a data vira a meia-noite UTC dela e a conta é de dias inteiros. `new Date('AAAA-MM-DD')` e
 * `toISOString` nunca entram aqui (o primeiro lê UTC, o segundo escreve UTC; a data do usuário é local).
 */
import { type DataIso, ehDataValida } from '../schema/comuns.js';

const MS_POR_DIA = 86_400_000;
const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lança `RangeError` se `data` não é uma `AAAA-MM-DD` que existe no calendário. A mensagem só repete
 * o texto quando ele tem a forma de uma data (data sozinha não é dado de saúde); qualquer outro texto
 * fica de fora dela.
 */
export function exigirDataValida(data: string): void {
  if (ehDataValida(data)) return;
  throw new RangeError(
    FORMATO_DATA.test(data) ? `a data ${data} não existe no calendário` : 'a data deve estar no formato AAAA-MM-DD',
  );
}

/** Meia-noite UTC de `data`, em milissegundos. */
function emMilissegundos(data: DataIso): number {
  exigirDataValida(data);
  const [ano = 0, mes = 0, dia = 0] = data.split('-').map(Number);
  // `Date.UTC(ano, …)` lê anos de 0 a 99 como 1900–1999; `setUTCFullYear` não.
  const instante = new Date(0);
  instante.setUTCFullYear(ano, mes - 1, dia);
  return instante.getTime();
}

function formatar(ano: number, mes: number, dia: number): DataIso {
  if (!(ano >= 0 && ano <= 9999)) throw new RangeError('a data fica fora do intervalo de 0000 a 9999');
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Dias civis de `a` até `b` (b − a): negativo quando `b` é anterior. Lança `RangeError` para data que não existe. */
export function diasEntre(a: DataIso, b: DataIso): number {
  return (emMilissegundos(b) - emMilissegundos(a)) / MS_POR_DIA;
}

/** `a` mais `n` dias (`n` inteiro, pode ser negativo). Lança `RangeError` para data que não existe ou `n` não inteiro. */
export function somarDias(a: DataIso, n: number): DataIso {
  if (!Number.isInteger(n)) throw new RangeError('a quantidade de dias deve ser um número inteiro');
  const instante = new Date(emMilissegundos(a) + n * MS_POR_DIA);
  return formatar(instante.getUTCFullYear(), instante.getUTCMonth() + 1, instante.getUTCDate());
}

/** Ordem cronológica de duas datas `AAAA-MM-DD` (o texto já ordena por data). */
export function compararDatas(a: DataIso, b: DataIso): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * A data de hoje no relógio local do servidor, `AAAA-MM-DD`. Montada à mão com `getFullYear`,
 * `getMonth` e `getDate`: perto da meia-noite o dia local e o dia UTC diferem, e é o local que vale.
 */
export function hojeIso(agora: Date = new Date()): DataIso {
  if (Number.isNaN(agora.getTime())) throw new RangeError('data e hora inválidas');
  return formatar(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}

/**
 * Gravação por *splice* (ADR-0003): o arquivo nunca é re-serializado; só as faixas editadas são
 * trocadas e todo o resto é copiado byte a byte da fonte original.
 */

/** Troca `[inicio, fim)` da fonte por `texto`. Offsets em unidades UTF-16 da fonte original. */
export type Edicao = { inicio: number; fim: number; texto: string };

function sobreposicao(e: Edicao): Error {
  return new Error(`edições sobrepostas: [${e.inicio}, ${e.fim}) invade outra edição`);
}

/**
 * Aplica as edições à fonte. Todos os offsets se referem à fonte **original**, qualquer que seja a
 * ordem de entrada: o resultado é o de aplicar da maior `inicio` para a menor, sem que uma edição
 * desloque a outra. Sobreposição → `Error`: faixas que compartilham algum caractere, duas trocas
 * não vazias com o mesmo `inicio`, ou uma inserção (faixa vazia) estritamente dentro de uma troca.
 * Faixas encostadas valem. Edições com o mesmo `inicio` (inserções e no máximo uma troca) entram
 * na ordem de entrada — por isso a montagem é feita num passo só, da esquerda para a direita, em
 * vez de aplicar de trás para a frente (que inverteria inserção e troca no mesmo ponto).
 */
export function aplicarEdicoes(fonte: string, edicoes: readonly Edicao[]): string {
  for (const e of edicoes) {
    const inteiros = Number.isInteger(e.inicio) && Number.isInteger(e.fim);
    if (!inteiros || e.inicio < 0 || e.fim < e.inicio || e.fim > fonte.length) {
      throw new Error(
        `edição com faixa inválida [${e.inicio}, ${e.fim}) numa fonte de ${fonte.length} caracteres`,
      );
    }
  }
  // `sort` é estável: com o mesmo `inicio`, a ordem de entrada se mantém. A entrada não é alterada.
  const ordenadas = [...edicoes].sort((a, b) => a.inicio - b.inicio);
  const partes: string[] = [];
  let cursor = 0; // até onde a fonte original já foi consumida
  let grupo = -1; // `inicio` das edições do grupo atual
  let grupoTemTroca = false;
  for (const e of ordenadas) {
    if (e.inicio !== grupo) {
      if (e.inicio < cursor) throw sobreposicao(e);
      partes.push(fonte.slice(cursor, e.inicio));
      cursor = e.inicio;
      grupo = e.inicio;
      grupoTemTroca = false;
    }
    if (e.fim > e.inicio) {
      if (grupoTemTroca) throw sobreposicao(e);
      grupoTemTroca = true;
    }
    partes.push(e.texto);
    cursor = Math.max(cursor, e.fim);
  }
  partes.push(fonte.slice(cursor));
  return partes.join('');
}

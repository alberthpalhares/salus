import type { Membro } from '../schema/membro.js';
import type { Vault } from '../vault/Vault.js';

/** As seções do perfil, uma por arquivo de verdade (`Ficha.md`, `Medicamentos.md`, `Vacinas.md`…). */
export const SECOES = ['ficha', 'medicamentos', 'vacinas', 'exames', 'historico', 'pendencias', 'doses', 'genetica'] as const;
export type Secao = (typeof SECOES)[number];

/** `valor` é o nome de uma seção? (Para validar o que vem da linha de comando ou do MCP.) */
export function ehSecao(valor: string): valor is Secao {
  return (SECOES as ReadonlyArray<string>).includes(valor);
}

/** As chaves do `Membro` que cada seção traz: `Vacinas.md` guarda as vacinas e os antiparasitários. */
const CHAVES_DA_SECAO: Record<Secao, ReadonlyArray<keyof Membro>> = {
  ficha: ['ficha'],
  medicamentos: ['medicamentos'],
  vacinas: ['vacinas', 'antiparasitarios'],
  exames: ['exames'],
  historico: ['historico'],
  pendencias: ['pendencias'],
  doses: ['doses'],
  genetica: ['genetica'],
};

function copiar<K extends keyof Membro>(destino: Partial<Membro>, origem: Membro, chave: K): void {
  destino[chave] = origem[chave];
}

/**
 * O perfil do membro `id`. Sem `secoes`, o `Membro` inteiro; com `secoes`, um objeto só com as chaves
 * dessas seções, na ordem pedida (`[]` dá `{}`). `id` que não existe dá `undefined`; seção que não
 * existe lança `RangeError`. Nada do estado de leitura dos arquivos sai daqui.
 */
export function lerPerfil(vault: Vault, id: string, secoes?: ReadonlyArray<Secao>): Partial<Membro> | undefined {
  const membro = vault.membro(id);
  if (membro === undefined) return undefined;
  if (secoes === undefined) return membro;
  const perfil: Partial<Membro> = {};
  for (const secao of secoes) {
    if (!ehSecao(secao)) throw new RangeError(`seção desconhecida: '${secao}' (as seções são ${SECOES.join(', ')})`);
    for (const chave of CHAVES_DA_SECAO[secao]) copiar(perfil, membro, chave);
  }
  return perfil;
}

import { ARQUIVOS_DE_VERDADE } from '../format/arquivos/index.js';
import { dividirLinhas } from '../format/texto.js';
import type { Vault } from '../vault/Vault.js';
import { normalizarParaBusca } from './normalizar.js';

/** A busca para aqui: mais que isso não cabe numa resposta de ferramenta nem numa tela. */
export const MAXIMO_OCORRENCIAS = 200;
/** Tamanho máximo do `trecho` (caracteres UTF-16). */
export const MAXIMO_TRECHO = 200;

export type Ocorrencia = {
  /** `id` do membro. */
  membro: string;
  /** Caminho do arquivo relativo ao cofre, com `/` (`Perfis/Ana/Ficha.md`). */
  arquivo: string;
  /** Linha do arquivo, a partir de 1. */
  linha: number;
  /** A linha sem espaço nas pontas, cortada em `MAXIMO_TRECHO`. */
  trecho: string;
};

/** Corta em `maximo` sem deixar meio par substituto (emoji) no fim. */
function cortar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto;
  const ultimo = texto.charCodeAt(maximo - 1);
  const terminaNoMeioDoPar = ultimo >= 0xd800 && ultimo <= 0xdbff;
  return texto.slice(0, terminaNoMeioDoPar ? maximo - 1 : maximo);
}

/**
 * Procura `texto` nas linhas dos arquivos de verdade dos membros, sem distinguir acento nem caixa
 * (`includes` sobre o texto normalizado, linha a linha). Ordem: membro, arquivo (`ARQUIVOS_DE_VERDADE`),
 * linha; para na `MAXIMO_OCORRENCIAS`-ésima. Texto vazio ou só de espaços não acha nada.
 */
export function buscar(vault: Vault, texto: string): Ocorrencia[] {
  const procurado = normalizarParaBusca(texto);
  if (procurado === '') return [];
  const achadas: Ocorrencia[] = [];
  for (const membro of vault.membros) {
    for (const arquivo of ARQUIVOS_DE_VERDADE) {
      const estado = vault.estadoDe(membro.pasta, arquivo);
      if (estado === undefined) continue;
      const { linhas } = dividirLinhas(estado.fonte);
      for (const [indice, linha] of linhas.entries()) {
        if (!normalizarParaBusca(linha).includes(procurado)) continue;
        achadas.push({
          membro: membro.id,
          arquivo: estado.arquivo,
          linha: indice + 1,
          trecho: cortar(linha.trim(), MAXIMO_TRECHO),
        });
        if (achadas.length === MAXIMO_OCORRENCIAS) return achadas;
      }
    }
  }
  return achadas;
}

/** Apoio dos testes dos codecs por arquivo: leitura das fixtures e diff por linhas. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

export const FIXTURES = fileURLToPath(new URL('../../../fixtures/', import.meta.url));

/** Conteúdo cru da fixture (com BOM e CRLF, se houver): é o que o codec recebe do disco. */
export const lerFixture = (relativo: string): string => readFileSync(FIXTURES + relativo, 'utf8');

export const MEMBROS = ['Ana', 'Bruno', 'Mia (gata)'] as const;

/** Caminho (relativo a `test/fixtures/`) de um arquivo de perfil do cofre de exemplo. */
export const perfil = (membro: (typeof MEMBROS)[number], arquivo: string): string =>
  `vaults/v2-exemplo/Perfis/${membro}/${arquivo}`;

export const BOM = '\u{FEFF}';

/**
 * Números (a partir de 1) das linhas que diferem entre `a` e `b`, que devem ter o mesmo número de
 * linhas. As linhas são cortadas só no `\n`: um `\r` que some ou aparece também conta como diferença.
 */
export function linhasDiferentes(a: string, b: string): number[] {
  const la = a.split('\n');
  const lb = b.split('\n');
  expect(lb.length).toBe(la.length);
  return la.flatMap((linha, i) => (linha === lb[i] ? [] : [i + 1]));
}

/** `true` se todo `\n` do texto vier depois de um `\r`. */
export const soCrlf = (s: string): boolean => !/(?<!\r)\n/.test(s);

/** Junta linhas com LF. */
export const linhas = (...l: string[]): string => l.join('\n');

/** Seção de exame a mais, para pôr no fim do `Exames.md` da Ana (que termina em `\n`). */
export const PERFIL_LIPIDICO = linhas(
  '',
  '## Perfil lipídico',
  '',
  '| Data | Marcador | Valor | Unidade | Faixa do laudo | Flag | Obs |',
  '|---|---|---|---|---|---|---|',
  '| 2026-09-15 | HDL | 52 | mg/dL | > 40 | normal | |',
  '',
);

/** Problema esperado (qualquer mensagem), para `toEqual`. */
export function problema(arquivo: string, codigo: string, linha?: number): Record<string, unknown> {
  const mensagem: unknown = expect.any(String);
  return linha === undefined ? { arquivo, codigo, mensagem } : { arquivo, linha, codigo, mensagem };
}

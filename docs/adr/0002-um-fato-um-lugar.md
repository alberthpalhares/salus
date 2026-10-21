# ADR-0002: Um fato, um lugar

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D2 e D3 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): um medicamento toca de dois a cinco arquivos (`Medicamentos.md`, `Ficha.md`, índice, views) e a "falha de sincronia" virou regra escrita em vários prompts; as views em disco dependem de "hoje" (`Agenda.md`) e envelhecem sozinhas.

## Decisão

Cada fato vive em exatamente um arquivo de verdade; `Familia/.gerado/indice.yaml` e as views de `Familia/` são geradas por código, somente-leitura, e regravadas em todo commit ou `salus-ai sync`.

## Consequências

- Positivo: a dessincronia entre cópias deixa de ser possível por construção, em vez de proibida por texto.
- Positivo: views sem relógio, regravadas só quando o conteúdo muda, não geram conflito de sincronização à toa.
- Custo: a edição manual de um arquivo gerado é sobrescrita e acusada pelo `doctor`.
- Custo: a edição direta dos arquivos de verdade continua permitida (Obsidian, VS Code), então as views em disco ficam defasadas até o próximo commit ou `salus-ai sync`; o `doctor` acusa "views desatualizadas".

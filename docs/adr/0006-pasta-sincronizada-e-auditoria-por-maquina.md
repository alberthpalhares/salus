# ADR-0006: Pasta sincronizada e auditoria por máquina

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

O diagnóstico não tem item próprio de concorrência: o motivo vem da topologia decidida pelo dono (desenho, seção 2: pasta no OneDrive, nenhuma máquina sempre ligada) e agrava D8 e D9 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md), isto é, o risco de perda de dados de saúde e o nada testado em Windows. Arquivos de estado de máquina dentro de uma pasta sincronizada gerariam cópias em conflito.

## Decisão

O cofre é uma pasta sincronizada por OneDrive sem servidor fixo; dois escritores é o caso normal. Lock, auditoria, PIN e 'última cópia gravada' ficam em `%LOCALAPPDATA%\salus\<id-do-cofre>\`, por máquina; arquivos append-only são fundidos por união de linhas.

## Consequências

- Positivo: duas máquinas escrevendo funcionam sem servidor fixo, e lock, PIN e auditoria não viram conflito de OneDrive.
- Positivo: `Doses.md` e `Historico.md` fundem sozinhos; o resto é protegido por hash-base e 409 (ADR-0005).
- Custo: a auditoria é por máquina, então não existe uma trilha única da família.
- Custo: copiar o cofre para outra máquina não leva lock, PIN nem "última cópia gravada"; o PIN não acompanha o cofre.

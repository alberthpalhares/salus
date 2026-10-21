# ADR-0001: Markdown é a verdade

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D2 e D4 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): hoje `_index.yaml` e views repetem fatos dos perfis sem que se saiba qual cópia vale, e o formato não tem schema nem camada de domínio. O dono decidiu (desenho, seção 2) que o Markdown continua legível e editável em Obsidian, VS Code e Explorer e que nenhum dado sai de casa.

## Decisão

Os arquivos Markdown/YAML do cofre são a única fonte de verdade; qualquer índice, cache ou banco é derivado e reconstruível a partir deles.

## Consequências

- Positivo: o cofre continua legível, editável à mão e copiável como uma pasta, sem prender a família a uma ferramenta.
- Positivo: um índice ou cache perdido nunca perde dado; basta reconstruir.
- Custo: a abertura relê e valida todos os arquivos (dezenas de ms na escala de uma família).
- Custo: a edição direta continua permitida, então o código precisa tolerar texto que não escreveu (ADR-0003).

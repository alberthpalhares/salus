# Registros de decisões de arquitetura (ADR)

Cada decisão estrutural do Salus fica em um arquivo `docs/adr/NNNN-slug.md`, e um ADR aceito não é reescrito: se a decisão mudar, escreve-se um novo ADR e o antigo passa a `substituída por ADR-NNNN`.

## Convenção

- `# ADR-NNNN: Título`: número de quatro dígitos e um título curto (o nome do arquivo é o slug do título).
- `Data`: dia em que a decisão foi aceita, em `AAAA-MM-DD`.
- `Status`: `aceita` ou `substituída por ADR-NNNN`.
- `## Contexto`: o problema que motivou a decisão, citando o item do diagnóstico (D1–D12, seção 1 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md)) quando houver.
- `## Decisão`: o que foi decidido, em uma frase que não admite duas leituras.
- `## Consequências`: de dois a quatro efeitos da decisão, os positivos e os custos.

## Índice

- [ADR-0001: Markdown é a verdade](0001-markdown-e-a-verdade.md)
- [ADR-0002: Um fato, um lugar](0002-um-fato-um-lugar.md)
- [ADR-0003: Splice, não reserializa](0003-splice-nao-reserializa.md)
- [ADR-0004: Sem banco, sem cache em disco](0004-sem-banco-sem-cache-em-disco.md)
- [ADR-0005: Consentimento em duas etapas](0005-consentimento-em-duas-etapas.md)
- [ADR-0006: Pasta sincronizada e auditoria por máquina](0006-pasta-sincronizada-e-auditoria-por-maquina.md)
- [ADR-0007: Histórico são eventos, tabelas são estado](0007-historico-eventos-tabelas-estado.md)
- [ADR-0008: Dependências de runtime](0008-dependencias-de-runtime.md)

# ADR-0004: Sem banco, sem cache em disco

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D11 e D9 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): sem acesso local estruturado não há como devolver só o que a pergunta exige, e nada roda em Windows hoje. A anti-meta de instalação complicada (desenho, seção 2: continua `npx`, sem Docker, banco ou conta) exclui dependência nativa, e um cofre familiar parseia em dezenas de ms.

## Decisão

Não há banco de dados nem cache em disco; o índice vive em memória, reconstruído na abertura e mantido por vigia de arquivos. Nada nativo para compilar.

## Consequências

- Positivo: o `npx` frio não compila nada nativo (bundle único) e funciona igual em Windows e Linux.
- Positivo: não há cache em disco para ficar obsoleto nem para o OneDrive sincronizar.
- Custo: toda abertura reconstrói o índice lendo todos os arquivos, inclusive hidratando os que o OneDrive mantém sob demanda.
- Custo: `serve` e `mcp` na mesma máquina têm índices independentes; a verdade é o disco e todo commit relê antes de aplicar.

# ADR-0008: Dependências de runtime

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D4 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): sem camada de domínio nem schema, e "zero dependências impede até um parser YAML". O v2 precisa validar o frontmatter e as tabelas contra um schema único (`zod`), ler e atualizar o YAML sem perder comentários (`yaml`) e localizar as regiões gerenciadas de um Markdown (`unified` com `remark-parse`, `remark-gfm` e `remark-frontmatter`, que só localizam offsets para o splice do [ADR-0003](0003-splice-nao-reserializa.md)). Escrever esses parsers à mão seria mais risco para dado de saúde do que depender de bibliotecas maduras.

Até a Fase 0 o pacote tinha zero dependências de runtime; o `CONTRIBUTING.md` exigia um ADR para qualquer dependência de runtime, e o [ADR-0004](0004-sem-banco-sem-cache-em-disco.md) já exclui dependência nativa. A pilha do desenho (seção 3.8) pede um bundle único com `tsdown`, dependências inlinadas e nenhuma nativa, para o `npx` frio ser rápido e o `.mcp.json` confiável.

## Decisão

O Salus usa em runtime somente `zod`, `yaml`, `unified`, `remark-parse`, `remark-gfm` e `remark-frontmatter`, inlinadas em `dist/cli.js` e declaradas em `devDependencies` (o pacote publicado continua sem `dependencies`); nenhuma é nativa, e qualquer outra biblioteca importada de `src/` exige um novo ADR. `@types/mdast` e `fast-check` são só de desenvolvimento.

## Consequências

- Positivo: schema, YAML e AST de Markdown vêm de bibliotecas mantidas, e o Zod dá tipo e validação a partir de uma única definição.
- Positivo: continua um bundle único sem nada nativo, e o `npx` frio baixa só o pacote, sem as cerca de 70 dependências transitivas das seis. No `tsdown.config.ts`, `deps.onlyImport: []` faz a build falhar se a saída importar qualquer pacote do npm (só `node:*` passa).
- Custo: o pacote cresce (as seis bibliotecas inteiras somam cerca de 340 KB minificadas, antes do tree-shaking do uso real); o tamanho aparece no `npm pack --dry-run` da CI e é conferido a cada fase. Corrigir uma vulnerabilidade numa delas exige publicar uma nova versão do Salus, porque o usuário não recebe atualização das dependências inlinadas.
- Custo: a guarda tem um limite: `onlyImport: []` só barra o que a saída importa, e um `npm i -D x` importado de `src/` seria inlinado em silêncio. Por isso toda biblioteca nova continua exigindo ADR, e `deps.alwaysBundle` lista as seis permitidas.

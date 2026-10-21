# ADR-0008: Dependências de runtime

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D4 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): sem camada de domínio nem schema, e "zero dependências impede até um parser YAML". O v2 precisa validar o frontmatter e as tabelas contra um schema único (`zod`), ler e atualizar o YAML sem perder comentários (`yaml`) e localizar as regiões gerenciadas de um Markdown (`unified` com `remark-parse`, `remark-gfm` e `remark-frontmatter`, que só localizam offsets para o splice do [ADR-0003](0003-splice-nao-reserializa.md)). Escrever esses parsers à mão seria mais risco para dado de saúde do que depender de bibliotecas maduras.

Até a Fase 0 o pacote tinha zero dependências de runtime, e o [ADR-0004](0004-sem-banco-sem-cache-em-disco.md) e o `CONTRIBUTING.md` exigem um ADR para qualquer uma. A pilha do desenho (seção 3.8) pede um bundle único com `tsdown`, dependências inlinadas e nenhuma nativa, para o `npx` frio ser rápido e o `.mcp.json` confiável.

## Decisão

O Salus usa em runtime somente `zod`, `yaml`, `unified`, `remark-parse`, `remark-gfm` e `remark-frontmatter`, todas inlinadas em `dist/cli.js`; nenhuma é nativa, e qualquer outra dependência de runtime exige um novo ADR. `@types/mdast` e `fast-check` são só de desenvolvimento.

## Consequências

- Positivo: schema, YAML e AST de Markdown vêm de bibliotecas mantidas, e o Zod dá tipo e validação a partir de uma única definição.
- Positivo: continua um bundle único sem nada nativo, e o `tsdown.config.ts` faz valer a decisão: `deps.alwaysBundle` inlina as seis e `deps.onlyImport: []` faz a build falhar se o bundle importar qualquer pacote do npm.
- Custo: o pacote cresce (as seis bibliotecas inteiras somam cerca de 340 KB minificadas, antes do tree-shaking do uso real) e, enquanto estiverem em `dependencies`, o `npm i` e o `npx` também baixam as seis com suas cerca de 70 dependências transitivas, mesmo inlinadas. O tamanho do pacote aparece no `npm pack --dry-run` da CI e é conferido a cada fase; mover as seis para `devDependencies` elimina o download e fica para quando o `npx` frio for medido.
- Custo: mais superfície de cadeia de suprimentos e de manutenção, porque as versões ficam no `package-lock.json` e uma atualização de versão maior de qualquer biblioteca vira trabalho do projeto.

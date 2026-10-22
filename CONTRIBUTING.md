# Contribuindo com o Salus

> Guia para quem mexe no framework. O usuário final lê `framework/COMECE_AQUI.md` (copiado para a pasta dele), não este arquivo.
> Estado do projeto e pendências: `STATUS.md`. Histórico: `CHANGELOG.md`.

## O que é o quê

| Caminho | Papel |
|---|---|
| `src/cli/` | Entrada e despacho do CLI (`bin.ts`, `main.ts`, `args.ts`, `help.ts`, `io.ts`, `comandos/`), em TypeScript. Importa o núcleo (`src/core`) e as bibliotecas de runtime do [ADR-0008](docs/adr/0008-dependencias-de-runtime.md), inlinadas no bundle; o registro `comandos` de `main.ts` é a fonte dos comandos e opções. |
| `src/core/framework/` | `init`, `update`, `doctor` e utilitários (`manifest`, `fs`, `detect`), em módulos testáveis. |
| `src/core/schema/` | Schema único (Zod) do formato v2: tipos e validação de frontmatter, tabelas e índice. |
| `src/core/format/` | Codecs de Markdown e YAML: localizam as regiões gerenciadas e regravam só o que mudou (splice, [ADR-0003](docs/adr/0003-splice-nao-reserializa.md)); problema de leitura vira dado, não exceção. |
| `src/core/vault/` | `Vault.abrir`: leitura do cofre v2, só leitura, com os problemas listados por arquivo. |
| `src/core/queries/` | Consultas sobre o `Vault` (`membros`, `perfil`, `agenda`, `buscar`, `marcador`), expostas no CLI com `--json`. |
| `src/core/inspecao/` | `inspecionar` (estrutura sem valores) e `anonimizar` (cópia anonimizada determinística por semente). |
| `dist/` | Gerado pelo `npm run build` (tsdown); `dist/cli.js` é o binário publicado. Não commitar (está no `.gitignore`). |
| `test/` | Unitários em `test/unit`, caracterização e comandos do CLI em `test/cli`, helpers em `test/helpers`; usam pastas temporárias. |
| `test/fixtures/` | `vaults/` (cofres v2 de exemplo, com dados inventados) e `dirty/` (corpus de arquivos "sujos": BOM, CRLF, espaço final, pipe escapado, HTML em célula etc., que os codecs precisam ler e regravar sem perder nada). `local/` é ignorada pelo git e guarda só a cópia anonimizada do cofre real, nunca dado real. |
| `framework/Frameworks/FORMATO.md` | Especificação do formato v2 do cofre (cabeçalhos canônicos, tabelas, frontmatter). `check-docs` confere que os cabeçalhos canônicos existem nos modelos de `framework/templates/`. |
| `framework/` | Tudo que é copiado para a pasta do usuário; espelha o layout do cofre. |
| `framework/.agents/skills/<nome>/SKILL.md` | Instruções que a IA segue para cada tarefa. |
| `framework/.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md` | O "cérebro" gerado no onboarding (vira o `AGENTS.md` do usuário). Carrega um marcador `salus-template: <versão>` na primeira linha. |
| `framework/.agents/skills/salus-onboarding/templates/` | Arquivos de `Familia/` e dos perfis (humano, cão, gato). `Familia/_index.yaml` tem `schema_versao`. |
| `framework/Frameworks/PROTOCOLO_CLINICO.md` | Regras clínicas, tabela "quem lê, quem grava", privacidade. |
| `framework/AGENTS.md`, `framework/CLAUDE.md`, `framework/GEMINI.md`, `framework/CODEX.md`, `framework/.cursorrules` | **Artefatos do produto**: stubs pré-onboarding copiados para o usuário. Não coloque regras de desenvolvimento neles; os `AGENTS.md`/`CLAUDE.md` da **raiz** são as instruções de desenvolvimento deste repositório. |
| `docs/` | Auditorias (`docs/auditoria`), desenho e planos (`docs/superpowers`), ADRs (`docs/adr`). Fica fora do pacote npm. |
| `_Caixa de Entrada/`, `Perfis/`, `Familia/` (no cofre do usuário) | Dados do usuário. Não existem neste repositório (só `framework/_Caixa de Entrada/LEIA-ME.md` faz parte do produto) e nunca entram nele; os testes usam pastas temporárias. |

## Antes de dizer "pronto"

1. `npm run typecheck` — TypeScript estrito, sem emitir arquivos (`tsc --noEmit`).
2. `npm test` — o `pretest` gera o `dist/cli.js` e a suíte roda: unitários dos módulos e caracterização do CLI (`init`, `update`, `doctor`, colisões, `--force`, pasta vazia); cobre o antigo roteiro manual. A CI roda em Linux e Windows.
   `npm run test:watch` e o runner da IDE não reconstroem `dist/`; rode `npm run build` antes se mudou `src/`.
3. `bash scripts/check-docs.sh` — trava de consistência (skills na tabela do cérebro, campos do índice, arquivos citados, versão, resíduos, cabeçalhos canônicos e comandos do README que existem na ajuda do CLI). A CI (e, por ela, o workflow de publicação) roda o mesmo script.
4. `npm pack --dry-run` — só `dist/`, `framework/`, `README.md`, `LICENSE` e `package.json` entram.
5. Mudou um campo de `Familia/_index.yaml`? Atualize, no mesmo commit: o template do índice, `SALUS_TEMPLATE.md`, `PROTOCOLO_CLINICO.md`, cada skill que lê ou grava o campo, a seção "Reconstruir ou migrar o índice" de `salus-revisao` e o `CHANGELOG.md`.
6. Mudou, criou ou renomeou uma skill? Confira a tabela "Skills" do `SALUS_TEMPLATE.md` e a tabela "Quem lê, quem grava" do protocolo.
7. Mudou uma promessa de comportamento? Confira se `README.md` e `framework/COMECE_AQUI.md` ainda dizem a verdade.
8. Atualize `CHANGELOG.md` (uma linha por mudança) e `STATUS.md` (retrato + adiados com `Alocação:`).

## Release

- Suba a versão em `package.json`, `README.md`, `framework/COMECE_AQUI.md` e no marcador `salus-template` do `SALUS_TEMPLATE.md`; crie a seção no `CHANGELOG.md`; commit; depois **`git tag vX.Y.Z && git push origin main vX.Y.Z`** (empurre a tag pelo nome, nunca `--tags`, para não enviar tags esquecidas) — só a tag publica (`.github/workflows/publish.yml`, com provenance). Push na `main` **não publica mais**; roda a CI (`.github/workflows/ci.yml`).
- A tag dispara primeiro a CI completa (`ci.yml` chamada por `publish.yml`: Linux e Windows × Node 22 e 24, com `npm run typecheck`, `npm test`, `check-docs`, `npm pack --dry-run` e a instalação do tarball); só se ela passar em todas as combinações o job `publish` roda. Se algum passo falhar, nada é publicado.
- A tag precisa ser igual a `v` + a `version` do `package.json`; o primeiro passo de verificação do job `publish` confere isso e falha com `::error::` se divergir.
- A publicação usa **trusted publishing (OIDC)**: não existe token do npm no repositório. Pré-requisitos (uma vez só, pelo dono): no npmjs.com, em *salus-ai → Settings → Trusted Publisher*, cadastrar GitHub Actions com usuário `alberthpalhares`, repositório `salus`, workflow `publish.yml`, environment em branco; depois remover o secret `NPM_TOKEN` do GitHub. O job roda em Node 24 porque o npm precisa ser ≥ 11.5.1; a proveniência é gerada automaticamente.
- O nome do comando é só `npx salus-ai`. Não adicione aliases de bin: `salus` é um pacote de terceiro no npm.

## Ambiente

- Toolchain de desenvolvimento exige Node ≥ 22.18 (tsdown aceita `^22.18 || ^24.11 || >=26`); `engines` do pacote é `>=22`. A CI roda Node 22 e 24.
- `prepack` é `npm run build 1>&2`: o tsdown escreve o log em stdout, o que corromperia a saída de `npm pack --json` (a CI lê o nome do tarball dela). O redirecionamento funciona em `sh` e `cmd`, mas não com `script-shell` PowerShell.

## Estilo

- Todo codec de `src/core/format/` tem teste de no-op byte-idêntico: ler um arquivo e regravá-lo sem mudar nada devolve exatamente os mesmos bytes (BOM, CRLF, espaços e células opacas incluídos). Codec novo sem esse teste não entra; e todo arquivo "sujo" que quebrou um codec vira um caso novo em `test/fixtures/dirty/`.
- TypeScript estrito, ESM, imports com sufixo `.js`; as bibliotecas de runtime são as do [ADR-0008](docs/adr/0008-dependencias-de-runtime.md) (inlinadas no bundle e declaradas em `devDependencies`); importar qualquer outra de `src/` exige um novo ADR.
- Português do Brasil com acentos, UTF-8, LF (`.gitattributes` cuida disso).
- Datas em `AAAA-MM-DD` em qualquer arquivo gerado para o usuário.
- Skills descrevem o que a IA faz em passos numerados, com os arquivos exatos que lê e grava; toda gravação de dado clínico passa por confirmação explícita (regra 4 do núcleo).

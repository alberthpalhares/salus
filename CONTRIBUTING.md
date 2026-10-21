# Contribuindo com o Salus

> Guia para quem mexe no framework. O usuário final lê `framework/COMECE_AQUI.md` (copiado para a pasta dele), não este arquivo.
> Estado do projeto e pendências: `STATUS.md`. Histórico: `CHANGELOG.md`.

## O que é o quê

| Caminho | Papel |
|---|---|
| `bin/cli.js` | CLI sem dependências: `init`, `update`, `doctor`. |
| `framework/` | Tudo que é copiado para a pasta do usuário; espelha o layout do cofre. |
| `framework/.agents/skills/<nome>/SKILL.md` | Instruções que a IA segue para cada tarefa. |
| `framework/.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md` | O "cérebro" gerado no onboarding (vira o `AGENTS.md` do usuário). Carrega um marcador `salus-template: <versão>` na primeira linha. |
| `framework/.agents/skills/salus-onboarding/templates/` | Arquivos de `Familia/` e dos perfis (humano, cão, gato). `Familia/_index.yaml` tem `schema_versao`. |
| `framework/Frameworks/PROTOCOLO_CLINICO.md` | Regras clínicas, tabela "quem lê, quem grava", privacidade. |
| `framework/AGENTS.md`, `framework/CLAUDE.md`, `framework/GEMINI.md`, `framework/CODEX.md`, `framework/.cursorrules` | **Artefatos do produto**: stubs pré-onboarding copiados para o usuário. Não coloque regras de desenvolvimento neles; os `AGENTS.md`/`CLAUDE.md` da **raiz** são as instruções de desenvolvimento deste repositório. |
| `docs/` | Auditorias (`docs/auditoria`), desenho e planos (`docs/superpowers`), ADRs (`docs/adr`). Fica fora do pacote npm. |
| `_Caixa de Entrada/`, `Perfis/`, `Familia/` (no cofre do usuário) | Dados do usuário. Não existem neste repositório e nunca entram nele; os testes usam pastas temporárias. |

## Antes de dizer "pronto"

0. `bash scripts/check-docs.sh` — trava de consistência (skills na tabela do cérebro, campos do índice, arquivos citados, versão, resíduos). A CI e o workflow de publicação rodam o mesmo script.
1. `npm test` — suíte de caracterização do CLI (`init`, `update`, `doctor`, colisões, `--force`, pasta vazia); cobre o antigo roteiro manual. A CI roda em Linux e Windows.
2. `npm pack --dry-run` — só `bin/`, `framework/`, `README.md`, `LICENSE` e `package.json` entram.
3. Mudou um campo de `Familia/_index.yaml`? Atualize, no mesmo commit: o template do índice, `SALUS_TEMPLATE.md`, `PROTOCOLO_CLINICO.md`, cada skill que lê ou grava o campo, a seção "Reconstruir ou migrar o índice" de `salus-revisao` e o `CHANGELOG.md`.
4. Mudou, criou ou renomeou uma skill? Confira a tabela "Skills" do `SALUS_TEMPLATE.md` e a tabela "Quem lê, quem grava" do protocolo.
5. Mudou uma promessa de comportamento? Confira se `README.md` e `framework/COMECE_AQUI.md` ainda dizem a verdade.
6. Atualize `CHANGELOG.md` (uma linha por mudança) e `STATUS.md` (retrato + adiados com `Alocação:`).

## Release

- Suba a versão em `package.json`, `README.md`, `framework/COMECE_AQUI.md` e no marcador `salus-template` do `SALUS_TEMPLATE.md`; crie a seção no `CHANGELOG.md`; commit; depois **`git tag vX.Y.Z && git push origin main vX.Y.Z`** (empurre a tag pelo nome, nunca `--tags`, para não enviar tags esquecidas) — só a tag publica (`.github/workflows/publish.yml`, com provenance). Push na `main` **não publica mais**; roda a CI (`.github/workflows/ci.yml`).
- A tag precisa ser igual a `v` + a `version` do `package.json`; o workflow confere antes de publicar e roda `npm test` e `check-docs`. Se algum passo falhar, nada é publicado.
- O nome do comando é só `npx salus-ai`. Não adicione aliases de bin: `salus` é um pacote de terceiro no npm.

## Estilo

- Português do Brasil com acentos, UTF-8, LF (`.gitattributes` cuida disso).
- Datas em `AAAA-MM-DD` em qualquer arquivo gerado para o usuário.
- Skills descrevem o que a IA faz em passos numerados, com os arquivos exatos que lê e grava; toda gravação de dado clínico passa por confirmação explícita (regra 4 do núcleo).

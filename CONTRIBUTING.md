# Contribuindo com o Salus

> Guia para quem mexe no framework. O usuário final lê `COMECE_AQUI.md`, não este arquivo.
> Estado do projeto e pendências: `STATUS.md`. Histórico: `CHANGELOG.md`.

## O que é o quê

| Caminho | Papel |
|---|---|
| `bin/cli.js` | CLI sem dependências: `init`, `update`, `doctor`. |
| `.agents/skills/<nome>/SKILL.md` | Instruções que a IA segue para cada tarefa. |
| `.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md` | O "cérebro" gerado no onboarding (vira o `AGENTS.md` do usuário). Carrega um marcador `salus-template: <versão>` na primeira linha. |
| `.agents/skills/salus-onboarding/templates/` | Arquivos de `Familia/` e dos perfis (humano, cão, gato). `Familia/_index.yaml` tem `schema_versao`. |
| `Frameworks/PROTOCOLO_CLINICO.md` | Regras clínicas, tabela "quem lê, quem grava", privacidade. |
| `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `.cursorrules` (raiz) | **Artefatos do produto**: stubs pré-onboarding copiados para o usuário. Um assistente de IA aberto neste repositório vai ler o stub — não coloque regras de desenvolvimento neles. |
| `docs/` | Relatórios de auditoria e decisões. Fica fora do pacote npm. |
| `_Caixa de Entrada/`, `Perfis/`, `Familia/` | Dados do usuário. Nunca entram no Git (ver `.gitignore`). |

## Antes de dizer "pronto"

0. `bash scripts/check-docs.sh` — trava de consistência (skills na tabela do cérebro, campos do índice, arquivos citados, versão, resíduos). O workflow roda o mesmo script antes de publicar.
1. `node --check bin/cli.js`
2. Em uma pasta temporária fora do repositório: `node bin/cli.js init <tmp>` → `doctor <tmp>` → `update <tmp>`. Rodar `init <tmp>` de novo com stdin fechado (`</dev/null`) deve listar as colisões e sair com código 1 sem alterar nada; `init <tmp> --force` sobrescreve. `update` numa pasta vazia deve sair com código 1.
3. `npm pack --dry-run` — só `bin/`, `.agents/`, `Frameworks/`, os cinco stubs, `_Caixa de Entrada/`, `COMECE_AQUI.md`, `README.md`, `LICENSE` e `package.json` entram.
4. Mudou um campo de `Familia/_index.yaml`? Atualize, no mesmo commit: o template do índice, `SALUS_TEMPLATE.md`, `PROTOCOLO_CLINICO.md`, cada skill que lê ou grava o campo, a seção "Reconstruir ou migrar o índice" de `salus-revisao` e o `CHANGELOG.md`.
5. Mudou, criou ou renomeou uma skill? Confira a tabela "Skills" do `SALUS_TEMPLATE.md` e a tabela "Quem lê, quem grava" do protocolo.
6. Mudou uma promessa de comportamento? Confira se `README.md` e `COMECE_AQUI.md` ainda dizem a verdade.
7. Atualize `CHANGELOG.md` (uma linha por mudança) e `STATUS.md` (retrato + adiados com `Alocação:`).

## Release

- Suba a versão em `package.json`, `README.md`, `COMECE_AQUI.md` e no marcador `salus-template` do `SALUS_TEMPLATE.md`; crie a seção no `CHANGELOG.md`.
- **Push na `main` publica no npm automaticamente** (`.github/workflows/publish.yml`) se a versão ainda não existir no registro. O workflow roda um smoke test do CLI antes; se ele falhar, nada é publicado.
- O nome do comando é só `npx salus-ai`. Não adicione aliases de bin: `salus` é um pacote de terceiro no npm.

## Estilo

- Português do Brasil com acentos, UTF-8, LF (`.gitattributes` cuida disso).
- Datas em `AAAA-MM-DD` em qualquer arquivo gerado para o usuário.
- Skills descrevem o que a IA faz em passos numerados, com os arquivos exatos que lê e grava; toda gravação de dado clínico passa por confirmação explícita (regra 4 do núcleo).

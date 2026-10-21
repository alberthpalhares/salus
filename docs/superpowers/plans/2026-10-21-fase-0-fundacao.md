# Fase 0 — Fundação de engenharia — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o repositório do Salus com testes automatizados do CLI atual, CI em Linux e Windows, publicação só por tag, produto separado do código (`framework/`) e o CLI portado para TypeScript com comportamento idêntico — sem mudar o formato da pasta do usuário e sem release.

**Architecture:** Primeiro congela-se o comportamento do `bin/cli.js` atual numa suíte de caracterização que roda o CLI como processo filho em pastas temporárias com acento e espaço. Depois a CI passa a rodar essa suíte em `ubuntu` e `windows`, e a publicação sai do push na `main` para tags `v*`. Só então o conteúdo do produto é movido para `framework/`, o CLI é reescrito em módulos TypeScript (`src/core/framework/*` + `src/cli/*`) e empacotado com `tsdown` em `dist/cli.js`, com a mesma suíte provando a paridade.

**Tech Stack:** Node ≥ 20 (CI em 20/22/24), TypeScript (ESM, `NodeNext`), Vitest, tsdown, GitHub Actions. Zero dependências de runtime nesta fase.

**Spec:** `docs/superpowers/specs/2026-10-21-salus-v2-design.md` (seções 1, 3.9, 4 e 5). Plano aprovado completo: `C:\Users\alber\.claude\plans\n-o-entendi-os-stop-happy-lecun.md`.

## Global Constraints

- `engines.node` passa a `>=20`; a CI roda Node 20, 22 e 24 em `ubuntu-latest` e `windows-latest`.
- **Nenhuma dependência de runtime** nesta fase (`dependencies` continua vazio); só `devDependencies`.
- **Comportamento observável do CLI não muda**: mesmos textos, mesmos códigos de saída, mesmos arquivos criados. Toda divergência é bug desta fase, não melhoria (as melhorias DT-02/DT-04 ficam para a Fase 1).
- Pasta do usuário continua no formato v1 (`.agents/`, `Frameworks/`, `AGENTS.md`, `_index.yaml`). `framework/` no repo **espelha exatamente** esse layout.
- Português do Brasil, UTF-8 sem BOM, LF (`.gitattributes` já força).
- Pacote npm contém só `dist/`, `framework/`, `README.md`, `LICENSE`, `package.json` (allowlist `files`).
- **Nunca** `git push`, `git tag` ou `npm publish` sem pedido explícito do dono. Commits locais por tarefa são esperados.
- Dados reais de famílias nunca entram no repositório; testes usam só pastas temporárias e templates.
- Mensagens de commit no estilo do repo (`test:`, `ci:`, `refactor:`, `docs:`, `chore:`), terminadas com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

## Review Focus

1. **Pasta de destino com acento e espaço no Windows** (`Saúde da Família\Minha Pasta`): `init`, `update` e `doctor` devem funcionar e os caminhos impressos devem estar corretos → todos os testes da Tarefa 2 rodam dentro de uma raiz temporária com esse nome.
2. **Pacote instalado a partir do tarball** (`npm pack` → `npm i <tgz>` numa pasta com acento → `npx salus-ai init`): o binário precisa achar `framework/` e `package.json` quando `dist/cli.js` é alcançado por symlink de `node_modules/.bin` → passo de CI na Tarefa 3 e teste `packageRoot()` na Tarefa 5.
3. **Flag desconhecida junto com comando** (`init --froce Pasta`): sai com 1 e **nada é criado** → teste na Tarefa 2.
4. **`init` sem argumento** usa a pasta atual (cwd) e não a pasta do pacote → teste na Tarefa 2 com `cwd` temporário.
5. **Caminho absoluto como destino** (`init D:\tmp\x` ou `/tmp/x`): `path.resolve` deve respeitá-lo em vez de concatenar ao cwd → teste na Tarefa 2.

---

### Task 1: Documentos de desenho no repositório (spec + ADRs)

**Files:**
- Já existe: `docs/superpowers/specs/2026-10-21-salus-v2-design.md`
- Create: `docs/adr/README.md`, `docs/adr/0001-markdown-e-a-verdade.md`, `docs/adr/0002-um-fato-um-lugar.md`, `docs/adr/0003-splice-nao-reserializa.md`, `docs/adr/0004-sem-banco-sem-cache-em-disco.md`, `docs/adr/0005-consentimento-em-duas-etapas.md`, `docs/adr/0006-pasta-sincronizada-e-auditoria-por-maquina.md`, `docs/adr/0007-historico-eventos-tabelas-estado.md`
- Modify: `CONTRIBUTING.md` (linha da tabela "O que é o quê" para `docs/`)

**Interfaces:**
- Produces: convenção de ADR usada pelas fases seguintes: arquivo `docs/adr/NNNN-slug.md` com seções `# ADR-NNNN: Título`, `Data`, `Status` (`aceita` | `substituída por ADR-NNNN`), `## Contexto`, `## Decisão`, `## Consequências`.

- [ ] **Passo 1: Criar `docs/adr/README.md`** com a convenção acima (uma frase por seção) e a lista dos sete ADRs com link.

- [ ] **Passo 2: Criar os sete ADRs** (10–20 linhas cada). A frase de decisão de cada um, a copiar literalmente:
  - 0001: "Os arquivos Markdown/YAML do cofre são a única fonte de verdade; qualquer índice, cache ou banco é derivado e reconstruível a partir deles."
  - 0002: "Cada fato vive em exatamente um arquivo de verdade; `Familia/.gerado/indice.yaml` e as views de `Familia/` são geradas por código, somente-leitura, e regravadas em todo commit ou `salus-ai sync`."
  - 0003: "O núcleo grava por splice das regiões gerenciadas (heading canônico + primeira tabela/lista) e copia o resto do arquivo byte a byte; linhas não reconhecidas dentro de uma região são preservadas como opacas. `remark` só localiza offsets; nunca se re-serializa o documento."
  - 0004: "Não há banco de dados nem cache em disco; o índice vive em memória, reconstruído na abertura e mantido por vigia de arquivos. Nada nativo para compilar."
  - 0005: "Nenhum comando grava diretamente: `propose` devolve um ChangeSet (comando + hashes-base + diff derivado) e `commit(id)` grava; hash divergente re-executa o comando e devolve 409 com nova proposta; TTL 15 min; tudo vai para `audit.jsonl` em app-data."
  - 0006: "O cofre é uma pasta sincronizada por OneDrive sem servidor fixo; dois escritores é o caso normal. Lock, auditoria, PIN e 'última cópia gravada' ficam em `%LOCALAPPDATA%\salus\<id-do-cofre>\`, por máquina; arquivos append-only são fundidos por união de linhas."
  - 0007: "`Historico.md` é um log de eventos imutáveis; as tabelas (`Medicamentos.md`, `Vacinas.md`, `Pendencias.md`) são o estado atual; nenhuma view deriva estado do Histórico."
  O `## Contexto` de cada um cita o item do diagnóstico da spec (D1–D12) que motiva a decisão; `## Consequências` lista 2–4 efeitos (positivos e custos).

- [ ] **Passo 3: Atualizar `CONTRIBUTING.md`**: a linha `| docs/ | Relatórios de auditoria e decisões. Fica fora do pacote npm. |` passa a `| docs/ | Auditorias (docs/auditoria), desenho e planos (docs/superpowers), ADRs (docs/adr). Fica fora do pacote npm. |`.

- [ ] **Passo 4: Verificar**

Run: `bash scripts/check-docs.sh`
Expected: última linha `check-docs: OK` (a pasta `docs` está excluída do grep de resíduos).

- [ ] **Passo 5: Commit**

```bash
git add docs/superpowers docs/adr CONTRIBUTING.md
git commit -m "docs: desenho do Salus v2 e ADRs 0001-0007"
```

---

### Task 2: Suíte de caracterização do CLI atual (`npm test`)

**Files:**
- Modify: `package.json` (scripts `test`, `test:watch`; `devDependencies`: `vitest`, `@types/node`)
- Create: `vitest.config.ts`, `test/helpers/cli.ts`, `test/helpers/vault.ts`, `test/cli/caracterizacao.test.ts`
- Modify: `.gitignore` (acrescentar `node_modules/`, `dist/`, `test/fixtures/local/`)
- Create (gerado pelo npm): `package-lock.json`

**Interfaces:**
- Produces (usadas pelas Tarefas 4, 5 e 6):
  - `test/helpers/cli.ts`: `REPO_ROOT: string`; `CLI_PATH: string` = `process.env.SALUS_CLI ?? path.join(REPO_ROOT, 'bin', 'cli.js')`; `FRAMEWORK_SRC: string` = `process.env.SALUS_FRAMEWORK ?? REPO_ROOT`; `stripAnsi(s: string): string`; `runCli(args: string[], opts?: { cwd?: string }): Promise<CliResult>` com `type CliResult = { code: number; stdout: string; stderr: string; out: string }` onde `out` = stdout+stderr sem ANSI. Executa `execFile(process.execPath, [CLI_PATH, ...args], { cwd, windowsHide: true })` com `stdio: ['ignore', 'pipe', 'pipe']` (stdin fechado garante "sem TTY"). `code` nunca lança: captura o `error.code` do execFile.
  - `test/helpers/vault.ts`: `makeTempRoot(): Promise<string>` cria e devolve `<os.tmpdir()>/salus-test-<8 hex>/Saúde da Família` (acento + espaços de propósito); `removeTempRoot(root: string): Promise<void>` (`fs.rm` recursivo, `maxRetries: 5`); `simulateFamily(vaultDir: string): void` (ver passo 3); `readTree(dir: string): Map<string, Buffer>` (caminhos relativos com `/`, ordenados; ignora `.DS_Store`/`Thumbs.db`); `INIT_ITEMS`, `UPDATE_ITEMS`, `PROFILE_REQUIRED_FILES` copiados literalmente de `bin/cli.js` (a Tarefa 5 passa a importá-los de `src/`).

- [ ] **Passo 1: Instalar o runner e declarar scripts**

Run: `npm i -D vitest @types/node` (última estável de cada um; commitar o `package-lock.json`).
Em `package.json`: `"scripts": { "test": "vitest run", "test:watch": "vitest" }`.
Criar `vitest.config.ts`: `include: ['test/**/*.test.ts']`, `testTimeout: 30_000`, `hookTimeout: 30_000`, `fileParallelism: false` (os testes fazem `npm pack --dry-run` e leem a árvore do repo; sem paralelismo entre arquivos evita contenção no Windows).
Em `.gitignore`: acrescentar `node_modules/`, `dist/`, `test/fixtures/local/` (sem remover nada ainda).

- [ ] **Passo 2: Escrever `test/helpers/cli.ts` e `test/helpers/vault.ts`** com as assinaturas do bloco Interfaces.

`simulateFamily(vaultDir)` — pré-condição: `init` já rodou em `vaultDir`. Faz, nesta ordem:
  1. `Familia/_index.yaml` = conteúdo de `<FRAMEWORK_SRC>/.agents/skills/salus-onboarding/templates/Familia/_index.yaml` com `familia: "[Sobrenome/identificação]"` trocado por `familia: "Teste"`.
  2. `Familia/Agenda.md` e `Familia/META.md` = cópias dos templates correspondentes.
  3. `Perfis/Teste/<arquivo>` para cada um de `PROFILE_REQUIRED_FILES`, copiados de `templates/Perfil_Humano/`.
  4. `AGENTS.md` sobrescrito com `# Cérebro da família Teste\n\nConteúdo personalizado.\n` (sem a frase-sentinela "ainda não foi inicializado").
  5. `_Caixa de Entrada/exame.pdf` com conteúdo `%PDF-1.4\n`.
  6. `.agents/skills/cruzar/SKILL.md` sobrescrito com `CORROMPIDO\n`.

- [ ] **Passo 3: Escrever `test/cli/caracterizacao.test.ts`** — `beforeEach` cria `root = await makeTempRoot()`, `afterEach` remove. Testes (nome → asserções; usar `out` sem ANSI para substrings):

`describe('ajuda e versão')`
  - `--version imprime v<versão do package.json> e sai 0`: `code === 0`; `stdout.trim() === 'v' + require(package.json).version`.
  - `-v é alias de --version`: idem.
  - `--help sai 0 e mostra USO`: `code === 0`; `out` contém `USO:` e `init [pasta]`.
  - `-h é alias de --help`; `sem argumentos mostra ajuda e sai 0`.
  - `init --help mostra ajuda sem criar nada`: `code === 0`; `root` continua sem `AGENTS.md`.
  - `flag desconhecida sai 1`: `runCli(['--froce'])` → `code === 1`; `out` contém `Opção desconhecida`.
  - `flag desconhecida com comando sai 1 e não cria nada` (Review Focus 3): `runCli(['init', '--froce', 'Nova'], {cwd: root})` → `code === 1`; `root/Nova` não existe.
  - `comando desconhecido sai 1`: `runCli(['foo'])` → `code === 1`; `out` contém `Comando desconhecido`.

`describe('init')`
  - `init em pasta nova cria a estrutura v1 e sai 0`: `runCli(['init', 'Minha Pasta'], {cwd: root})` → `code === 0`; existem `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `.cursorrules`, `COMECE_AQUI.md`, `Frameworks/PROTOCOLO_CLINICO.md`, `_Caixa de Entrada/LEIA-ME.md`, `Perfis/` (dir) e, para cada uma das 7 skills (`cruzar`, `preparar-consulta`, `raio-x`, `registrar`, `salus-organiza`, `salus-revisao`, `salus-onboarding`), `.agents/skills/<s>/SKILL.md`; `out` contém `Quero montar meu Salus`.
  - `init copia .agents idêntico à origem`: `readTree(vault/.agents)` deep-equal `readTree(FRAMEWORK_SRC/.agents)`.
  - `init sem argumento usa a pasta atual` (Review Focus 4): `runCli(['init'], {cwd: root})` → `code === 0`; `root/AGENTS.md` e `root/.agents/skills/raio-x/SKILL.md` existem.
  - `init com caminho absoluto respeita o caminho` (Review Focus 5): `runCli(['init', path.join(root, 'Abs')], {cwd: os.tmpdir()})` → `root/Abs/AGENTS.md` existe.
  - `init cria pasta aninhada inexistente`: `runCli(['init', 'a/b/c'], {cwd: root})` → `root/a/b/c/AGENTS.md` existe.
  - `init repetido sem TTY sai 1, lista colisões e não altera nada`: após init, `agentsAntes = readFile(AGENTS.md)`; segundo `init` → `code === 1`; `out` contém `sobrescreveria ou mesclaria`, `AGENTS.md` e `Sem terminal interativo`; `readFile(AGENTS.md)` igual a `agentsAntes` (Buffer equals).
  - `init --force sobrescreve sem perguntar`: alterar `AGENTS.md` para `X`; `init --force` → `code === 0`; `AGENTS.md` volta a ser igual ao de `FRAMEWORK_SRC/AGENTS.md`.
  - `init em pasta já inicializada (AGENTS.md sem sentinela) sai 1 com a mensagem de família`: `init` + `simulateFamily` + `init` → `code === 1`; `out` contém `já contém um Salus inicializado` e `npx salus-ai update`; `AGENTS.md` intacto.
  - `init em pasta com CLAUDE.md próprio e sem AGENTS.md sai 1 e não copia nada`: escrever `root/CLAUDE.md` = `meu`; `init` → `code === 1`; `out` contém `CLAUDE.md`; `root/.agents` não existe; `CLAUDE.md` continua `meu`. Depois `init --force` → `code === 0`; `CLAUDE.md` igual ao de `FRAMEWORK_SRC`.

`describe('update')`
  - `update preserva dados e restaura skills`: `init` + `simulateFamily` + `update` → `code === 0`; `AGENTS.md` continua `# Cérebro da família Teste…`; `Perfis/Teste/Ficha.md` existe; `Familia/_index.yaml` contém `familia: "Teste"`; `_Caixa de Entrada/exame.pdf` existe; `readTree(vault/.agents)` deep-equal `readTree(FRAMEWORK_SRC/.agents)` (cruzar restaurado); `out` contém `foram preservados`.
  - `update sobrescreve COMECE_AQUI.md` (comportamento atual, pinado): alterar para `meu`; `update` → igual ao de `FRAMEWORK_SRC`.
  - `update em pasta vazia sai 1 e não cria nada`: `mkdir root/Vazia`; `update Vazia` → `code === 1`; `out` contém `não parece conter um Salus`; `readdir(Vazia).length === 0`.
  - `update em pasta inexistente sai 1`: `out` contém `não existe`.
  - `update aceita pasta só com .agents`: `mkdir -p root/SoAgents/.agents`; `update SoAgents` → `code === 0`.

`describe('doctor')`
  - `doctor logo após init: não inicializado, 0 alertas, sai 0`: `out` contém `ainda não foi inicializado` e `Tudo certo`; `code === 0`.
  - `doctor na família simulada`: `out` contém `Sistema inicializado`, `Teste`, `todos os 5 arquivos base presentes`, `1 documento(s) aguardando triagem`; `code === 0`.
  - `doctor sem _index.yaml sugere reconstruir o índice`: remover o arquivo → `out` contém `reconstruir o índice` e `1 alerta(s)`; `code === 0` (comportamento atual: alertas não mudam o código).
  - `doctor sem AGENTS.md sugere init`: `out` contém `npx salus-ai init`.
  - `doctor com perfil incompleto lista o que falta`: remover `Perfis/Teste/Exames.md` → `out` contém `faltando: Exames.md`.
  - `doctor conta subpasta da Caixa como documento` (comportamento atual, pinado): `mkdir _Caixa de Entrada/Sub` → `out` contém `2 documento(s)`.
  - `doctor em pasta inexistente sai 1`.
  - `check e status são aliases de doctor`: ambos `code === 0` e `out` contém `Salus Doctor`.
  - `doctor ignora --force`: `runCli(['doctor', '--force', vault])` → `code === 0`.

`describe('pacote')`
  - `npm pack --dry-run só inclui a allowlist`: `execFile('npm', ['pack', '--dry-run', '--json'], {cwd: REPO_ROOT, shell: process.platform === 'win32'})`; parsear JSON; o conjunto de `files[].path` não contém nenhum caminho que comece com `docs/`, `scripts/`, `test/`, `.github/`, nem `STATUS.md`, `CONTRIBUTING.md`, `CHANGELOG.md`; contém `README.md`, `LICENSE`, `package.json` e pelo menos um caminho `.agents/skills/raio-x/SKILL.md` (a Tarefa 4 troca esse último por `framework/.agents/skills/raio-x/SKILL.md`).

- [ ] **Passo 4: Rodar e ver tudo verde contra o CLI atual**

Run: `npm test`
Expected: todos os testes passam (≈35). Se algum falhar, o teste está errado (o CLI atual é a referência): corrigir o teste, não o CLI.

- [ ] **Passo 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts test .gitignore
git commit -m "test: suite de caracterizacao do CLI (DT-01)"
```

---

### Task 3: CI por PR/push em Linux e Windows; publicação só por tag

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `.github/workflows/publish.yml` (reescrever)
- Modify: `CONTRIBUTING.md` (seção "Release" e item 2 de "Antes de dizer pronto"), `STATUS.md` (porta de verificação; aviso de que push não publica mais)

**Interfaces:**
- Consumes: `npm test` da Tarefa 2.
- Produces: job `test` reutilizável como pré-requisito do publish; convenção de release por tag `vX.Y.Z` igual ao `version` do `package.json`.

- [ ] **Passo 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [20, 22, 24]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "${{ matrix.node }}", cache: npm }
      - run: npm ci
      - run: npm test
      - run: bash scripts/check-docs.sh
      - run: npm pack --dry-run
      - name: Instalar tarball em pasta com acento e rodar init/doctor
        shell: bash
        run: |
          set -euo pipefail
          TGZ="$(npm pack --pack-destination "$RUNNER_TEMP" --json | node -p "JSON.parse(require('fs').readFileSync(0,'utf8'))[0].filename")"
          APP="$RUNNER_TEMP/Saúde da Família/app"
          mkdir -p "$APP" && cd "$APP"
          npm init -y >/dev/null
          npm i "$RUNNER_TEMP/$TGZ" >/dev/null
          npx salus-ai --version
          npx salus-ai init "Minha Saúde"
          npx salus-ai doctor "Minha Saúde"
          test -f "Minha Saúde/.agents/skills/raio-x/SKILL.md"
```

- [ ] **Passo 2: Reescrever `.github/workflows/publish.yml`**

Gatilho `on: push: tags: ['v*']`; `permissions: { contents: read, id-token: write }`; um job `publish` em `ubuntu-latest`, Node 22 com `registry-url: https://registry.npmjs.org`; passos: checkout, setup-node, `npm ci`, `npm test`, `bash scripts/check-docs.sh`, passo "Conferir tag × versão" em bash: `test "v$(node -p "require('./package.json').version")" = "$GITHUB_REF_NAME"` (falha com mensagem clara se diferente), depois `npm publish --provenance --access public` com `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`. Manter o bloco `concurrency` atual. Remover a lógica "pular se a versão já existe" (a tag é única).

- [ ] **Passo 3: Validar os YAMLs localmente**

Run: `npx --yes js-yaml .github/workflows/ci.yml > /dev/null && npx --yes js-yaml .github/workflows/publish.yml > /dev/null && echo OK`
Expected: `OK` (sem erro de parse). A execução real só acontece no próximo push/tag autorizado pelo dono.

- [ ] **Passo 4: Atualizar `CONTRIBUTING.md` e `STATUS.md`**
  - CONTRIBUTING "Antes de dizer pronto": os itens 1 (`node --check`) e 2 (roteiro manual) viram um único item `npm test` (a suíte cobre o roteiro antigo); item 0 mantém `check-docs`.
  - CONTRIBUTING "Release": "Suba a versão em `package.json`, `README.md`, `COMECE_AQUI.md` e no marcador `salus-template`; crie a seção no `CHANGELOG.md`; commit; depois **`git tag vX.Y.Z && git push origin main --tags`** — só a tag publica (`publish.yml`, com provenance). Push na `main` **não publica mais**; roda a CI."
  - STATUS "Porta de verificação atual": `npm test` + `bash scripts/check-docs.sh` + CI (`ci.yml`, ubuntu+windows). Remover "(provisória)". DT-01 e DT-03: marcar como concluídos nesta fase (mover para "Concluído").

- [ ] **Passo 5: Commit**

```bash
git add .github/workflows CONTRIBUTING.md STATUS.md
git commit -m "ci: testes em ubuntu+windows por PR/push; publicacao so por tag com provenance (DT-03)"
```

---

### Task 4: Mover o produto para `framework/` e dar ao repositório instruções de desenvolvimento próprias

**Files:**
- Move (`git mv`): `.agents/` → `framework/.agents/`; `Frameworks/` → `framework/Frameworks/`; `_Caixa de Entrada/LEIA-ME.md` → `framework/_Caixa de Entrada/LEIA-ME.md`; `COMECE_AQUI.md` → `framework/COMECE_AQUI.md`; `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `.cursorrules` → `framework/`
- Delete: `Perfis/.gitkeep`, `_Caixa de Entrada/.gitkeep` (o repo deixa de fingir que é um cofre)
- Create: `AGENTS.md` (dev), `CLAUDE.md` (dev, ponteiro)
- Modify: `bin/cli.js:159` e `bin/cli.js:226` (`rootDir`), `package.json` (`files`), `scripts/check-docs.sh` (caminhos), `.gitignore`, `test/helpers/cli.ts` (`FRAMEWORK_SRC`), `test/cli/caracterizacao.test.ts` (teste do pacote), `CONTRIBUTING.md` (tabela "O que é o quê"), `README.md` (apenas se citar caminhos do repo)

**Interfaces:**
- Produces: `framework/` espelha o layout do cofre v1; `FRAMEWORK_SRC` default = `path.join(REPO_ROOT, 'framework')`.

- [ ] **Passo 1: Fazer o teste do pacote falhar primeiro** — em `caracterizacao.test.ts`, trocar a asserção `.agents/skills/raio-x/SKILL.md` por `framework/.agents/skills/raio-x/SKILL.md` e acrescentar: nenhum `files[].path` começa com `.agents/`, `Frameworks/`, nem é `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `.cursorrules`, `COMECE_AQUI.md` na raiz. Em `test/helpers/cli.ts`, `FRAMEWORK_SRC` default passa a `path.join(REPO_ROOT, 'framework')`.

Run: `npm test`
Expected: FAIL nos testes de pacote e nos que comparam `.agents` com `FRAMEWORK_SRC` (pasta ainda não existe).

- [ ] **Passo 2: Mover os arquivos com `git mv`** conforme a lista de Files (criar `framework/` e `framework/_Caixa de Entrada/`). Remover `Perfis/.gitkeep` e `_Caixa de Entrada/.gitkeep` com `git rm`.

- [ ] **Passo 3: Apontar o CLI para `framework/`** — em `bin/cli.js`, as duas ocorrências de `const rootDir = path.join(__dirname, '..');` passam a `const rootDir = path.join(__dirname, '..', 'framework');`. Em `package.json`, `"files": ["bin", "framework"]`.

- [ ] **Passo 4: Adaptar `scripts/check-docs.sh`** — `TEMPLATE`, `INDEX`, `PROTO`, `TEMPLATES_DIR`, `SKILLS` e o laço `for d in .agents/skills/*/` ganham o prefixo `framework/`; o item 5 passa a conferir `framework/COMECE_AQUI.md`; o grep de resíduos (item 1) ganha `--include='*.ts'`. Os padrões procurados **dentro** dos textos (`.agents/skills/<s>/SKILL.md`, `Perfis/[Nome]/…`) não mudam: são caminhos do cofre.

- [ ] **Passo 5: `.gitignore`** — remover os blocos `_Caixa de Entrada/*`, `Perfis/*`, `Familia/*` (e seus `!`); manter o resto.

- [ ] **Passo 6: Criar o `AGENTS.md` de desenvolvimento** (raiz), com este conteúdo:

```markdown
# Salus — instruções para quem desenvolve o framework

Este repositório é o **código-fonte** do Salus (`salus-ai` no npm), não uma pasta de família.
Tudo que vai para a pasta do usuário fica em `framework/`; o CLI fica em `bin/` (até a Fase 0 terminar) e depois em `src/` → `dist/`.

Antes de qualquer alteração, leia `STATUS.md` (estado, fase atual, adiados) e `CONTRIBUTING.md` (regras, porta de verificação, release).
Desenho aprovado: `docs/superpowers/specs/2026-10-21-salus-v2-design.md`. Decisões: `docs/adr/`. Planos por fase: `docs/superpowers/plans/`.

Regras que não se negociam:
- `npm test` e `bash scripts/check-docs.sh` verdes antes de dizer "pronto".
- Nunca `git push`, `git tag` ou `npm publish` sem pedido explícito do dono (a tag publica no npm).
- Dados reais de qualquer família nunca entram neste repositório; testes usam pastas temporárias e os templates de `framework/`.
- Textos para o usuário final em português do Brasil, UTF-8, LF.
```

E o `CLAUDE.md` de desenvolvimento (raiz): `# Salus\n\nLeia `AGENTS.md` nesta pasta: ele é o arquivo canônico de instruções deste repositório.\n`. Não recriar `GEMINI.md`, `CODEX.md` nem `.cursorrules` na raiz.

- [ ] **Passo 7: Atualizar `CONTRIBUTING.md`** — tabela "O que é o quê": `framework/` ("tudo que é copiado para a pasta do usuário; espelha o layout do cofre"), caminhos das skills/templates/protocolo com prefixo `framework/`, linha dos stubs passa a "`framework/AGENTS.md` etc.: artefatos do produto; os `AGENTS.md`/`CLAUDE.md` da **raiz** são instruções de desenvolvimento". Item 3 de "Antes de dizer pronto" (`npm pack`): lista `bin/`, `framework/`, `README.md`, `LICENSE`, `package.json`.

- [ ] **Passo 8: Verificar**

Run: `npm test && bash scripts/check-docs.sh && npm pack --dry-run`
Expected: suíte verde; `check-docs: OK`; o `pack` lista `framework/...` e nenhum stub na raiz.

- [ ] **Passo 9: Commit**

```bash
git add -A
git commit -m "refactor: produto movido para framework/; AGENTS.md e CLAUDE.md da raiz viram instrucoes de desenvolvimento"
```

---

### Task 5: Toolchain TypeScript e módulos puros do núcleo (sem trocar o binário ainda)

**Files:**
- Modify: `package.json` (`"type": "module"`; `bin` → `bin/cli.cjs`; `devDependencies`: `typescript`, `tsdown`; script `typecheck`), `.github/workflows/ci.yml` (passo `npm run typecheck` antes de `npm test`)
- Move (`git mv`): `bin/cli.js` → `bin/cli.cjs` (continua CommonJS e intocado; a extensão `.cjs` o protege do `"type": "module"`)
- Modify: `test/helpers/cli.ts` (default de `CLI_PATH` → `bin/cli.cjs`), `CONTRIBUTING.md` (menções a `bin/cli.js`)
- Create: `tsconfig.json`, `src/core/framework/manifest.ts`, `src/core/framework/fs.ts`, `src/core/framework/detect.ts`, `src/cli/io.ts`
- Create: `test/unit/manifest.test.ts`, `test/unit/detect.test.ts`, `test/unit/fs.test.ts`, `test/unit/io.test.ts`
- Modify: `test/helpers/vault.ts` (importar `INIT_ITEMS`, `UPDATE_ITEMS`, `PROFILE_REQUIRED_FILES` de `src/core/framework/manifest.ts` em vez de duplicar)

**Interfaces:**
- Produces (usadas pela Tarefa 6):
  - `src/core/framework/manifest.ts`: `export const INIT_ITEMS: readonly string[]`, `UPDATE_ITEMS`, `PROFILE_REQUIRED_FILES`, `KNOWN_FLAGS: ReadonlySet<string>` (valores literais de `bin/cli.js:24-51`); `export function packageRoot(): string` — sobe diretórios a partir de `fileURLToPath(import.meta.url)` até achar um `package.json` cujo `name === 'salus-ai'` (funciona em `src/` sob o Vitest e em `dist/cli.js` empacotado; lança `Error('package.json do salus-ai não encontrado')` se não achar); `export function frameworkRoot(): string` = `path.join(packageRoot(), 'framework')`; `export function packageVersion(): string` (lê `version` do `package.json`; fallback `'0.0.0'`).
  - `src/core/framework/fs.ts`: `export function copyItemRecursiveSync(src: string, dest: string): void` (mesma semântica de `bin/cli.js:89-111`, inclusive ignorar `.DS_Store` e `Thumbs.db` e não fazer nada se `src` não existe); `export function ensureDirSync(dir: string): void`.
  - `src/core/framework/detect.ts`: `export const SENTINELA_NAO_INICIALIZADO = 'ainda não foi inicializado'`; `export function isAlreadyInitialized(targetDir: string): boolean`; `export function findInitCollisions(targetDir: string): string[]`; `export function looksLikeSalus(targetDir: string): boolean` (semântica de `bin/cli.js:113-139`).
  - `src/cli/io.ts`: `export interface Io { out(text: string): void; err(text: string): void; readonly isTTY: boolean; confirm(question: string): Promise<boolean> }`; `export const ansi: { reset; bold; cyan; green; yellow; red; dim }` com os mesmos códigos de `bin/cli.js:8-14`; `export function nodeIo(): Io` (`out` = `console.log`, `err` = `console.error`, `isTTY` = `Boolean(process.stdin.isTTY)`, `confirm` = readline com a normalização `s|sim|y|yes`, devolve `false` sem TTY); `export function memoryIo(opts?: { isTTY?: boolean; answers?: boolean[] }): Io & { stdout: string[]; stderr: string[] }`.

- [ ] **Passo 1: Instalar toolchain e configurar**

Run: `npm i -D typescript tsdown`
`tsconfig.json`: `{"compilerOptions": {"target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext", "strict": true, "noEmit": true, "types": ["node"], "skipLibCheck": true, "esModuleInterop": true, "verbatimModuleSyntax": true}, "include": ["src", "test", "vitest.config.ts"]}`.
Script: `"typecheck": "tsc --noEmit"`. Em `ci.yml`, inserir `- run: npm run typecheck` antes de `npm test`.
`git mv bin/cli.js bin/cli.cjs`; em `package.json`: `"type": "module"`, `"main": "bin/cli.cjs"`, `"bin": { "salus-ai": "bin/cli.cjs" }`. Motivo: `manifest.ts` usa `import.meta.url`, que o `NodeNext` só aceita em arquivos ESM, e o pacote precisa ser `"type": "module"` para os `.ts` contarem como ESM; o CLI antigo continua CommonJS pela extensão `.cjs`. Imports entre arquivos `.ts` usam sufixo `.js` (regra do `NodeNext`). Em `test/helpers/cli.ts`, o default de `CLI_PATH` passa a `bin/cli.cjs`; em `CONTRIBUTING.md`, trocar `bin/cli.js` por `bin/cli.cjs`.

- [ ] **Passo 2: Escrever os testes unitários (falhando)**

`test/unit/manifest.test.ts`:
  - `packageRoot aponta para a raiz do repositório`: `packageRoot() === REPO_ROOT` (normalizar com `path.resolve`).
  - `frameworkRoot contém o AGENTS.md do produto`: `existsSync(path.join(frameworkRoot(), 'AGENTS.md'))`.
  - `packageVersion bate com o package.json`.
  - `listas iguais às do CLI atual`: `INIT_ITEMS` deep-equal às 9 entradas; `UPDATE_ITEMS` às 3; `PROFILE_REQUIRED_FILES` às 5.
`test/unit/detect.test.ts` (pastas temporárias de `makeTempRoot`):
  - vazia → `isAlreadyInitialized === false`, `looksLikeSalus === false`, `findInitCollisions` deep-equal `[]`.
  - com `AGENTS.md` contendo a sentinela → `isAlreadyInitialized === false`, `looksLikeSalus === true`, colisões `['AGENTS.md']`.
  - com `AGENTS.md` sem sentinela → `isAlreadyInitialized === true`.
  - com `Familia/_index.yaml` e sem `AGENTS.md` → `isAlreadyInitialized === true`.
  - com só `.agents/` → `looksLikeSalus === true`.
`test/unit/fs.test.ts`:
  - copia árvore com subpasta e cria pais inexistentes; ignora `.DS_Store` e `Thumbs.db`; `src` inexistente não lança nem cria `dest`.
`test/unit/io.test.ts`:
  - `memoryIo` acumula `out`/`err`; `confirm` consome `answers` em ordem e devolve `false` quando acabam; `memoryIo().isTTY === false` por padrão e `memoryIo({isTTY: true}).isTTY === true`; `nodeIo()` devolve um objeto com `out`, `err`, `confirm` funções e `isTTY` booleano (não afirmar o valor: depende de como o runner foi invocado).

Run: `npm test`
Expected: FAIL com módulos não encontrados (a caracterização continua verde contra `bin/cli.cjs`).

- [ ] **Passo 3: Implementar os quatro módulos** com as assinaturas do bloco Interfaces, copiando a lógica de `bin/cli.cjs` (não "melhorar").

- [ ] **Passo 4: Trocar as constantes duplicadas em `test/helpers/vault.ts`** por imports de `src/core/framework/manifest.ts`.

- [ ] **Passo 5: Verificar**

Run: `npm run typecheck && npm test`
Expected: sem erros de tipo; unitários e caracterização verdes.

- [ ] **Passo 6: Commit**

```bash
git add -A
git commit -m "refactor: toolchain TypeScript e modulos puros do framework (manifest, fs, detect, io)"
```

---

### Task 6: Portar `init`, `update`, `doctor` e trocar o binário para `dist/cli.js`

**Files:**
- Create: `src/core/framework/init.ts`, `src/core/framework/update.ts`, `src/core/framework/doctor.ts`, `src/cli/help.ts`, `src/cli/main.ts`, `src/cli/bin.ts`, `tsdown.config.ts`
- Create: `test/unit/main.test.ts`, `test/unit/dist.test.ts`
- Modify: `package.json` (`bin`, `main`, `files`, `engines`, scripts `build`/`pretest`/`prepack`), `test/helpers/cli.ts` (default de `CLI_PATH`), `CHANGELOG.md` (seção `[Não publicado]`), `CONTRIBUTING.md` (menções a `bin/cli.cjs`)
- Delete: `bin/cli.cjs`

**Interfaces:**
- Consumes: tudo da Tarefa 5.
- Produces:
  - `src/core/framework/init.ts`: `export async function init(opts: { cwd: string; targetDirName?: string; force: boolean; io: Io }): Promise<number>` — devolve o código de saída (0/1) em vez de chamar `process.exit`; mesma ordem de efeitos de `bin/cli.js:158-223` (inclusive criar a pasta de destino antes da checagem de colisões).
  - `src/core/framework/update.ts`: `export function update(opts: { cwd: string; targetDirName?: string; io: Io }): number`.
  - `src/core/framework/doctor.ts`: `export function doctor(opts: { cwd: string; targetDirName?: string; io: Io }): number` (1 só se a pasta não existe; 0 nos demais casos, mesmo com alertas).
  - `src/cli/help.ts`: `export function helpText(version: string): string` (texto literal de `bin/cli.js:60-82`).
  - `src/cli/main.ts`: `export async function main(argv: string[], io: Io, cwd: string = process.cwd()): Promise<number>` — parse idêntico a `bin/cli.js:53-57` e despacho idêntico a `bin/cli.js:384-405`; `--force`/`-f` só têm efeito em `init`.
  - `src/cli/bin.ts`: primeira linha `#!/usr/bin/env node`; `process.exitCode = await main(process.argv.slice(2), nodeIo())`.

- [ ] **Passo 1: Testes unitários de `main` (falhando)** — `test/unit/main.test.ts` com `memoryIo()` e `cwd` temporário:
  - `['--version']` → devolve 0 e `stdout[0] === 'v' + packageVersion()`.
  - `[]` → 0 e `stdout.join('\n')` contém `USO:`.
  - `['--froce']` → 1 e `stderr.join('\n')` contém `Opção desconhecida`.
  - `['foo']` → 1 e `stdout.join('\n')` contém `Comando desconhecido`.
  - `['init', 'Nova']` com `cwd = tmp` → 0 e `tmp/Nova/AGENTS.md` existe.
  - `['init', 'Nova']` de novo com `memoryIo({isTTY: false})` → 1, nada alterado.
  - `['init', 'Nova']` com `memoryIo({isTTY: true, answers: [true]})` → 0 (confirmação aceita sobrescreve).
  - `['init', 'Nova']` com `memoryIo({isTTY: true, answers: [false]})` → 1 e `stdout` contém `Operação cancelada`.
  - `['update', 'Nova']` → 0; `['doctor', 'Nova']` → 0 e `stdout` contém `Salus Doctor`.

- [ ] **Passo 2: Teste do artefato empacotado (falhando)** — `test/unit/dist.test.ts`: `dist/cli.js` existe; sua primeira linha é exatamente `#!/usr/bin/env node`; o arquivo não contém a string `node_modules/` (nenhuma dependência externa vazou para o bundle).

Run: `npm test`
Expected: FAIL (módulos e `dist/` inexistentes).

- [ ] **Passo 3: Implementar `init.ts`, `update.ts`, `doctor.ts`, `help.ts`, `main.ts`, `bin.ts`** copiando os textos de `bin/cli.cjs` **literalmente** (emoji, acentos, espaços). Única mudança estrutural: `process.exit(n)` vira `return n`, `console.log` vira `io.out`, `console.error` vira `io.err`, `askConfirmation` vira `io.confirm`, `path.join(__dirname, '..', 'framework')` vira `frameworkRoot()`, `VERSION` vira `packageVersion()`.

- [ ] **Passo 4: Configurar o bundle e trocar o binário**

`tsdown.config.ts`: `export default defineConfig({ entry: { cli: 'src/cli/bin.ts' }, format: 'esm', platform: 'node', target: 'node20', outDir: 'dist', clean: true, dts: false })`. Se o `dist/cli.js` gerado não começar com o shebang, acrescentar `banner: { js: '#!/usr/bin/env node' }` e remover a linha do `bin.ts`.
`package.json`: `"bin": { "salus-ai": "dist/cli.js" }`; remover `"main"`; `"files": ["dist", "framework"]`; `"engines": { "node": ">=20" }`; scripts `"build": "tsdown"`, `"pretest": "npm run build"`, `"prepack": "npm run build"` (garante `dist/` em qualquer `npm pack`/`npm publish`).
`test/helpers/cli.ts`: default de `CLI_PATH` passa a `path.join(REPO_ROOT, 'dist', 'cli.js')`.
`git rm bin/cli.cjs`; em `CONTRIBUTING.md`, trocar `bin/cli.cjs` por `src/` + `dist/cli.js` (a Tarefa 7 completa a tabela).
`npm test` já executa `pretest` (build) antes do `vitest run`, então `test/unit/dist.test.ts` encontra o artefato.

- [ ] **Passo 5: Verificar paridade**

Run: `npm run typecheck && npm test && bash scripts/check-docs.sh && node dist/cli.js --version && npm pack --dry-run`
Expected: tudo verde; `--version` imprime `v0.4.0`; o `pack` lista `dist/cli.js`, `framework/**`, `README.md`, `LICENSE`, `package.json` e nada de `bin/`, `src/`, `test/`.

- [ ] **Passo 6: Registrar no `CHANGELOG.md`** uma seção `## [Não publicado]` com, em "Alterado": "CLI reescrito em TypeScript e empacotado em `dist/cli.js` (comportamento idêntico, coberto por testes)"; "Node mínimo passa a 20"; "`require('salus-ai')` não executa mais o CLI (use `npx salus-ai`)"; em "Interno": "produto movido para `framework/`; CI em Linux e Windows; publicação só por tag".

- [ ] **Passo 7: Commit**

```bash
git add -A
git commit -m "refactor: CLI portado para TypeScript (dist/cli.js) com paridade de comportamento (DT-04 parcial)"
```

---

### Task 7: Fechar a fase (STATUS, CONTRIBUTING, README)

**Files:**
- Modify: `STATUS.md`, `CONTRIBUTING.md`, `README.md`

- [ ] **Passo 1: `STATUS.md`** — "Visão Geral": classificação continua T1; porta de verificação = `npm run typecheck && npm test && bash scripts/check-docs.sh` + CI. "Concluído": Fase 0 (link para este plano) com a data. "Adiados": DT-01 e DT-03 saem (concluídos); DT-04 fica só com "`doctor` sair ≠ 0 com alertas; Caixa ignorar subpastas; sentinela explícita" → `Alocação: → Fase 1 (doctor novo)`; DT-02 → `Alocação: → Fase 1 (framework/ em código)`; DT-05 a DT-08 → `Alocação: → Fase 1 (formato v2)`. "Onde retomar": "Fase 1 — escrever `docs/superpowers/plans/2026-MM-DD-fase-1-nucleo.md` com `superpowers:writing-plans`, começando por `salus-ai inspecionar`/`anonimizar`". "Fora da porta": remover "YAML do índice sem parser" só quando a Fase 1 entregar o parser (manter por ora).

- [ ] **Passo 2: `CONTRIBUTING.md`** — tabela "O que é o quê": `src/cli/` (entrada e despacho), `src/core/framework/` (init/update/doctor e utilitários), `dist/` (gerado pelo `npm run build`; não commitar), `test/` (unitários em `test/unit`, caracterização em `test/cli`, helpers). "Antes de dizer pronto": `npm run typecheck`, `npm test`, `bash scripts/check-docs.sh`. "Estilo": acrescentar "TypeScript estrito, ESM, imports com sufixo `.js`; sem dependências de runtime sem ADR".

- [ ] **Passo 3: `README.md`** — na linha 17, `é necessário ter o **Node.js** instalado` passa a `é necessário ter o **Node.js 20 ou mais recente** instalado`; a linha 18 (link para nodejs.org) fica como está.

- [ ] **Passo 4: Verificar**

Run: `npm run typecheck && npm test && bash scripts/check-docs.sh`
Expected: tudo verde.

- [ ] **Passo 5: Commit**

```bash
git add STATUS.md CONTRIBUTING.md README.md
git commit -m "docs: fecha a Fase 0 (fundacao de engenharia)"
```

---

## Verificação final da fase (antes de declarar concluída)

1. `git status` limpo; `git log --oneline` mostra os 7 commits desta fase acima de `130602f`.
2. `npm run typecheck && npm test && bash scripts/check-docs.sh` verdes localmente no Windows (ambiente do dono).
3. `npm pack --dry-run` lista só `dist/cli.js`, `framework/**`, `README.md`, `LICENSE`, `package.json`.
4. Em uma pasta temporária fora do repo: `npm pack` → `npm i <tgz>` → `npx salus-ai init "Minha Saúde"` → `npx salus-ai doctor "Minha Saúde"` funcionam (é o que a CI fará).
5. Pedir ao dono autorização para `git push origin main` — isso dispara **só a CI** (`ci.yml`); confirmar os 6 jobs verdes no GitHub. Nenhuma tag nesta fase.

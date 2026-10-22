# STATUS — Estado Atual do Projeto

> Leia antes de qualquer ação de desenvolvimento. Atualize ao fim de toda sessão, mesmo interrompida.
> Retrato, não diário: "concluído" antigo vai para o `CHANGELOG.md`.

## Visão Geral

- Projeto: **Salus** (framework Markdown/YAML + CLI `salus-ai`) · Classificação project-standards: **T1** (CLI/script + framework documental) · Última atualização: 2026-10-22 (Claude Code)
- Regras de desenvolvimento vivem **aqui** e em `CONTRIBUTING.md`. `framework/AGENTS.md`, `framework/CLAUDE.md`, `framework/GEMINI.md`, `framework/CODEX.md` e `framework/.cursorrules` são **artefatos do produto** (stubs copiados para o usuário final) — não coloque regras de dev neles. Os `AGENTS.md`/`CLAUDE.md` da **raiz** são as instruções de desenvolvimento deste repositório.
- Porta de verificação atual: `npm run typecheck && npm test && bash scripts/check-docs.sh` (tipos; testes unitários e de caracterização do CLI; consistência das docs, com proveta conferida em 2026-10-20, incluindo que todo comando citado no README existe na ajuda do CLI) + CI (`.github/workflows/ci.yml`, ubuntu+windows, Node 22 e 24). Só a tag `vX.Y.Z` publica no npm (`.github/workflows/publish.yml`, que chama a CI completa antes de publicar); push na `main` não publica mais.

## Concluído (último marco)

- [x] Fase 1A — formato v2 e leitura (plano `docs/superpowers/plans/2026-10-21-fase-1a-leitura.md`) — 2026-10-22 — especificação do formato (`framework/Frameworks/FORMATO.md`), schema e codecs com escrita byte-idêntica quando nada muda, `Vault.abrir` (só leitura, problemas por arquivo), consultas (`membros`, `perfil`, `agenda`, `buscar`, `marcador`) com `--json` no CLI, `inspecionar` e `anonimizar`, bibliotecas de runtime inlinadas no bundle (ADR-0008), mais a onda de correção da revisão final (chave única de `estados`, códigos de problema separados, `argumento_extra`, `inspecionar` só com títulos e nomes do formato); 814 testes em 28 arquivos; `dist/cli.js` com 1 062 359 bytes (1,06 MB, limite de 2 MB); concluída neste branch (`worktree-fase-1-nucleo`), sem push
- [x] Fase 0 — fundação de engenharia (plano `docs/superpowers/plans/2026-10-21-fase-0-fundacao.md`) — 2026-10-21 — testes Vitest (33 de caracterização + 70 unitários), CI em Linux e Windows (Node 22 e 24), publicação só por tag com provenance, produto separado em `framework/` e CLI portado para TypeScript (`src/` → `dist/cli.js`) com comportamento idêntico (DT-01, DT-03 e a parte de módulos do DT-04), workflows novos ainda não executados no GitHub; concluída neste branch (`worktree-fase-0-fundacao`), aguardando revisão final e merge pelo dono — modelos usados: Claude Sonnet 5.5 e Claude Opus 5.5
- [x] 0.4.0 publicada no npm em 2026-10-21 (pelo workflow antigo de push na `main`; run do Actions verde; `npm view salus-ai version` = 0.4.0)
- [x] v0.4.0 commitada como baseline (`61f3bad`) — 2026-10-20 — modelo usado: Claude Fable 5.1 · xhigh
- [x] Auditoria completa + correções rápidas — 2026-10-20 — relatório em `docs/auditoria/2026-10-20_auditoria.md` — modelo usado: Claude Fable 5.1 · xhigh

## Em andamento

- [~] Nada em aberto: as Fases 0 e 1A estão concluídas (ver "Onde retomar"). O push na `main` **não publica mais**: só a tag `vX.Y.Z` publica (ver `CONTRIBUTING.md`, seção "Release").

## Aguardando aprovação

- ⏸ Revisão final e merge da Fase 0 (PR #1, branch `worktree-fase-0-fundacao`) pelo dono. Qualquer push, tag ou publish continua exigindo pedido explícito do dono.
- ⏸ **Fixture local do cofre real (pede o dono, antes da Fase 1B):** faça uma **cópia** do seu cofre real, fora do repositório, e rode no PowerShell `npx salus-ai anonimizar "<cópia do cofre>" "<pasta nova>"` (se o PowerShell bloquear scripts, use `npx.cmd`). **Revise o resultado antes de usá-lo:** o `anonimizar` não pega nomes de pessoas sem perfil (médicos, parentes) quando aparecem em títulos, colunas genéricas da tabela, valores do YAML ou nomes de arquivo, datas em outros formatos (como "10 de março de 2026"), lugares (fora das colunas de laboratório e clínica) nem telefones em formatos incomuns; o conteúdo clínico fica de propósito. Depois de revisar, coloque a pasta em `test/fixtures/local/` (ignorada pelo git). A 1B e a 1C só começam a migração com ela.
- ⏸ Revisão da Fase 1A (branch `worktree-fase-1-nucleo`) e do texto proposto para o `framework/COMECE_AQUI.md` (convite para testar a migração com `anonimizar`), que ainda não foi aplicado.
- ⏸ **Antes da primeira tag:** cadastrar o Trusted Publisher no npmjs.com (*salus-ai → Settings → Trusted Publisher → GitHub Actions*: usuário `alberthpalhares`, repositório `salus`, workflow `publish.yml`, environment em branco) e remover o secret `NPM_TOKEN` do GitHub. Sem isso, `npm publish` falha por falta de credencial (nada é publicado).

## Adiados (todo item com destino grepável)

| ID | Item | Motivo de adiar | Alocação |
|----|------|-----------------|----------|
| DT-02 | `update` apagar e recopiar `.agents/skills/` e `Frameworks/` (skills órfãs) e gravar versão instalada | Muda o comportamento do `update`; a Fase 0 foi só paridade | Alocação: → Fase 1 (framework/ em código) |
| DT-04 | `doctor` sair ≠ 0 com alertas; `doctor` tolerar links quebrados em `Perfis/` e na Caixa; Caixa ignorar subpastas; sentinela explícita para `isAlreadyInitialized` | Muda o comportamento observável do CLI; a Fase 0 foi só paridade | Alocação: → Fase 1 (doctor novo) |
| DT-05 | Cérebro atualizável: bloco da família entre marcadores em `AGENTS.md`; `update` regenera o resto; migração 0.4 → 0.5 | Muda formato do arquivo do usuário | Alocação: → Fase 1 (formato v2) |
| DT-06 | `pais: [id, id]` e `tutores: [id]` no índice; cruzamento genético por linhagem; `vinculo` vira só flag de privacidade | Muda formato do índice (mesma migração do DT-05) | Alocação: → Fase 1 (formato v2) |
| DT-07 | Índice por membro (`Familia/index/<id>.yaml`) para minimizar dados enviados ao provedor | Muda formato do índice | Alocação: → Fase 1 (formato v2) |
| DT-08 | Separar `dose` de `frequencia` no índice; remover `CODEX.md` (Codex lê `AGENTS.md`) | Cosmético; junto da migração | Alocação: → Fase 1 (formato v2) |

## Onde retomar

Fases 0 e 1A concluídas (aguardando revisão e merge pelo dono). Próxima: Fase 1B — comandos, ChangeSet, views, sync, vigia e doctor v2, com plano próprio em `docs/superpowers/plans/<data>-fase-1b-*.md` (`superpowers:writing-plans`). Antes, o dono roda `salus-ai anonimizar` numa cópia do cofre real e coloca o resultado, revisado, em `test/fixtures/local/` (ver "Aguardando aprovação").

## Fora da porta de verificação

- Comportamento das skills dentro de um assistente real (só revisão de texto e checagem cruzada de campos/caminhos).
- Execução real dos workflows (validados só por parse do YAML e pelos mesmos comandos rodados localmente): a 0.4.0 foi publicada pelo `publish.yml` antigo (push na `main`). `ci.yml` rodou pela primeira vez no PR #1 (2026-10-21, 4 jobs verdes). O novo `publish.yml` (só tag; trusted publishing sem token) nunca rodou: depende de tag autorizada pelo dono e do Trusted Publisher cadastrado no npmjs.com.
- YAML do índice (sem parser disponível; validado por leitura).

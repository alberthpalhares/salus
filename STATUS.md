# STATUS — Estado Atual do Projeto

> Leia antes de qualquer ação de desenvolvimento. Atualize ao fim de toda sessão, mesmo interrompida.
> Retrato, não diário: "concluído" antigo vai para o `CHANGELOG.md`.

## Visão Geral

- Projeto: **Salus** (framework Markdown/YAML + CLI `salus-ai`) · Classificação project-standards: **T1** (CLI/script + framework documental) · Última atualização: 2026-10-21 (Claude Code)
- Regras de desenvolvimento vivem **aqui** e em `CONTRIBUTING.md`. `framework/AGENTS.md`, `framework/CLAUDE.md`, `framework/GEMINI.md`, `framework/CODEX.md` e `framework/.cursorrules` são **artefatos do produto** (stubs copiados para o usuário final) — não coloque regras de dev neles. Os `AGENTS.md`/`CLAUDE.md` da **raiz** são as instruções de desenvolvimento deste repositório.
- Porta de verificação atual: `npm test` (suíte de caracterização do CLI) + `bash scripts/check-docs.sh` (consistência das docs, com proveta conferida em 2026-10-20) + CI (`.github/workflows/ci.yml`, ubuntu+windows, Node 22 e 24). Só a tag `vX.Y.Z` publica no npm (`.github/workflows/publish.yml`); push na `main` não publica mais.

## Concluído (último marco)

- [x] DT-03 — CI por PR/push em Linux e Windows (`ci.yml`) e publicação só por tag `v*`, com provenance (`publish.yml`) — 2026-10-21 — workflows validados só por parse do YAML; rodam no GitHub no primeiro push/tag autorizado pelo dono — modelo usado: Claude Sonnet 5.5
- [x] DT-01 — suíte de caracterização do `bin/cli.js` (Vitest, 33 testes em `test/`) e `npm test` como porta única — 2026-10-21 (`89a3bcf`, `fc603a7`) — modelo usado: Claude Sonnet 5.5
- [x] v0.4.0 commitada como baseline (`61f3bad`) — 2026-10-20 — modelo usado: Claude Fable 5.1 · xhigh
- [x] Auditoria completa + correções rápidas — 2026-10-20 — relatório em `docs/auditoria/2026-10-20_auditoria.md` — modelo usado: Claude Fable 5.1 · xhigh

## Em andamento

- [~] Nada em aberto fora da Fase 0 (ver "Onde retomar"). O push na `main` **não publica mais**: só a tag `vX.Y.Z` publica (ver `CONTRIBUTING.md`, seção "Release").

## Aguardando aprovação

- ⏸ Nada. A 0.4.0 foi publicada em 2026-10-21. Qualquer push, tag ou publish continua exigindo pedido explícito do dono.

## Adiados (todo item com destino grepável)

| ID | Item | Motivo de adiar | Alocação |
|----|------|-----------------|----------|
| DT-02 | `update` apagar e recopiar `.agents/skills/` e `Frameworks/` (skills órfãs) e gravar versão instalada | Apagar pastas sem teste é arriscado | Alocação: → rodada testes/CI |
| DT-04 | `bin/cli.js` (~400 linhas com brancos, acima do alvo de 200) → `lib/`; `doctor` sair ≠ 0 com alertas; ignorar subpastas e links quebrados na Caixa; `isAlreadyInitialized` por marcador explícito | Refatorar sem teste de caracterização | Alocação: → rodada testes/CI |
| DT-05 | Cérebro atualizável: bloco da família entre marcadores em `AGENTS.md`; `update` regenera o resto; migração 0.4 → 0.5 | Muda formato do arquivo do usuário | Alocação: → v0.5.0 |
| DT-06 | `pais: [id, id]` e `tutores: [id]` no índice; cruzamento genético por linhagem; `vinculo` vira só flag de privacidade | Muda formato do índice (mesma migração do DT-05) | Alocação: → v0.5.0 |
| DT-07 | Índice por membro (`Familia/index/<id>.yaml`) para minimizar dados enviados ao provedor | Muda formato do índice | Alocação: → v0.5.0 |
| DT-08 | Separar `dose` de `frequencia` no índice; remover `CODEX.md` (Codex lê `AGENTS.md`) | Cosmético; junto da migração | Alocação: → v0.5.0 |

## Onde retomar

Fase 0 em execução (plano `docs/superpowers/plans/2026-10-21-fase-0-fundacao.md`): Tarefas 1–3 concluídas; próxima: Tarefa 4 (mover o produto para `framework/`).

## Fora da porta de verificação

- Comportamento das skills dentro de um assistente real (só revisão de texto e checagem cruzada de campos/caminhos).
- Execução real dos workflows `ci.yml` e `publish.yml` (incluindo `--provenance`): validados só por parse do YAML e pelos mesmos comandos rodados localmente; a primeira execução no GitHub depende de push/tag autorizado pelo dono.
- YAML do índice (sem parser disponível; validado por leitura).

# STATUS — Estado Atual do Projeto

> Leia antes de qualquer ação de desenvolvimento. Atualize ao fim de toda sessão, mesmo interrompida.
> Retrato, não diário: "concluído" antigo vai para o `CHANGELOG.md`.

## Visão Geral

- Projeto: **Salus** (framework Markdown/YAML + CLI `salus-ai`) · Classificação project-standards: **T1** (CLI/script + framework documental) · Última atualização: 2026-10-20 (Claude Code)
- Regras de desenvolvimento vivem **aqui** e em `CONTRIBUTING.md`. `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `CODEX.md` e `.cursorrules` da raiz são **artefatos do produto** (stubs que vão para o usuário final) — não coloque regras de dev neles.
- Porta de verificação atual (provisória): `bash scripts/check-docs.sh` (consistência das docs, com proveta conferida em 2026-10-20) + smoke test do CLI em `.github/workflows/publish.yml` + roteiro manual em `CONTRIBUTING.md`. A porta definitiva (`npm test`) é o DT-01.

## Concluído (último marco)

- [x] v0.4.0 commitada como baseline (`61f3bad`) — 2026-10-20 — modelo usado: Claude Fable 5.1 · xhigh
- [x] Auditoria completa + correções rápidas — 2026-10-20 — relatório em `docs/auditoria/2026-10-20_auditoria.md` — modelo usado: Claude Fable 5.1 · xhigh

## Em andamento

- [~] Nada em aberto. A v0.4.0 (com as correções da auditoria) está pronta para `git push` — **o push na `main` publica no npm**.

## Aguardando aprovação

- ⏸ `git push` da v0.4.0. O que o dono confere antes: a seção "Para onde vão seus dados" em `COMECE_AQUI.md` e `README.md`; a remoção dos aliases de bin `salus` e `salus-framework` (quebra só quem instalou global e usa esses nomes); a tabela de compatibilidade do `README.md`.

## Adiados (todo item com destino grepável)

| ID | Item | Motivo de adiar | Alocação |
|----|------|-----------------|----------|
| DT-01 | Suíte `test/cli.test.js` com `node:test` (init, init repetido sem TTY, `--force`, update preservando dados, update em pasta não-Salus, doctor, flag desconhecida, `--version`) + `npm test` como porta única | T1 exige; ficou fora do escopo "correções rápidas" | Alocação: → rodada testes/CI — primeiro item da próxima sessão |
| DT-02 | `update` apagar e recopiar `.agents/skills/` e `Frameworks/` (skills órfãs) e gravar versão instalada | Apagar pastas sem teste é arriscado | Alocação: → rodada testes/CI |
| DT-03 | Provenance npm (`--provenance` + `id-token: write`) e disparo por tag `v*` | Precisa de push real para validar | Alocação: → rodada testes/CI |
| DT-04 | `bin/cli.js` (~400 linhas com brancos, acima do alvo de 200) → `lib/`; `doctor` sair ≠ 0 com alertas; ignorar subpastas e links quebrados na Caixa; `isAlreadyInitialized` por marcador explícito | Refatorar sem teste de caracterização | Alocação: → rodada testes/CI |
| DT-05 | Cérebro atualizável: bloco da família entre marcadores em `AGENTS.md`; `update` regenera o resto; migração 0.4 → 0.5 | Muda formato do arquivo do usuário | Alocação: → v0.5.0 |
| DT-06 | `pais: [id, id]` e `tutores: [id]` no índice; cruzamento genético por linhagem; `vinculo` vira só flag de privacidade | Muda formato do índice (mesma migração do DT-05) | Alocação: → v0.5.0 |
| DT-07 | Índice por membro (`Familia/index/<id>.yaml`) para minimizar dados enviados ao provedor | Muda formato do índice | Alocação: → v0.5.0 |
| DT-08 | Separar `dose` de `frequencia` no índice; remover `CODEX.md` (Codex lê `AGENTS.md`) | Cosmético; junto da migração | Alocação: → v0.5.0 |

## Onde retomar

Próxima sessão: **DT-01**. Começar por `test/cli.test.js` reproduzindo os 30 cenários do roteiro em `docs/auditoria/2026-10-20_auditoria.md` (seção "Verificação executada"), depois `"test": "node --test"` no `package.json` e o mesmo comando no workflow antes do publish.

## Fora da porta de verificação

- Comportamento das skills dentro de um assistente real (só revisão de texto e checagem cruzada de campos/caminhos).
- Publicação real no npm e o smoke step do workflow (validados só com `npm pack --dry-run` e execução local do mesmo roteiro).
- YAML do índice (sem parser disponível; validado por leitura).

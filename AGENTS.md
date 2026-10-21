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

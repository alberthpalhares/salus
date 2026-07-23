---
name: salus-revisao
description: "Revisão periódica do Salus: percorre cada perfil checando vacinas, check-ups e receitas vencendo, e confirma se as Fichas ainda refletem a realidade. Acione com: 'revisar salus', 'revisão de saúde' ou quando o raio-x avisar que a data de revisão se aproxima."
---

# Skill: Salus — Revisão

Conduz uma revisão estruturada e rápida do Salus, para manter as Fichas atualizadas e não deixar vacinas/check-ups passarem batido.

## Quando Acionar

- `Familia/META.md` contém a data do onboarding e a data sugerida de revisão.
- Se a data já passou ou está próxima (< 2 semanas), sugira proativamente.
- O usuário também pode acionar manualmente a qualquer momento.

## Filosofia

> Não é refazer o onboarding. É uma conversa de alguns minutos por membro para conferir o que mudou.

## Fluxo

### Preparação
1. Leia `Familia/META.md` para saber os membros e a data da última revisão.
2. Leia a `Ficha.md` de cada membro.

### Para cada membro

1. Mostre um resumo curto: condições ativas, medicamentos em uso, próxima vacina/reforço.
2. Pergunte: *"Isso ainda está certo? Mudou algo desde a última vez?"*
3. Se mudou, atualize a `Ficha.md` e registre o evento em `Historico.md`.
4. Se uma vacina/check-up estiver vencido ou perto de vencer, avise e pergunte se já foi agendado.

### Fechamento

1. Atualize `Última revisão` e `Próxima revisão sugerida` (data + 6 meses) em `Familia/META.md`.
2. Se as datas de revisão estiverem mencionadas nos arquivos de system prompt (`CLAUDE.md`, `GEMINI.md`, etc.) via `{{DATA_REVISAO}}` já preenchida, atualize-as também.
3. Mostre um resumo do que foi alterado.

## Regras
- Nunca apague informação sem confirmar com o usuário.
- Seja rápido — se nada mudou num perfil, siga em 10 segundos.
- Caminhos sempre relativos à raiz do workspace.

---
name: salus-revisao
description: "Revisão periódica do Salus: percorre cada perfil checando vacinas, check-ups e receitas vencendo, e confirma se as Fichas ainda refletem a realidade. Acione com: 'revisar salus', 'revisão de saúde' ou quando o raio-x avisar que a data de revisão se aproxima."
---

# Skill: Salus — Revisão

Conduz uma revisao estruturada e rapida do Salus, para manter as Fichas e Medicamentos atualizados.

## Quando Acionar

- `Familia/META.md` contem a data do onboarding e a data sugerida de revisao.
- Se a data ja passou ou esta proxima (< 2 semanas), sugira proativamente.
- O usuario tambem pode acionar manualmente a qualquer momento.

## Fluxo

### Preparacao
1. Leia `Familia/META.md` para saber os membros e a data da ultima revisao.
2. Leia a `Ficha.md` e `Medicamentos.md` de cada membro.

### Para cada membro

1. Mostre um resumo curto: condicoes ativas, medicamentos em uso, receitas a renovar, proxima vacina/reforco.
2. Pergunte: *"Isso ainda esta certo? Mudou algo desde a ultima vez?"*
3. Se mudou algo em medicamentos, pergunte se o medicamento ja foi comprado/iniciado antes de alterar para `Em uso`.
4. Se uma vacina, check-up ou receita estiver vencida ou perto de vencer, avise.
5. **Com autorizacao do usuario**, atualize a `Ficha.md`, `Medicamentos.md` e registre o evento em `Historico.md`.

### Fechamento e Versionamento

1. Atualize `Ultima revisao` e `Proxima revisao sugerida` (data + 6 meses) em `Familia/META.md`.
2. Mostre um resumo das alteracoes realizadas.
3. **Ofereca versionamento Git:**
   > *"Atualizei os perfis do Salus. Quer que eu faca um commit no Git para salvar este ponto de revisao?"*
   - Se sim: `git add . && git commit -m "salus: revisao periodica de saude da familia"`

## Regras
- Nunca apague ou altere informacao sem autorizacao explicita do usuario.
- Seja rapido — se nada mudou num perfil, siga adiante.

---
name: salus-revisao
description: "Revisão periódica do Salus: percorre cada perfil checando vacinas, check-ups e receitas vencendo, e confirma se as Fichas ainda refletem a realidade. Acione com: 'revisar salus', 'revisão de saúde' ou quando o raio-x avisar que a data de revisão se aproxima."
---

# Skill: Salus — Revisão

Conduz uma revisao estruturada e rapida do Salus, para manter o `_index.yaml`, as Fichas e Medicamentos atualizados, e para gerar alertas proativos.

## Quando Acionar

- `Familia/META.md` contem a data do onboarding e a data sugerida de revisao.
- Se a data ja passou ou esta proxima (< 2 semanas), sugira proativamente.
- O usuario tambem pode acionar manualmente a qualquer momento.

## Fluxo

### Preparacao
1. Leia `Familia/_index.yaml` para saber os membros, vínculos, medicamentos, vacinas e marcadores-chave já registrados.
2. Leia `Familia/META.md` para a data da ultima revisao.
3. Abra `Ficha.md`, `Medicamentos.md` e `Exames.md` de cada membro **apenas para confirmar/completar** o que o índice já resume — não para reler tudo do zero.

### Para cada membro

1. Mostre um resumo curto (a partir do índice): condicoes ativas, medicamentos em uso, receitas a renovar, proxima vacina/reforco.
2. Pergunte: *"Isso ainda esta certo? Mudou algo desde a ultima vez?"*
3. Se mudou algo em medicamentos, pergunte se o medicamento ja foi comprado/iniciado antes de alterar para `Em uso`.
4. Se uma vacina, check-up ou receita estiver vencida ou perto de vencer, avise.
5. **Verifique tendência de marcadores-chave:** se um marcador em `marcadores_chave` tiver piorado (mesma direção) nos últimos 3 registros de `Exames.md`, mencione isso de forma calma e factual, seguindo o `Frameworks/PROTOCOLO_CLINICO.md` (sem alarme, sugerindo levar ao profissional).
6. **Com autorizacao do usuario**, atualize `Ficha.md`, `Medicamentos.md`, `Familia/_index.yaml` (mesmos campos) e registre o evento em `Historico.md`.

### Fechamento

1. Atualize `Ultima revisao` e `Proxima revisao sugerida` (data + 6 meses) em `Familia/META.md` e em `Familia/_index.yaml` (`atualizado_em`).
2. **Regere `Familia/Agenda.md`** a partir dos dados atualizados do índice: liste vencidos, vencendo em 30 dias, vencendo em 31-90 dias, e sem data definida — por membro, ordenado por data.
3. Mostre um resumo das alteracoes realizadas e o conteúdo novo da Agenda.

## Regras
- Nunca apague ou altere informacao sem autorizacao explicita do usuario.
- Seja rapido — se nada mudou num perfil, siga adiante.
- A regeneração do `Agenda.md` não precisa de confirmação (é uma view derivada, não um dado clínico novo) — mas qualquer alteração em `Ficha.md`, `Medicamentos.md` ou `_index.yaml` precisa.

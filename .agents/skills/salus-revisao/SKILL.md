---
name: salus-revisao
description: "Revisão periódica do Salus: percorre cada perfil checando vacinas, antiparasitários, check-ups, receitas vencendo e tratamentos temporários já encerrados, e confirma se as Fichas ainda refletem a realidade. Acione com: 'revisar salus', 'revisão de saúde' ou quando o raio-x avisar que a data de revisão se aproxima."
---

# Skill: Salus — Revisão

Conduz uma revisão estruturada e rápida do Salus para manter `Familia/_index.yaml`, as Fichas, Medicamentos e views derivadas (`Agenda.md` e `Medicamentos_Ativos.md`) 100% atualizados e gerar alertas proativos.

## Quando Acionar

- `Familia/META.md` contém a data do onboarding, a data da última revisão e a próxima revisão sugerida.
- Se a data já passou ou está próxima (< 2 semanas), sugira proativamente.
- O usuário também pode acionar manualmente a qualquer momento.

## Fluxo

### Preparação
1. Leia `Familia/_index.yaml` para carregar membros, vínculos, alergias, condições, medicamentos (`renova_em` e `termino_em`), vacinas, antiparasitários e marcadores-chave já registrados.
2. Leia `Familia/META.md` para verificar a data da última revisão.
3. Abra `Ficha.md`, `Medicamentos.md` e `Exames.md` de cada membro **apenas para confirmar/completar** o que o índice já resume (e verificar se há divergência de sincronia entre perfil e índice).

### Para cada membro

1. Mostre um resumo curto (a partir do índice): condições ativas, alergias, medicamentos em uso, receitas prescritas pendentes, próxima vacina/reforço e próximo antiparasitário (se pet).
2. **Verifique tratamentos de ciclo fechado (`termino_em`)**: se houver medicamento em `Em uso` cujo `termino_em` já passou, pergunte diretamente: *"O tratamento com [Medicamento] terminou em [data]. Posso movê-lo de 'Em uso' para 'Descontinuados / Histórico'?"*
3. Pergunte: *"Isso ainda está certo? Mudou algo desde a última vez?"*
4. Se mudou algo em medicamentos novos, pergunte se o medicamento já foi comprado/iniciado antes de marcar como `Em uso`.
5. Se uma vacina, antiparasitário, check-up ou receita de uso contínuo (`renova_em`) estiver vencida ou perto de vencer, avise.
6. **Verifique tendência de marcadores-chave:** se um marcador em `marcadores_chave` tiver variado na mesma direção nos últimos 3 registros de `Exames.md`, mencione isso de forma calma e factual, seguindo o `Frameworks/PROTOCOLO_CLINICO.md` (sem alarme, sugerindo levar ao profissional).
7. **Com autorização explícita do usuário**, atualize `Ficha.md`, `Medicamentos.md`, `Familia/_index.yaml` e registre o evento em `Historico.md` e `Familia/Linha_do_Tempo_Geral.md`.

### Fechamento

1. Com confirmação do usuário, atualize `Última revisão` e `Próxima revisão sugerida` (data + 6 meses) em `Familia/META.md` e `atualizado_em` em `Familia/_index.yaml`.
2. **Regere `Familia/Agenda.md` e `Familia/Medicamentos_Ativos.md`** a partir dos dados atualizados do índice:
   - Na `Agenda.md`, liste vencidos/ciclos encerrados, vencendo em 30 dias, vencendo em 31–90 dias e sem data definida — por membro, ordenado por data.
   - Em `Medicamentos_Ativos.md`, liste todos os medicamentos atualmente em `medicamentos_em_uso`.
3. Mostre um resumo das alterações realizadas e o conteúdo atualizado da Agenda.

## Regras
- Nunca apague ou altere informação clínica sem autorização explícita do usuário.
- Seja rápido — se nada mudou num perfil, siga adiante.
- A regeneração de `Agenda.md` e `Medicamentos_Ativos.md` reflete fielmente o que já foi aprovado no `_index.yaml`.

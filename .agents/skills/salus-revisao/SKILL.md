---
name: salus-revisao
description: "Revisão periódica do Salus: percorre cada perfil checando vacinas, antiparasitários, check-ups, exames pendentes, receitas vencendo e tratamentos temporários já encerrados, e confirma se as Fichas ainda refletem a realidade. Também reconstrói/migra o Familia/_index.yaml e remove membros a pedido. Acione com: 'revisar salus', 'revisão de saúde', 'reconstruir o índice', 'remover [nome] do salus' ou quando o raio-x avisar que a data de revisão se aproxima."
---

# Skill: Salus — Revisão

Conduz uma revisão estruturada e rápida do Salus para manter `Familia/_index.yaml`, as Fichas, Medicamentos e views derivadas (`Agenda.md` e `Medicamentos_Ativos.md`) 100% atualizados e gerar alertas proativos.

## Quando Acionar

- `Familia/META.md` contém a data do onboarding, a data da última revisão e a próxima revisão sugerida (o `AGENTS.md` não repete essas datas — `META.md` é a referência).
- Se a data já passou ou está próxima (< 2 semanas), sugira proativamente.
- O usuário também pode acionar manualmente a qualquer momento, inclusive só para reconstruir o índice ou remover um membro (seções no final).

## Fluxo

### Preparação
1. Leia `Familia/_index.yaml` para carregar membros, vínculos, alergias, condições, medicamentos (`renova_em`, `termino_em`, `validade_receita`), vacinas, antiparasitários, exames pendentes e marcadores-chave já registrados. Se o arquivo não existir, estiver vazio ou sem `schema_versao`, vá para "Reconstruir ou migrar o índice" antes de continuar.
2. Leia `Familia/META.md` para verificar a data da última revisão.
3. Abra `Ficha.md`, `Medicamentos.md` e `Exames.md` de cada membro **apenas para confirmar/completar** o que o índice já resume (e verificar se há divergência de sincronia entre perfil e índice — o índice manda em datas/status, o perfil em narrativa; divergência é corrigida nos dois, com confirmação).

### Para cada membro

1. Mostre um resumo curto (a partir do índice): condições ativas, alergias (se `null`, pergunte agora), medicamentos em uso, receitas prescritas pendentes, exames pendentes, próxima vacina/reforço e próximo antiparasitário (se pet).
2. **Verifique tratamentos de ciclo fechado (`termino_em`)**: se houver medicamento em `Em uso` cujo `termino_em` já passou, pergunte diretamente: *"O tratamento com [Medicamento] terminou em [data]. Posso movê-lo de 'Em uso' para 'Descontinuados / Histórico'?"*
3. **Verifique exames pendentes**: para cada item de `exames_pendentes`, pergunte se já foi feito (se sim, remova e peça o resultado para a Caixa de Entrada) ou se ainda vale.
4. Pergunte: *"Isso ainda está certo? Mudou algo desde a última vez?"*
5. Se mudou algo em medicamentos novos, pergunte se o medicamento já foi comprado/iniciado antes de marcar como `Em uso`.
6. Se uma vacina, antiparasitário, check-up, exame pendente, receita prescrita (`validade_receita`) ou receita de uso contínuo (`renova_em`) estiver vencida ou perto de vencer, avise.
7. **Verifique tendência de marcadores-chave:** se um marcador em `marcadores_chave` tiver variado na mesma direção nos últimos 3 registros de `Exames.md`, mencione isso de forma calma e factual, seguindo o `Frameworks/PROTOCOLO_CLINICO.md` (sem alarme, sugerindo levar ao profissional).
8. **Com autorização explícita do usuário**, atualize `Ficha.md`, `Medicamentos.md`, `Familia/_index.yaml` e registre o evento em `Historico.md` e `Familia/Linha_do_Tempo_Geral.md`.

### Fechamento

1. Com confirmação do usuário, atualize `Última revisão` e `Próxima revisão sugerida` (data + 6 meses) em `Familia/META.md` e `atualizado_em` em `Familia/_index.yaml`.
2. **Regere `Familia/Agenda.md` e `Familia/Medicamentos_Ativos.md`** a partir dos dados atualizados do índice. Isso não precisa de nova confirmação: são views derivadas que só refletem o que já foi aprovado no índice (ver tabela em `Frameworks/PROTOCOLO_CLINICO.md`).
   - Na `Agenda.md`, liste vencidos/ciclos encerrados, vencendo em 30 dias, vencendo em 31–90 dias e sem data definida — por membro, ordenado por data.
   - Em `Medicamentos_Ativos.md`, liste todos os medicamentos atualmente em `medicamentos_em_uso` (com `prescrito_por`).
3. Mostre um resumo das alterações realizadas e o conteúdo atualizado da Agenda.

## Reconstruir ou migrar o índice

Use quando `Familia/_index.yaml` não existir, estiver vazio, sem `schema_versao`, ou quando faltarem campos de versões mais novas (ex: `alergias`, `antiparasitarios`, `exames_pendentes`, `prescrito_por`, `validade_receita`).

1. Leia o template atual em `.agents/skills/salus-onboarding/templates/Familia/_index.yaml` para saber o formato e o `schema_versao` esperados.
2. Se o índice existir, preserve tudo que já está nele. Para cada membro em `Perfis/*/`, leia `Ficha.md`, `Medicamentos.md`, `Exames.md` e a pasta `Documentos/Requisicoes/` e preencha só o que falta (campos novos, membros ausentes).
3. Se não existir, monte um bloco `membros` por pasta em `Perfis/`, usando `Familia/META.md` e `Familia/Arvore.md` para tipo, papel e vínculo. Vínculo de humanos sem informação: `biologico` (default); pets: `nao_aplicavel`.
4. Campos sem informação nos perfis entram vazios (`[]` ou `""`), **exceto `alergias`, que fica `null`** até o usuário responder.
5. Mostre o YAML completo proposto e o que mudou em relação ao arquivo anterior. **Só grave após confirmação explícita.** Depois, regenere `Agenda.md` e `Medicamentos_Ativos.md`.

## Remover membro

Quando o usuário pedir para tirar alguém do Salus (direito de exclusão — ver Privacidade em `Frameworks/PROTOCOLO_CLINICO.md`):

1. Liste exatamente o que será removido: a pasta `Perfis/[Nome]/` inteira (inclusive `Documentos/` e `Analises/`), o bloco do membro em `Familia/_index.yaml`, a linha em `Familia/META.md`, o nó em `Familia/Arvore.md` e todas as menções em `Linha_do_Tempo_Geral.md`, `Medicamentos_Ativos.md`, `Agenda.md` e `Genetica_Familiar.md`.
2. Ofereça **mover a pasta do perfil para fora do Salus** (ex: uma pasta que o usuário indicar) em vez de apagar — os documentos originais podem ser necessários depois.
3. Execute só após confirmação explícita. Não deixe menção residual ao nome nas views; se o usuário quiser, mantenha uma linha neutra na `Linha_do_Tempo_Geral.md` ("Perfil removido a pedido em [data]") sem o nome.
4. Regenere `Agenda.md` e `Medicamentos_Ativos.md`.

## Regras
- Nunca apague ou altere informação clínica sem autorização explícita do usuário.
- Seja rápido — se nada mudou num perfil, siga adiante.
- A regeneração de `Agenda.md` e `Medicamentos_Ativos.md` reflete fielmente o que já foi aprovado no `_index.yaml`.

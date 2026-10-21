---
name: preparar-consulta
description: "Gera um resumo focado e imprimível para levar a uma consulta médica/veterinária ou pronto-socorro. Acione com: 'vou ao médico', 'tenho consulta com [especialidade]', 'prepara a consulta do [nome]', 'ficha de emergência do [nome]'."
---

# Skill: Preparar Consulta (e Resumo de Emergência)

Esta skill prepara uma folha-resumo objetiva, estruturada e imprimível para o usuário (ou pet) levar a uma consulta médica/veterinária ou apresentar em um atendimento de urgência/pronto-socorro.

## Quando acionar

- **Consulta agendada:** O usuário diz *"tenho consulta com cardiologista amanhã"*, *"vou levar o Rex no veterinário"*, *"preciso de um resumo pro médico"*.
- **Emergência / Pronto-Socorro:** O usuário diz *"estou indo ao pronto-socorro com [nome]"*, *"ficha de emergência do [nome]"*.

## Passo a Passo (Índice Primeiro)

1. **Identifique o membro e a finalidade** (Especialidade da consulta ou Emergência/Pronto-Socorro).
2. **Leia PRIMEIRO `Familia/_index.yaml` e `Familia/Agenda.md`**:
   - Extraia imediatamente `alergias`, `condicoes_ativas`, `medicamentos_em_uso` (com datas de renovação/término), `medicamentos_prescritos`, `vacinas`, `antiparasitarios` (se pet), `exames_pendentes` e `marcadores_chave`.
   - Se `alergias` for `null` (nunca perguntado), pergunte agora. Se o usuário não souber, escreva na ficha **"não informado — confirmar no atendimento"**; nunca escreva "nenhuma" sem confirmação.
3. **Abra os arquivos do perfil (`Perfis/[Nome]/`) para enriquecer os detalhes pertinentes à especialidade**:
   - `Perfis/[Nome]/Ficha.md` (tipo sanguíneo, plano de saúde, contato de emergência, especialistas)
   - `Perfis/[Nome]/Medicamentos.md` (histórico recente de medicamentos descontinuados ou doses detalhadas)
   - `Perfis/[Nome]/Genetica.md` (condições hereditárias na família ou predisposições da raça relevantes para a especialidade)
   - `Perfis/[Nome]/Exames.md` (últimos exames e sinais vitais relevantes para a especialidade)
   - `Perfis/[Nome]/Historico.md` (eventos e sintomas dos últimos 3–6 meses)
4. **Gere o Resumo de Consulta**:

```markdown
# Preparo para Consulta — [Nome]

**Especialidade / Finalidade:** [Especialidade / Médico ou Pronto-Socorro]
**Data:** [AAAA-MM-DD]
**Paciente:** [Nome] ([Idade] / [Espécie e Raça se pet])
**Tipo sanguíneo / Microchip:** [Info da Ficha.md] *(informado pela família — não verificado em laboratório)*
**Contato de emergência / Tutor:** [Nome e telefone]

---

## ⚠️ Alergias e intolerâncias conhecidas
- [Lista de alergias — em destaque no topo por segurança clínica; ou "não informado — confirmar no atendimento"]

## 💊 Medicamentos em uso atual
- [Lista de medicamentos com dose, frequência, início, quem prescreveu e se precisa renovar receita]
- *A checagem de interações feita pelo Salus é um lembrete e pode estar incompleta — validar com o profissional.*

## 📋 Condições em acompanhamento
- [Lista de condições ativas]

## 🧬 Histórico familiar / Predisposições relevantes
- [Achados de Genetica.md pertinentes à especialidade]

## 🧪 Últimos exames e sinais vitais relevantes
- **[Data]** — [Nome do Exame / Sinal Vital]: [Principais marcadores com unidade, faixa do laudo e flag]
- Exames pedidos e ainda não feitos: [itens de `exames_pendentes`, se houver]

## 💉 Vacinas e Antiparasitários (status)
- [Resumo do que está em dia ou pendente/vencido]

## 🗓️ Sintomas e eventos recentes (últimos meses)
- **[Data]** — [Sintoma, intercorrência ou relato]

## ❓ Dúvidas / Pontos a revisar com o profissional
- [ ] [Dúvida 1 sugerida com base em receitas a renovar, tratamentos encerrando ou exames sinalizados]
- [ ] [Dúvida 2]

---
*⚠️ Resumo gerado por inteligência artificial a partir dos arquivos do Salus em [AAAA-MM-DD HH:mm]. Não substitui avaliação profissional.*
```

5. **Apresente o resumo no chat** e pergunte:

> *"Quer que eu salve este preparo de consulta no Salus? Ele ficará em `Perfis/[Nome]/Analises/AAAA-MM-DD_HHmm_Preparo_Consulta_[Especialidade].md` (mesmo padrão com hora das análises da skill `cruzar`) para você acessar ou imprimir quando quiser."*

6. **Após confirmação explícita do usuário**, grave o arquivo em `Perfis/[Nome]/Analises/` e adicione a entrada correspondente em `Perfis/[Nome]/Historico.md`.

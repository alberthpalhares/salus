---
name: preparar-consulta
description: "Gera um resumo focado e imprimível para levar a uma consulta médica ou veterinária. Acione com: 'vou ao médico', 'tenho consulta com [especialidade]', 'prepara a consulta do [nome]'."
---

# Skill: Preparar Consulta

Esta skill prepara uma folha-resumo objetiva e focada para o usuario (ou pet) levar a uma consulta medica ou veterinaria.

## Quando acionar

- O usuario diz *"tenho consulta com cardiologista amanha"*, *"vou levar o Rex no veterinario"*, *"preciso de um resumo pro medico"*.

## Passo a Passo

1. **Identifique o membro e a especialidade** (ex: Cardiologia, Dermatologia, Veterinario Geral).
2. **Leia os arquivos do membro**:
   - `Perfis/[Nome]/Ficha.md` (dados basicos, alergias, condicoes)
   - `Perfis/[Nome]/Medicamentos.md` (medicamentos em uso e prescritos)
   - `Perfis/[Nome]/Exames.md` (ultimos exames relevantes para a especialidade)
   - `Perfis/[Nome]/Historico.md` (ultimos eventos e sintomas dos ultimos 3-6 meses)
3. **Gere o Resumo de Consulta**:

```markdown
# Preparo para Consulta — [Nome]

**Especialidade:** [Especialidade / Medico]
**Data da consulta:** [Data]
**Paciente:** [Nome] ([Idade] anos / [Especie e Raca])
**Parentesco / Tutor:** [Nome]

---

## 💊 Medicamentos em uso atual
- [Lista de medicamentos com dose e frequencia]

## ⚠️ Alergias conhecidas
- [Lista de alergias]

## 📋 Condicoes em acompanhamento
- [Lista de condicoes ativas]

## 🧪 Ultimos exames relevantes
- **[Data]** — [Nome do Exame]: [Principais marcadores e se houve sinalizacao do laudo]

## 🗓️ Sintomas e eventos recentes (ultimos meses)
- **[Data]** — [Sintoma ou relato]

## ❓ Duvidas / Pontos a perguntar ao medico
- [ ] [Duvida 1 baseada nas receitas a renovar ou exames alterados]
- [ ] [Duvida 2]
```

4. **Apresente o resumo no chat** e pergunte:

> *"Quer que eu salve este preparo de consulta no Salus? Ele ficara em `Perfis/[Nome]/Analises/AAAA-MM-DD_Preparo_Consulta_[Especialidade].md` para voce acessar ou imprimir quando quiser."*

5. Se o usuario confirmar, grave o arquivo e adicione a entrada no `Historico.md`.

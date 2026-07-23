---
name: registrar
description: "Registra rapidamente uma consulta, sintoma, medicamento novo, vacina ou evento de saúde direto no perfil certo. Acione com frases como: 'registra que...', 'anota que...', 'o [nome] tomou...', 'a [nome] teve...'."
---

# Skill: Registrar

Agiliza a entrada de informações de saúde no dia a dia. Quando o usuário disser algo como "registra que o Rex tomou a vacina antirrábica hoje" ou "anota que tive dor de cabeça essa semana", processe e grave sem burocracia.

## 1. Identificar o membro e o tipo de registro

Descubra de qual perfil (`Perfis/[Nome]/`) se trata. Classifique o tipo de informação:
- **Evento pontual** (consulta, sintoma, cirurgia, vacina aplicada) → adicionar em `Perfis/[Nome]/Historico.md` e também em `Familia/Linha_do_Tempo_Geral.md`
- **Medicamento novo ou alteração de dose** → atualizar a seção "Medicamentos em uso" da `Ficha.md` do membro E `Familia/Medicamentos_Ativos.md`
- **Vacina aplicada** → atualizar a seção "Vacinas" da `Ficha.md`
- **Novo valor de exame** mencionado em texto (não como documento) → adicionar em `Exames.md`, sempre perguntando a faixa de referência se não foi informada

## 2. Formato de escrita

- **Histórico:** `- **[AAAA-MM-DD]** [Descrição clara e objetiva]`
- **Linha do Tempo Geral:** `- **[AAAA-MM-DD]** **[Nome]** — [Descrição]`
- **Medicamentos:** adicionar linha na tabela com nome, dose, data de início, quem prescreveu (se souber)

## 3. Fluxo de ação

1. Leia o(s) arquivo(s) destino.
2. Identifique a seção certa.
3. Insira a nova linha sem alterar o resto do conteúdo.
4. Se faltar uma data, use a data atual do sistema e avise o usuário que assumiu isso.
5. Depois de gravar, mostre ao usuário só a linha inserida, com um ✅.

*Não peça confirmação antes de gravar — apenas registre e mostre o resultado. Se a informação envolver um exame com valor fora do comum, siga o `Frameworks/PROTOCOLO_CLINICO.md` (nunca alarme, sempre sugira mostrar ao profissional).*

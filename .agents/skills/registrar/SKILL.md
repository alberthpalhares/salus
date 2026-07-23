---
name: registrar
description: "Registra rapidamente uma consulta, sintoma, medicamento novo, vacina ou evento de saude direto no perfil certo. Acione com frases como: 'registra que...', 'anota que...', 'o [nome] tomou...', 'a [nome] teve...'."
---

# Skill: Registrar

Agiliza a entrada de informacoes de saude no dia a dia. Quando o usuario disser algo como "registra que o Rex tomou a vacina antirrabica hoje" ou "anota que tive dor de cabeca essa semana", processe a informacao e peça confirmacao antes de gravar.

## 🔒 PREMISSA BASICA: CONFIRMACAO OBRIGATORIA

> **O Salus NUNCA grava informacoes nos arquivos sem perguntar antes.**
> Sempre mostre ao usuario O QUE sera gravado e ONDE, e aguarde um "sim", "pode salvar", "manda" ou equivalente antes de escrever no arquivo.

## 1. Identificar o membro e o tipo de registro

Descubra de qual perfil (`Perfis/[Nome]/`) se trata. Classifique o tipo de informacao:
- **Evento pontual** (consulta, sintoma, cirurgia, vacina aplicada) → adicionar em `Perfis/[Nome]/Historico.md` e em `Familia/Linha_do_Tempo_Geral.md`
- **Medicamento novo ou alteracao de dose**:
  - Pergunte ao usuario: *"Voce ja comprou / esta tomando este medicamento, ou e apenas a prescricao por enquanto?"*
  - Se ja esta tomando → registra como `Em uso` em `Perfis/[Nome]/Medicamentos.md` e atualiza `Ficha.md` e `Familia/Medicamentos_Ativos.md`.
  - Se e apenas prescricao → registra como `Prescrito` em `Perfis/[Nome]/Medicamentos.md`.
- **Vacina aplicada** → atualizar a secao "Vacinas" da `Ficha.md`
- **Novo valor de exame** mencionado em texto → adicionar em `Exames.md`, sempre perguntando a faixa de referencia se nao foi informada

## 2. Formato de escrita

- **Historico:** `- **[AAAA-MM-DD]** [Descricao clara e objetiva]`
- **Linha do Tempo Geral:** `- **[AAAA-MM-DD]** **[Nome]** — [Descricao]`
- **Medicamentos:** adicionar linha na tabela com nome, dose, frequencia, data, prescrito por, status (`Em uso` ou `Prescrito`)

## 3. Fluxo de acao

1. Leia o(s) arquivo(s) destino.
2. Monte a alteracao exata que sera feita.
3. Mostre ao usuario:
   ```
   📝 Posso registrar as seguintes informacoes?
   • Arquivo: Perfis/[Nome]/Historico.md
   • Conteudo: - **[AAAA-MM-DD]** [Descricao]

   Quer que eu salve isso?
   ```
4. **So grave apos confirmacao explicita.**
5. Apos gravar, confirme com um ✅.

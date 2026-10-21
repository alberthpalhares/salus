---
name: salus-organiza
description: "Lê os documentos novos deixados em _Caixa de Entrada (exames, laudos, receitas, vacinas, fotos, áudios), identifica de quem são e do que se trata, e arquiva automaticamente no perfil certo após confirmação. Acione com: 'organiza a caixa de entrada', 'chegou um exame novo', 'organiza os documentos'."
---

# Skill: Salus — Organiza

Processa os arquivos deixados pelo usuário em `_Caixa de Entrada/` com leitura nativa (PDF, imagem, áudio).

## 🔒 PREMISSA BÁSICA: CONFIRMAÇÃO OBRIGATÓRIA

> **O Salus NUNCA move arquivos ou altera dados sem mostrar o plano completo e pedir confirmação explícita.**

## Passo a Passo

1. **Leia `Familia/_index.yaml`** (e `Familia/META.md` se necessário) para carregar a lista de membros, tipos (`pessoa`, `cao`, `gato`), alergias e medicamentos ativos.
2. Liste os arquivos presentes em `_Caixa de Entrada/` (ignore `LEIA-ME.md` e `.gitkeep`).
3. Para cada arquivo encontrado:
   a. **Leia o conteúdo** (texto/visão do PDF, imagem do exame/receita/carteirinha, ou transcreva o áudio).
   b. **Identifique de quem é o documento** — cruze o nome do paciente/pet ou tutor mencionado no documento com os membros de `Familia/_index.yaml`. Se houver dúvida, pergunte ao usuário.
   c. **Identifique o tipo e a subpasta de destino em `Perfis/[Nome]/Documentos/`**:
      - `Exames/` — exames laboratoriais (sangue, urina, fezes, genética, etc.)
      - `Laudos/` — exames de imagem (ultrassom, raio-X, tomografia, ressonância, ecocardiograma) e atestados/relatórios médicos
      - `Receitas/` — prescrições médicas ou veterinárias
      - `Requisicoes/` — pedidos/guias de exames ainda não realizados
      - `Vacinas/` — comprovantes ou fotos de carteirinha de vacinação / controle antiparasitário
      - `Audios/` — gravações de orientações médicas ou relatos
   d. **Proponha o novo nome padronizado**: `AAAA-MM-DD_Tipo_Descricao-Curta.ext` (usando a data de realização/emissão do documento).
4. **Apresente o plano de organização ao usuário**:
   ```text
   📄 Encontrei os seguintes documentos para organizar:

   1. [Nome do Arquivo Original]
      • Pertence a: [Nome do Membro]
      • Tipo: [Exame / Laudo / Receita / Vacina / Requisição / Áudio]
      • Destino: Perfis/[Nome]/Documentos/[Subpasta]/AAAA-MM-DD_Tipo_Descricao.ext
      • Atualizações no Salus:
        - Perfil: [Exames.md / Medicamentos.md / Ficha.md / Genetica.md / Historico.md]
        - Família: `Familia/_index.yaml` + views derivadas ([Agenda.md / Medicamentos_Ativos.md / Linha_do_Tempo_Geral.md])

   Posso prosseguir com a organização?
   ```

5. **REGRA ESPECIAL PARA RECEITAS E MEDICAMENTOS:**
   Ao processar uma receita médica/veterinária, pergunte adicionalmente:
   *"Esta receita prescreve [Medicamento X (dose/frequência)]. Você já comprou / está tomando este medicamento, ou é apenas a prescrição por enquanto?"*
   - Verifique também em `Familia/_index.yaml` se o membro possui **alergia** registrada ou medicamento em uso que exija atenção com a nova prescrição (seguindo o `Frameworks/PROTOCOLO_CLINICO.md`).
   - **Se já comprou/está tomando** → cadastra em `Perfis/[Nome]/Medicamentos.md` como `Em uso`, atualiza `Ficha.md`, `Familia/Medicamentos_Ativos.md`, e adiciona em `medicamentos_em_uso` no `Familia/_index.yaml` (preenchendo `renova_em` se for contínuo ou `termino_em` se for tratamento de ciclo fechado, ex: 5 dias).
   - **Se é apenas prescrição** → cadastra em `Perfis/[Nome]/Medicamentos.md` como `Prescrito` e em `medicamentos_prescritos` no `Familia/_index.yaml`.

6. **Após confirmação explícita do usuário:**
   - Mova/renomeie o arquivo original de `_Caixa de Entrada/` para `Perfis/[Nome]/Documentos/[Subpasta]/`.
   - Atualize os arquivos do perfil (`Exames.md`, `Medicamentos.md`, `Genetica.md`, `Historico.md`, `Ficha.md`) conforme aplicável.
   - **Atualize obrigatoriamente `Familia/_index.yaml`** (`atualizado_em` + campos do membro: `medicamentos_em_uso`, `medicamentos_prescritos`, `vacinas`, `antiparasitarios`, `proximos_checkups`, `ultimo_exame_em` e `marcadores_chave`).
   - **Sincronize as views derivadas da pasta `Familia/`**:
     - Adicione o evento em `Familia/Linha_do_Tempo_Geral.md`.
     - Se houve mudança em medicamentos ativos, atualize `Familia/Medicamentos_Ativos.md`.
     - Se houve mudança em datas (vacinas, antiparasitários, renovação/término de medicamentos, pedidos/retornos), atualize `Familia/Agenda.md`.

7. Se um exame tiver algum valor sinalizado como alterado no próprio laudo, mencione isso ao usuário de forma calma e factual, seguindo o `Frameworks/PROTOCOLO_CLINICO.md`.
8. Ao final, mostre um resumo dos arquivos organizados com um ✅.

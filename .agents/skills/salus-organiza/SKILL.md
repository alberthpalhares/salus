---
name: salus-organiza
description: "Lê os documentos novos deixados em _Caixa de Entrada (exames, laudos, receitas, fotos, áudios), identifica de quem são e do que se trata, e arquiva automaticamente no perfil certo após confirmação. Acione com: 'organiza a caixa de entrada', 'chegou um exame novo', 'organiza os documentos'."
---

# Skill: Salus — Organiza

Processa os arquivos deixados pelo usuario em `_Caixa de Entrada/` com leitura nativa (PDF, imagem, audio).

## 🔒 PREMISSA BASICA: CONFIRMACAO OBRIGATORIA

> **O Salus NUNCA move arquivos ou altera dados sem mostrar o plano e pedir confirmacao.**

## Passo a Passo

1. Liste os arquivos presentes em `_Caixa de Entrada/` (ignore `LEIA-ME.md`).
2. Para cada arquivo:
   a. **Leia o conteudo** (texto do PDF, imagem do exame/receita, ou transcreva o audio).
   b. **Identifique de quem e o documento** — cruze nome mencionado no documento com `Familia/META.md`. Se nao for possivel identificar com confianca, pergunte ao usuario.
   c. **Identifique o tipo**: Exame, Laudo, Receita, Requisicao, ou Audio de orientacao.
   d. **Renomeie mentalmente** seguindo o padrao: `AAAA-MM-DD_Tipo_Descricao curta.ext`.
3. **Apresente o plano de organizacao ao usuario**:
   ```
   📄 Encontrei os seguintes documentos para organizar:

   1. [Nome do Arquivo Original]
      • Pertence a: [Nome do Membro]
      • Tipo: [Exame / Receita / Laudo]
      • Destino: Perfis/[Nome]/Documentos/[Tipo]/AAAA-MM-DD_Tipo_Descricao.ext
      • Alteracoes: adicionar valores em Exames.md / historico / Familia/_index.yaml...

   Posso prosseguir com a organizacao?
   ```

4. **REGRA ESPECIAL PARA RECEITAS:**
   Ao processar uma receita medica, pergunte adicionalmente:
   *"Esta receita possui [Medicamento X]. Voce ja comprou / esta tomando este medicamento, ou e apenas a prescricao por enquanto?"*
   - Se comprou/tomando → cadastra em `Medicamentos.md` como status `Em uso` e adiciona/atualiza em `medicamentos_em_uso` do membro em `Familia/_index.yaml` (com `renova_em` se a receita tiver validade).
   - Se apenas prescricao → cadastra em `Medicamentos.md` como status `Prescrito` e em `medicamentos_prescritos` do `_index.yaml` (nao entra em "em uso").

5. **Apos confirmacao explicita do usuario:**
   - Mova o arquivo original para a pasta de destino.
   - Atualize `Exames.md`, `Medicamentos.md`, `Historico.md` e `Ficha.md` conforme o caso.
   - **Atualize `Familia/_index.yaml`** (`atualizado_em` + os campos do membro afetado: medicamentos, vacinas ou `marcadores_chave` se o documento for um exame com marcador relevante). Trate isso como parte obrigatória da gravação, não como passo opcional.

6. Se um exame tiver algum valor sinalizado como alterado no proprio laudo, mencione isso ao usuario de forma calma, seguindo o `Frameworks/PROTOCOLO_CLINICO.md`.

7. Ao final, mostre um resumo dos arquivos organizados com um ✅.

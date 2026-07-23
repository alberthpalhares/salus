---
name: salus-organiza
description: "Lê os documentos novos deixados em _Caixa de Entrada (exames, laudos, receitas, fotos, áudios), identifica de quem são e do que se trata, e arquiva automaticamente no perfil certo. Acione com: 'organiza a caixa de entrada', 'chegou um exame novo', 'organiza os documentos'."
---

# Skill: Salus — Organiza

Processa os arquivos deixados pelo usuário em `_Caixa de Entrada/` sem exigir nenhuma etapa manual dele — nada de scripts ou instalação. Você lê os documentos nativamente (PDF, imagem, áudio) com suas próprias ferramentas de leitura de arquivo.

## Passo a Passo

1. Liste os arquivos presentes em `_Caixa de Entrada/` (ignore `LEIA-ME.md`).
2. Para cada arquivo:
   a. **Leia o conteúdo** (texto do PDF, imagem do exame/receita, ou transcreva o áudio).
   b. **Identifique de quem é o documento** — cruze nome mencionado no documento com `Familia/META.md`. Se não for possível identificar com confiança, pergunte ao usuário.
   c. **Identifique o tipo**: Exame, Laudo, Receita, Requisição, ou Áudio de orientação.
   d. **Renomeie mentalmente** seguindo o padrão: `AAAA-MM-DD_Tipo_Descricao curta.ext` (data do documento, não a de hoje, quando disponível).
   e. **Mova/copie** o arquivo para `Perfis/[Nome]/Documentos/[Tipo]/` com o novo nome.
3. **Extraia o conteúdo relevante** e atualize os arquivos do perfil:
   - Exame com valores de laboratório → adicionar linha(s) em `Perfis/[Nome]/Exames.md`, com a faixa de referência exatamente como está no laudo.
   - Receita → atualizar "Medicamentos em uso" na `Ficha.md` e registrar em `Historico.md`.
   - Laudo/orientação médica → resumir em 2-3 linhas e adicionar em `Historico.md`.
   - Áudio → transcrever o essencial e registrar como orientação em `Historico.md`, citando que veio de um áudio.
4. Se um exame tiver algum valor sinalizado como alterado no próprio laudo, mencione isso ao usuário de forma calma, seguindo o `Frameworks/PROTOCOLO_CLINICO.md`.
5. Ao final, mostre um resumo curto:

```
📥 Caixa de entrada organizada:
   • [arquivo] → Perfis/[Nome]/Documentos/[Tipo]/ ([o que foi extraído/atualizado])
   • ...
```

## Regras
- Nunca invente informação que não está no documento.
- Se não conseguir identificar de quem é um documento, pergunte — não arquive com suposição.
- Se o mesmo tipo de exame já existir em `Exames.md`, adicione como nova linha na tabela existente (para permitir comparação ao longo do tempo), não crie uma tabela duplicada.
- Caminhos sempre relativos à raiz do workspace.

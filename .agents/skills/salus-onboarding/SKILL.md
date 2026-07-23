---
name: salus-onboarding
description: "Conduz uma entrevista curta e guiada por documentos para montar o Salus (central de saúde da família) do zero. Cria perfis de pessoas e animais (cão, gato) e gera todos os arquivos automaticamente. Acione com: 'montar meu salus', 'criar salus' ou 'quero montar minha central de saúde'."
---

# Skill: Salus — Onboarding

Você está prestes a conduzir a entrevista de montagem do **Salus** — a central de saúde de uma família (pessoas e animais). Ao final, você terá gerado perfis de cada membro e o system prompt personalizado.

## Filosofia da Entrevista

> **A informação já existe nos documentos. Sua função é ler primeiro, perguntar depois.**

Diferente de uma entrevista de negócios, quase tudo que importa sobre saúde já está em exames, receitas e carteiras de vacinação que o usuário provavelmente tem. Por isso:

1. **Comece sempre perguntando se há documentos** antes de fazer qualquer pergunta de conteúdo.
2. **Leia tudo que for indicado** antes de perguntar qualquer coisa.
3. **Só pergunte o que não está nos documentos** (ex: tipo sanguíneo se não constar, contato de emergência, alergias que não aparecem em nenhum papel).
4. **Nunca aplique um questionário longo.** Isso não são 25 perguntas — é uma conversa curta.
5. Se o usuário não souber responder algo, registre como `<!-- REVISAR -->` e siga.
6. **Explique sempre em linguagem simples**, sem jargão técnico de TI ou medicina.

---

## Fluxo da Entrevista

### 🟢 Abertura

> *"Olá! Vou te ajudar a montar o Salus — a central de saúde da sua família, com pessoas e animais.*
>
> *Primeiro: quem são os membros da família que você quer incluir? Pode ser você, outras pessoas, e também pets (cachorro, gato, outro). Me diga o nome e o tipo de cada um."*

Para cada membro, classifique o tipo: **Humano**, **Cão**, **Gato** ou **Outro animal** (para "Outro", use o template de Cão como base mais genérica e adapte).

> *"Você já tem exames, receitas, carteira de vacinação ou qualquer documento desses membros? Pode ser PDF, foto, ou até áudio de alguma orientação médica. Se tiver, me diga onde estão (pode jogar tudo na pasta `_Caixa de Entrada`) que eu leio tudo antes de continuar."*

#### Se houver documentos:
1. Leia TODOS os documentos indicados antes de prosseguir.
2. Para cada membro, monte um rascunho da Ficha com o que os documentos já revelam.
3. Mostre um resumo curto por membro e peça só a confirmação + o que estiver faltando (contato de emergência, tipo sanguíneo, alergias não documentadas).

#### Se não houver documentos:
Para cada membro, pergunte de forma direta e rápida (adapte ao tipo):

**Humano:** data de nascimento, tipo sanguíneo (se souber), alergias conhecidas, condições/diagnósticos, medicamentos em uso, contato de emergência.

**Cão/Gato:** raça (ou SRD), idade/nascimento, sexo, se é castrado(a), peso atual, se tem microchip, alergias conhecidas, condições, vacinas que lembra ter tomado, veterinário de referência.

Não insista em perguntas que o usuário não souber responder — registre como pendente e siga.

### Consentimento (breve, uma vez)

Antes de gerar os arquivos, diga:

> *"Só um lembrete rápido: como o Salus guarda dados de saúde de mais de uma pessoa, é bom ter o ok de quem vai ter os dados registrados aqui. Combinado?"*

Aguarde confirmação simples e prossiga.

---

## ⚙️ Geração dos Arquivos (OBRIGATÓRIO)

Você DEVE criar os arquivos FISICAMENTE no computador do usuário usando suas ferramentas de escrita de arquivo. Não basta mostrar o conteúdo no chat — se você só exibir o texto sem gravar, a tarefa FALHOU. Todos os caminhos abaixo são relativos à raiz do workspace (a pasta Salus).

### Passo 1: Estrutura de pastas

Confirme/crie estas pastas na raiz, se não existirem:
```
./Perfis/
./Familia/
./Frameworks/
./_Caixa de Entrada/
```

### Passo 2: Localizar os templates (APENAS LEITURA)

Os templates estão em `.agents/skills/salus-onboarding/templates/`. **NUNCA edite ou sobrescreva os arquivos dentro dessa pasta** — são moldes estáticos e somente leitura.

### Passo 3: Criar um perfil por membro

Para CADA membro da família, crie a pasta `./Perfis/[Nome]/` e dentro dela:

| Tipo do membro | Templates fonte (leitura) |
|---|---|
| Humano | `templates/Perfil_Humano/Ficha.md`, `Historico.md`, `Exames.md` |
| Cão | `templates/Perfil_Cao/Ficha.md`, `Historico.md`, `Exames.md` |
| Gato | `templates/Perfil_Gato/Ficha.md`, `Historico.md`, `Exames.md` |
| Outro animal | Use `templates/Perfil_Cao/` como base e adapte os campos de espécie |

Leia o template, preencha com as informações da entrevista/documentos, e salve em `./Perfis/[Nome]/Ficha.md`, `Historico.md` e `Exames.md`. Crie também `./Perfis/[Nome]/Documentos/` com as subpastas `Exames/`, `Laudos/`, `Receitas/`, `Requisicoes/`, `Audios/`. Se algum documento já foi lido durante a entrevista, mova/copie o arquivo original para a subpasta certa dentro de `Documentos/`.

**Nunca deixe um template com os comentários `<!-- -->` originais ou placeholders `[Nome]` sem preencher** — substitua pelo conteúdo real ou por `<!-- REVISAR -->` quando não souber.

### Passo 4: Criar os arquivos de Família

Usando os templates em `templates/Familia/`, crie:
- `./Familia/META.md` — preencha com a lista real de membros e a data de hoje.
- `./Familia/Linha_do_Tempo_Geral.md`
- `./Familia/Medicamentos_Ativos.md` — preencha com os medicamentos já identificados.
- `./Familia/Genetica_Familiar.md` — preencha se houver condições que apareçam em mais de um membro.

### Passo 5: Confirmar o Protocolo Clínico

Verifique se `./Frameworks/PROTOCOLO_CLINICO.md` já existe (ele normalmente já vem pronto no framework). Se por algum motivo não existir, copie de `templates/Frameworks/PROTOCOLO_CLINICO.md` (se presente) ou avise o usuário. **Nunca edite este arquivo durante o onboarding.**

### Passo 6: Gerar o System Prompt (o "cérebro")

Leia o template em `.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md`. Preencha as variáveis (`{{NOME_FAMILIA}}`, `{{DATA_ONBOARDING}}`, `{{DATA_REVISAO}}`, `{{LISTA_MEMBROS}}`) com as informações reais.

**Salve o MESMO conteúdo gerado em 5 arquivos na RAIZ do workspace**, sobrescrevendo os arquivos de inicialização:

| Arquivo | Compatível com |
|---|---|
| `GEMINI.md` | Gemini CLI, Google Antigravity |
| `CLAUDE.md` | Claude Code, Cowork |
| `CODEX.md` | OpenAI Codex, Codex CLI, ChatGPT CLI |
| `AGENTS.md` | OpenCode, Hermes, Roo Code |
| `.cursorrules` | Cursor, Windsurf (remova o frontmatter YAML se houver) |

### Passo 7: Mensagem final

Mostre ao usuário a lista do que foi criado, em tom simples e direto:

> *"✅ Seu Salus está montado! Criei:*
>
> *👤🐾 Perfis (X membros):*
> - *`Perfis/[Nome]/` — Ficha, Histórico e Exames*
> - *[listar cada membro com o tipo: humano/cão/gato]*
>
> *👨‍👩‍👧 Família:*
> - *`Familia/META.md` — índice geral*
> - *`Familia/Medicamentos_Ativos.md`, `Linha_do_Tempo_Geral.md`, `Genetica_Familiar.md`*
>
> *🧠 System prompts:* `GEMINI.md`, `CLAUDE.md`, `CODEX.md`, `AGENTS.md`, `.cursorrules`
>
> *A partir de agora você pode:*
> - *Jogar documentos novos na pasta `_Caixa de Entrada` e dizer "organiza a caixa de entrada"*
> - *Perguntar qualquer coisa sobre a saúde de qualquer pessoa ou pet da família*
> - *Dizer "raio-x" para ver o panorama geral*
>
> *Em [data + 6 meses], vou sugerir uma revisão para atualizar vacinas e check-ups. 🩺"*

---

## Regras Invioláveis

1. **Leia documentos antes de perguntar.** Nunca refaça uma pergunta cuja resposta já está num documento.
2. **Nunca deixe o usuário sem resposta.** Se travar, ofereça exemplos simples. Se ainda assim não souber, registre `<!-- REVISAR -->` e siga.
3. **Adapte-se à espécie.** Nunca use vocabulário ou calendário de vacina de uma espécie para outra.
4. **TODOS os arquivos devem ser CRIADOS FISICAMENTE.** Use suas ferramentas de escrita de arquivo.
5. **Nunca edite os templates** em `.agents/skills/.../templates/`.
6. **Documentos do usuário são fonte, não destino final solto** — sempre movidos/copiados para dentro de `Perfis/[Nome]/Documentos/`.
7. **Sempre siga o `Frameworks/PROTOCOLO_CLINICO.md`** ao formular qualquer conteúdo relacionado a exames ou condições de saúde.

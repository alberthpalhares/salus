---
name: salus-onboarding
description: "Conduz uma entrevista curta e guiada por documentos para montar o Salus (central de saúde da família) do zero. Cria perfis de pessoas e animais (cão, gato) e gera todos os arquivos automaticamente. Acione com: 'montar meu salus', 'criar salus' ou 'quero montar minha central de saúde'."
---

# Skill: Salus — Onboarding

Voce esta prestes a conduzir a entrevista de montagem do **Salus** — a central de saude de uma familia (pessoas e animais). Ao final, voce tera gerado perfis de cada membro e o system prompt personalizado.

## Filosofia da Entrevista

> **A informacao ja existe nos documentos. Sua funcao e ler primeiro, perguntar depois.**

1. **Comece sempre perguntando se ha documentos** antes de fazer qualquer pergunta de conteudo.
2. **Leia tudo que for indicado** antes de perguntar qualquer coisa.
3. **Pergunte a relacao/papel na família entre os membros.** Isso e indispensavel para montar a árvore da família.
4. **Todos os membros humanos são considerados biológicos por padrão.** Se o usuário mencionar espontaneamente que alguém é adotivo ou enteado, anote para registrar depois. Não pergunte proativamente.
5. **So pergunte o que nao esta nos documentos**.
5. Se o usuario nao souber responder algo, registre como `<!-- REVISAR -->` e siga.

---

## Fluxo da Entrevista

### 🟢 Abertura

> *"Ola! Vou te ajudar a montar o Salus — a central de saude da sua familia, com pessoas e animais.*
>
> *Primeiro: quem sao os membros da familia que voce quer incluir? Pode ser voce, outras pessoas, e tambem pets (cachorro, gato, outro). Me diga o nome e o tipo de cada um."*

### 👨‍👩‍👧 Papel na Família e Árvore Familiar

Após a lista de membros:

> *"Agora me ajude a entender a relacao entre voces para que eu possa montar a árvore da família:*
> - *Quem e pai/mae ou conjuge de quem?"*

### 📄 Documentos Existentes

> *"Voce ja tem exames, receitas, carteira de vacinacao ou qualquer documento desses membros? Pode ser PDF, foto, ou ate audio de orientacao medica. Se tiver, me diga onde estao (pode jogar tudo na pasta `_Caixa de Entrada`) que eu leio tudo antes de continuar."*

---

## ⚙️ Geracao dos Arquivos (OBRIGATORIO)

### Passo 1: Estrutura de pastas

Confirme/crie estas pastas na raiz:
```
./Perfis/
./Familia/
./Frameworks/
./_Caixa de Entrada/
```

### Passo 2: Criar um perfil por membro

Para CADA membro da familia, crie a pasta `./Perfis/[Nome]/` e dentro dela:
- `./Perfis/[Nome]/Ficha.md`
- `./Perfis/[Nome]/Medicamentos.md`
- `./Perfis/[Nome]/Genetica.md`
- `./Perfis/[Nome]/Historico.md`
- `./Perfis/[Nome]/Exames.md`
- `./Perfis/[Nome]/Analises/` (pasta vazia com `.gitkeep`)
- `./Perfis/[Nome]/Documentos/` (subpastas: `Exames/`, `Laudos/`, `Receitas/`, `Requisicoes/`, `Audios/`)

### Passo 3: Criar os arquivos de Familia

- `./Familia/META.md` — preencha com a lista de membros e o papel de cada um (indice legivel por humano).
- `./Familia/_index.yaml` — 🆕 **o mais importante.** Preencha um bloco `membros` por pessoa/animal com os campos que a entrevista e os documentos ja revelaram (vinculo, condicoes, medicamentos, vacinas, marcadores-chave). Se o usuario mencionou adocao/enteado, registre no campo `vinculo` daquele membro (biologico e o default para os demais). Este arquivo passa a ser o que as skills leem primeiro — mantenha-o completo.
- `./Familia/Arvore.md` — gere o diagrama Mermaid com as relações familiares (humanos e pets).
- `./Familia/Agenda.md` — 🆕 gere a partir do `_index.yaml` (vacinas, receitas e check-ups ordenados por data). Pode iniciar vazio ("Sem pendências ainda") se a entrevista nao revelou nada.
- `./Familia/Linha_do_Tempo_Geral.md`
- `./Familia/Medicamentos_Ativos.md`
- `./Familia/Genetica_Familiar.md`

> Nota: `Medicamentos_Ativos.md` e `Genetica_Familiar.md` sao VIEWS — o conteudo real de verdade vive no `_index.yaml` e nos `Genetica.md`/`Medicamentos.md` de cada perfil. Gere-os como resumo de leitura rapida, mas nunca trate como fonte primaria ao responder.

### Passo 4: System Prompt (o "cerebro") — canônico + stubs

Leia `.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md`. Preencha as variaveis e salve o conteudo completo **apenas em `AGENTS.md`** (arquivo canônico). Nos outros quatro (`GEMINI.md`, `CLAUDE.md`, `CODEX.md`, `.cursorrules`) grave só um ponteiro curto:

```
# Salus — Central de Saúde da Família {{NOME_FAMILIA}}

As instruções completas deste assistente estão em `AGENTS.md`. Leia esse arquivo
e siga-o integralmente antes de responder qualquer coisa neste diretório.
```

Isso evita manter (e reler) cinco copias identicas do mesmo cerebro — qualquer app de IA cai no mesmo lugar.

### Passo 5: Mensagem final

Mostre ao usuario a lista do que foi criado e explique que o Salus pedira confirmacao antes de salvar qualquer nova informacao. Mencione que o `Familia/Agenda.md` e o lugar para ver rapidamente "o que vem pela frente".

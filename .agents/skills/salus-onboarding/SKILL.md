---
name: salus-onboarding
description: "Conduz uma entrevista curta e guiada por documentos para montar o Salus (central de saúde da família) do zero. Cria perfis de pessoas e animais (cão, gato) e gera todos os arquivos automaticamente. Acione com: 'montar meu salus', 'criar salus' ou 'quero montar minha central de saúde'."
---

# Skill: Salus — Onboarding

Você está prestes a conduzir a entrevista de montagem do **Salus** — a central de saúde de uma família (pessoas e animais). Ao final, você terá gerado perfis de cada membro e o system prompt personalizado.

## Filosofia da Entrevista

> **A informação já existe nos documentos. Sua função é ler primeiro, perguntar depois.**

1. **Comece sempre perguntando se há documentos** antes de fazer qualquer pergunta de conteúdo clínico.
2. **Leia tudo que for indicado** antes de perguntar qualquer coisa que já possa estar escrita lá.
3. **Pergunte a relação/papel na família entre os membros.** Isso é indispensável para montar a árvore da família.
4. **Todos os membros humanos são considerados biológicos por padrão.** Se o usuário mencionar espontaneamente que alguém é adotivo ou enteado, anote para registrar no campo `vinculo` de `Familia/_index.yaml`. Não pergunte proativamente.
5. **Só pergunte o que não está nos documentos** (ex: contato de emergência, medicamentos contínuos sem receita anexada). **Exceção: alergias — pergunte sempre, explicitamente, para cada membro.** "Nenhuma conhecida" vira `alergias: []` no índice; sem resposta fica `alergias: null` (e a IA perguntará de novo quando precisar).
6. Se o usuário não souber responder algo, registre como `<!-- REVISAR -->` e siga adiante.
7. Lembre brevemente o usuário de duas coisas: (a) é recomendável ter o consentimento das pessoas adultas da família cujos dados serão armazenados (dado de saúde é dado pessoal sensível); (b) os arquivos ficam no computador, mas o que a IA lê para responder é enviado ao provedor do assistente — vale usar um plano cuja política não treine com os dados (ver "Privacidade" em `Frameworks/PROTOCOLO_CLINICO.md`).
8. Datas sempre em `AAAA-MM-DD` nos arquivos gerados.

---

## Fluxo da Entrevista

### 🟢 Abertura

> *"Olá! Vou te ajudar a montar o Salus — a central de saúde da sua família, com pessoas e animais.*
>
> *Primeiro: quem são os membros da família que você quer incluir? Pode ser você, outras pessoas, e também pets (cachorro, gato, outro). Me diga o nome e o tipo de cada um."*

### 👨‍👩‍👧 Papel na Família e Árvore Familiar

Após a lista de membros:

> *"Agora me ajude a entender a relação entre vocês para que eu possa montar a árvore da família:*
> - *Quem é pai/mãe, filho(a) ou cônjuge de quem? E de quem são os pets?"*

### 📄 Documentos Existentes

> *"Você já tem exames, receitas, carteira de vacinação ou qualquer documento desses membros? Pode ser PDF, foto, ou até áudio de orientação médica. Se tiver, pode colocar tudo na pasta `_Caixa de Entrada` e me avisar que eu leio tudo antes de continuar."*

---

## ⚙️ Geração dos Arquivos (OBRIGATÓRIO — Com Confirmação)

Antes de gravar os arquivos, mostre um resumo rápido dos perfis que serão criados e peça confirmação. Após confirmação:

### Passo 1: Estrutura de pastas

Confirme/crie estas pastas na raiz:
```text
./Perfis/
./Familia/
./Frameworks/
./_Caixa de Entrada/
```

### Passo 2: Criar um perfil por membro (usando os Templates Oficiais)

Leia os templates correspondentes em `.agents/skills/salus-onboarding/templates/` (`Perfil_Humano/`, `Perfil_Cao/` ou `Perfil_Gato/`) para manter exatamente a estrutura de tabelas e seções padronizadas. Para `tipo: outro` (ave, roedor, réptil…), use o template de cão ou gato como base e adapte vacinas/antiparasitários ao que o veterinário orientar — nunca copie o calendário de cão/gato por analogia.

Para CADA membro da família, crie a pasta `./Perfis/[Nome]/` e dentro dela:
- `./Perfis/[Nome]/Ficha.md`
- `./Perfis/[Nome]/Medicamentos.md`
- `./Perfis/[Nome]/Genetica.md`
- `./Perfis/[Nome]/Historico.md`
- `./Perfis/[Nome]/Exames.md`
- `./Perfis/[Nome]/Analises/` (pasta vazia com `.gitkeep`)
- `./Perfis/[Nome]/Documentos/` (subpastas: `Exames/`, `Laudos/`, `Receitas/`, `Requisicoes/`, `Vacinas/`, `Audios/`)

> **Regra de medicamentos no Onboarding:** Se houver receitas nos documentos iniciais, pergunte se o medicamento já está sendo tomado/comprado (`Em uso`) ou se é apenas prescrição (`Prescrito`), diferenciando uso contínuo (`renova_em`) de tratamento com fim programado (`termino_em`).

### Passo 3: Criar os arquivos de `Familia/` (usando os Templates de `templates/Familia/`)

Use os modelos de `.agents/skills/salus-onboarding/templates/Familia/` para gerar:
- `./Familia/_index.yaml` — 🆕 **o mais importante.** Mantenha `schema_versao` do template e preencha um bloco `membros` por pessoa/animal com todos os campos revelados na entrevista e nos documentos (`vinculo` — `nao_aplicavel` para pets —, `alergias` (`[]` só se confirmado "nenhuma"; `null` se não respondido), `condicoes_ativas`, `medicamentos_em_uso` e `medicamentos_prescritos` com `prescrito_por`, `vacinas`, `antiparasitarios` para pets, `exames_pendentes` a partir de requisições encontradas, `proximos_checkups`, `marcadores_chave`). Este arquivo é o que todas as skills leem primeiro.
- `./Familia/META.md` — preencha com a lista de membros, datas (`Onboarding realizado em`, `Última revisão` e `Próxima revisão sugerida` = +6 meses) e mapa de arquivos.
- `./Familia/Arvore.md` — gere o diagrama Mermaid com as relações familiares (humanos com linhas sólidas `---` e pets com linhas pontilhadas `-.-`).
- `./Familia/Agenda.md` — gere a partir do `_index.yaml` (vacinas, antiparasitários, renovações/términos de medicamentos e check-ups ordenados por data).
- `./Familia/Linha_do_Tempo_Geral.md`
- `./Familia/Medicamentos_Ativos.md`
- `./Familia/Genetica_Familiar.md`

> Nota: `Agenda.md`, `Medicamentos_Ativos.md` e `Genetica_Familiar.md` são VIEWS derivadas — o conteúdo primário vive em `Familia/_index.yaml` e nos arquivos de cada perfil.

### Passo 4: System Prompt (o "cérebro") — canônico + stubs

Leia `.agents/skills/salus-onboarding/resources/SALUS_TEMPLATE.md`. Preencha as variáveis (`{{NOME_FAMILIA}}` e `{{DATA_ONBOARDING}}` — só essas; a lista de membros e a data da próxima revisão NÃO vão para o cérebro, elas vivem em `Familia/META.md` e `Familia/_index.yaml`), mantenha a primeira linha com o marcador `<!-- salus-template: ... -->`, e salve o conteúdo completo **apenas em `AGENTS.md`** (arquivo canônico). Nos outros quatro (`GEMINI.md`, `CLAUDE.md`, `CODEX.md`, `.cursorrules`) grave só um ponteiro curto:

```markdown
# Salus — Central de Saúde da Família {{NOME_FAMILIA}}

As instruções completas deste assistente estão em `AGENTS.md`. Leia esse arquivo
e siga-o integralmente antes de responder qualquer coisa neste diretório.
```

Isso evita manter (e reler) cinco cópias idênticas do mesmo cérebro — qualquer assistente de IA converte automaticamente para o mesmo ponto focal.

### Passo 5: Mensagem final

Mostre ao usuário a lista do que foi criado e explique que o Salus sempre pedirá confirmação antes de salvar qualquer nova informação. Destaque que `Familia/Agenda.md` mostra "o que vem pela frente" e apresente os principais atalhos (`"raio-x"`, `"organiza a caixa de entrada"`, `"prepara a consulta do [nome]"`).

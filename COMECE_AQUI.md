# Bem-vindo ao Salus 🩺 (v0.4.0)

O Salus é a central de saúde da sua família — pessoas e animais. Ele guarda seus exames, receitas, laudos, carteirinhas de vacinação e orientações médicas em um só lugar, e você pode conversar com a IA sobre tudo isso com total privacidade.

---

## ⚡ Como instalar e atualizar

### Método 1: Via NPX (Recomendado 🚀)
> **Pré-requisito:** É necessário ter o [Node.js](https://nodejs.org/) instalado no computador.

Abra o terminal na pasta onde quer salvar sua central de saúde e execute:

```bash
npx salus-ai init
```

- *Para criar uma nova pasta, passe o nome no final:* `npx salus-ai init MinhaSaude`
- *Para atualizar uma pasta já existente sem perder seus dados:* `npx salus-ai update`
- *Para verificar a saúde da estrutura da pasta:* `npx salus-ai doctor`

### Método 2: Manual
Abra esta pasta no seu assistente de IA preferido (Claude, Gemini, Cursor, Codex, etc.).

---

## 🚀 Como usar (não precisa saber nada técnico)

**1. Para começar:** abra a pasta no seu app de IA e diga:

> **"Quero montar meu Salus"**

A IA vai fazer algumas perguntas simples sobre quem são as pessoas e animais da família, como montar a árvore familiar, e se você já tem exames ou documentos para ela ler.

**2. Para adicionar um documento novo** (exame, receita, laudo, carteira de vacina, foto, áudio de orientação do médico):

- Arraste o arquivo para a pasta `_Caixa de Entrada`
- Diga para a IA: **"organiza a caixa de entrada"** (ou *"chegou um exame novo do [nome]"*)

A IA lê o arquivo, entende do que se trata, e mostra um plano de arquivamento para sua confirmação.

> 🔒 **PREMISSA BÁSICA DO SALUS:** A IA **SEMPRE PERGUNTA** antes de salvar ou alterar qualquer informação clínica nos seus arquivos. Medicamentos prescritos em receitas só são marcados como "Em uso" se você confirmar que comprou ou já está tomando.

**3. Para consultar informações e preparar consultas**:

- *"Como está a saúde do Rex?"*
- *"O colesterol do Alberth melhorou desde o ano passado?"*
- *"Vou ao cardiologista amanhã, prepara um resumo pro médico"* (aciona a skill `preparar-consulta`)
- *"Alguma vacina, antipulgas ou receita está vencendo?"*

---

## 💡 Atalhos em Linguagem Natural

| Diga isso | Para... |
|---|---|
| `"raio-x"` ou `"como estamos?"` | Ver o panorama de saúde de toda a família (remédios ativos, vacinas, antiparasitários, receitas vencendo e tratamentos concluídos) e atualizar a Agenda |
| `"o que está vencendo"` | Ver rapidamente a `Familia/Agenda.md` — o que vence e quando, sem rodar o raio-x inteiro |
| `"registra que..."` | Anotar rapidamente uma consulta, sintoma, vacina, antiparasitário ou remédio (pede confirmação antes) |
| `"organiza a caixa de entrada"` | Processar os documentos novos da pasta de entrada |
| `"cruza os exames de..."` | Comparar e relacionar exames ao longo do tempo (oferece salvar análise com data) |
| `"prepara a consulta do [nome]"` | Gerar resumo de 1 página para levar ao médico, veterinário ou pronto-socorro |
| `"revisar salus"` | Checar o que está vencendo (vacinas, antiparasitários, check-ups, receitas e tratamentos encerrados) |

---

## 📂 O que você vai encontrar

### Na pasta `Familia/`
- **`Agenda.md`** — o que está vencido, encerrado ou vencendo (vacinas, antiparasitários, receitas, check-ups), sempre em dia.
- **`META.md`** — o índice principal com todos os membros (para você olhar; a IA usa o `_index.yaml` internamente).
- **`Arvore.md`** — um diagrama visual desenhando a estrutura da sua família (pessoas e pets).
- **`Linha_do_Tempo_Geral.md`**, **`Medicamentos_Ativos.md`** e **`Genetica_Familiar.md`** — visões consolidadas de toda a família.

### Na pasta de cada membro (`Perfis/[Nome]/`)
- **`Ficha.md`** — o resumo de 1 página: tipo sanguíneo, alergias, condições, vacinas, antiparasitários (pets), contatos de emergência.
- **`Medicamentos.md`** — histórico completo de medicamentos (`Em uso`, `Prescritos` e `Descontinuados / Histórico`).
- **`Genetica.md`** — histórico genético individual, condições hereditárias da linhagem biológica e predisposições raciais.
- **`Historico.md`** — a linha do tempo individual de tudo que aconteceu.
- **`Exames.md`** — valores de exames e sinais vitais (peso, pressão, glicemia) organizados ao longo do tempo.
- **`Analises/`** — comparativos, preparos de consulta e relatórios salvos com carimbo de data/hora e tabela de fontes.
- **`Documentos/`** — arquivos originais organizados em subpastas (`Exames/`, `Laudos/`, `Receitas/`, `Requisicoes/`, `Vacinas/`, `Audios/`).

---

## 🛡️ Importante

O Salus **organiza e cruza informação — ele não diagnostica nem substitui médico ou veterinário.** Sempre que algo parecer alterado, ele vai sugerir que você mostre para um profissional.

Tudo fica **salvo localmente nesta pasta**, no seu computador.

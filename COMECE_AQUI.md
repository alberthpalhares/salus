# Bem-vindo ao Salus 🩺 (v0.3.0)

O Salus e a central de saude da sua familia — pessoas e animais. Ele guarda seus exames, receitas, laudos e orientacoes medicas em um so lugar, e voce pode conversar com a IA sobre tudo isso com total privacidade.

---

## ⚡ Como instalar e usar

### Método 1: Via NPX (Recomendado 🚀)
> **Pré-requisito:** É necessário ter o [Node.js](https://nodejs.org/) instalado no computador.

Abra o terminal na pasta onde quer salvar sua central de saude e execute:

```bash
npx salus-ai init
```

*Dica: Se quiser criar uma nova pasta, passe o nome no final: `npx salus-ai init MinhaSaude`.*

### Método 2: Manual
Abra esta pasta no seu assistente de IA preferido (Claude, Gemini, Cursor, Codex, etc.).

---

## 🚀 Como usar (não precisa saber nada técnico)

**1. Para começar:** abra a pasta no seu app de IA e diga:

> **"Quero montar meu Salus"**

A IA vai fazer algumas perguntas simples sobre quem sao as pessoas e animais da familia, como montar a árvore familiar, e se voce ja tem exames ou documentos para ela ler.

**2. Para adicionar um documento novo** (exame, receita, laudo, foto, audio de orientacao do medico):

- Arraste o arquivo para a pasta `_Caixa de Entrada`
- Diga para a IA: **"organiza a caixa de entrada"** (ou *"chegou um exame novo do [nome]"*)

A IA le o arquivo, entende do que se trata, e mostra um plano de arquivamento para sua confirmacao.

> 🔒 **PREMISSA BASICA DO SALUS:** A IA **SEMPRE PERGUNTA** antes de salvar ou alterar qualquer informacao nos seus arquivos. Medicamentos prescritos em receitas so sao marcados como "Em uso" se voce confirmar que comprou ou ja esta tomando.

**3. Para consultar informacoes e preparar consultas**:

- *"Como esta a saude do Rex?"*
- *"O colesterol do Alberth melhorou desde o ano passado?"*
- *"Vou ao cardiologista amanha, prepara um resumo pro medico"* (aciona a skill `preparar-consulta`)
- *"Alguma vacina ou receita esta vencendo?"*

---

## 💡 Atalhos em Linguagem Natural

| Diga isso | Para... |
|---|---|
| `"raio-x"` ou `"como estamos?"` | Ver o panorama de saude de toda a familia (remedios ativos, vacinas e receitas vencendo) e atualizar a Agenda |
| `"o que esta vencendo"` | Ver rapidamente a `Familia/Agenda.md` — o que vence e quando, sem rodar o raio-x inteiro |
| `"registra que..."` | Anotar rapidamente uma consulta, sintoma ou remedio (pede confirmacao antes) |
| `"organiza a caixa de entrada"` | Processar os documentos novos da pasta de entrada |
| `"cruza os exames de..."` | Comparar e relacionar exames ao longo do tempo (oferece salvar analise com data) |
| `"prepara a consulta do [nome]"` | Gerar resumo de 1 pagina para levar ao medico ou veterinario |
| `"revisar salus"` | Checar o que esta vencendo (vacinas, check-ups, receitas da familia) |

---

## 📂 O que você vai encontrar

### Na pasta `Familia/`
- **`Agenda.md`** — 🆕 o que está vencido ou vencendo (vacinas, receitas, check-ups), sempre em dia.
- **`META.md`** — o índice principal com todos os membros (para você olhar; a IA usa o `_index.yaml` internamente).
- **`Arvore.md`** — um diagrama visual desenhando a estrutura da sua família (pessoas e pets).
- Arquivos consolidados de linha do tempo e genética.

### Na pasta de cada membro (`Perfis/[Nome]/`)
- **`Ficha.md`** — o resumo de 1 pagina: tipo sanguineo, alergias, condicoes, vacinas, contatos de emergencia.
- **`Medicamentos.md`** — historico completo de medicamentos (`Em uso`, `Prescritos` e `Descontinuados`).
- **`Genetica.md`** — historico genetico individual, condicoes hereditarias da linhagem biologica e predisposicoes raciais.
- **`Historico.md`** — a linha do tempo individual de tudo que aconteceu.
- **`Exames.md`** — valores de exames e sinais vitais (peso, pressao, glicemia) organizados ao longo do tempo.
- **`Analises/`** — comparativos e relatorios salvos com carimbo de data/hora e tabela de fontes.
- **`Documentos/`** — arquivos originais organizados em subpastas (`Exames/`, `Laudos/`, `Receitas/`, `Audios/`).

---

## 🛡️ Importante

O Salus **organiza e cruza informacao — ele nao diagnostica nem substitui medico ou veterinario.** Sempre que algo parecer alterado, ele vai sugerir que voce mostre para um profissional.

Tudo fica **salvo localmente nesta pasta**, no seu computador.

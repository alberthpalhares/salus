# Salus 🩺 — Central de Inteligência de Saúde da Família (v0.2.1)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/status-v0.2.1--beta-orange.svg)]()
[![NPM Package](https://img.shields.io/badge/npm-salus--ai-red.svg)](https://www.npmjs.com/package/salus-ai)
[![Platform: Multi-AI](https://img.shields.io/badge/IA-Claude%20%7C%20Gemini%20%7C%20Cursor%20%7C%20Codex-blue.svg)]()

**Salus** é um repositório local e inteligente para gerenciar o histórico de saúde de toda a família — **pessoas e animais de estimação (cães e gatos)**.

Inspirado na mecânica do [Córtex](https://github.com/alberthpalhares/cortex), o Salus transforma exames de laboratório, laudos, receitas médicas, fotos e áudios de orientações em um **histórico vivo em Markdown**, permitindo que qualquer assistente de IA com acesso a arquivos locais leia, organize e cruze informações em linguagem natural.

---

## ⚡ Instalação Rápida (Via NPX 🚀)

### 📋 Pré-requisito
Para utilizar o instalador via terminal, é necessário ter o **Node.js** instalado no seu computador.
- Se você ainda não tem o Node.js instalado, faça o download da versão recomendada no site oficial: [Node.js (nodejs.org)](https://nodejs.org/).

### 🛠️ Comando de Instalação
Abra o terminal na pasta onde deseja criar sua central de saúde e execute:

```bash
npx salus-ai init
```

*Dica: Para criar uma pasta específica, basta passar o nome no comando:*
```bash
npx salus-ai init MinhaSaude
```

Após executar o comando, abra a pasta gerada na sua ferramenta de IA (Claude, Gemini, Cursor, Codex, etc.) e diga no chat:

> **"Quero montar meu Salus"**

---

## 🌟 Princípios Orientadores (v0.2.0)

- 🔒 **Consentimento em 1º Lugar**: O Salus **NUNCA salva ou altera arquivos sem perguntar antes**. Tudo é apresentado para confirmação prévia do usuário.
- 💊 **Gestão Inteligente de Medicamentos**: Arquivo `Medicamentos.md` individual por perfil. Medicamentos prescritos em receitas só passam para "Em uso" após confirmação do usuário de que comprou/está tomando.
- 👨‍👩‍👧 **Diversidade Familiar & Genética**: Registro de parentesco e vínculo biológico (`Biológico`, `Adotivo`, `Enteado`). O cruzamento genético é aplicado exclusivamente a membros com vínculo biológico.
- 📊 **Análises Salvas com Timestamp e Fontes**: Comparativos e relatórios de evolução são salvos em `Perfis/[Nome]/Analises/` acompanhados da data/hora exata e da lista de documentos consultados.
- 🏥 **Preparo para Consultas (`preparar-consulta`)**: Gera resumos em 1 página focados na especialidade médica/veterinária para levar ao consultório.
- 📁 **Entrada Única (`_Caixa de Entrada/`)**: Arraste qualquer documento (PDF, foto, áudio) para uma única pasta. A IA lê, classifica e pede confirmação para arquivar.

---

## 💡 Atalhos em Linguagem Natural

| Atalho / Frase | O que faz |
|---|---|
| `"npx salus-ai init"` | Inicializa a estrutura do Salus em qualquer pasta via terminal. |
| `"raio-x"` ou `"como estamos?"` | Exibe o panorama completo de saúde da família (remédios ativos, vacinas e receitas vencendo). |
| `"registra que..."` | Anota rapidamente uma consulta, sintoma, vacina ou medicamento (pede confirmação antes de gravar). |
| `"organiza a caixa de entrada"` | Processa e pede autorização para arquivar novos documentos. |
| `"cruza os exames de..."` | Compara marcadores ao longo do tempo (respeita vínculo biológico e oferece salvar análise com timestamp). |
| `"prepara a consulta do [nome]"` | Gera resumo de 1 página focado na especialidade para levar ao médico/veterinário. |
| `"revisar salus"` | Revisa receitas, vacinas e check-ups pendentes da família. |
---

## 📂 Estrutura do Repositório

```text
Salus/
├── CLAUDE.md · GEMINI.md · CODEX.md · AGENTS.md · .cursorrules  ← Inicialização multi-IA
├── COMECE_AQUI.md             ← Guia rápido do usuário final
├── PLANO_SALUS.md             ← Documento de arquitetura v2.0
├── README.md                  ← Este arquivo
├── CHANGELOG.md               ← Histórico de versões
├── LICENSE                    ← Licença MIT
├── package.json               ← Configuração do pacote NPX (salus-ai)
├── bin/cli.js                 ← Script CLI do instalador NPX
├── _Caixa de Entrada/         ← Pasta única para upload de novos arquivos (PDF, imagens, áudios)
├── Frameworks/
│   └── PROTOCOLO_CLINICO.md   ← Diretrizes de segurança, interações medicamentosas e regras de vínculo
├── .agents/skills/
│   ├── salus-onboarding/      ← Skill de entrevista inicial (parentesco, vínculo, criação de perfis)
│   ├── raio-x/                ← Skill de panorama rápido da família e receitas a renovar
│   ├── registrar/             ← Skill de apontamento de eventos com confirmação obrigatória
│   ├── salus-organiza/        ← Skill de triagem da caixa de entrada com regra de prescrições
│   ├── cruzar/                ← Skill de evolução temporal e salvamento de análises com timestamp
│   ├── preparar-consulta/     ← 🆕 Skill de preparo de relatórios para consultas médicas/vet
│   └── salus-revisao/         ← Skill de auditoria periódica de saúde da família
├── Perfis/
│   ├── [Nome da Pessoa]/
│   │   ├── Ficha.md           ← Resumo de 1 página (parentesco, vínculo biológico, alergias, vacinas)
│   │   ├── Medicamentos.md    ← Controle de medicamentos (Em uso, Prescritos, Descontinuados)
│   │   ├── Genetica.md        ← 🆕 Histórico genético individual e condições hereditárias
│   │   ├── Historico.md       ← Linha do tempo individual
│   │   ├── Exames.md          ← Tabela evolutiva de marcadores e sinais vitais (peso, pressão, glicemia)
│   │   ├── Analises/          ← Análises salvas com timestamp e tabela de fontes
│   │   └── Documentos/        ← Exames, laudos, receitas e áudios originais
│   └── [Nome do Pet]/         ← Estrutura adaptada para cão ou gato
└── Familia/
    ├── META.md                ← Índice central (membros, parentesco e vínculo biológico)
    ├── Linha_do_Tempo_Geral.md← Histórico unificado da família
    ├── Medicamentos_Ativos.md ← Tabela consolidada de medicamentos em uso
    └── Genetica_Familiar.md   ← Mapeamento de condições hereditárias (apenas vínculo biológico)
```

---

## 🤖 Compatibilidade Multi-Agente

O Salus é nativamente compatível com:
- **Claude Desktop / Claude Code** (`CLAUDE.md`)
- **Google Gemini / Antigravity** (`GEMINI.md`)
- **OpenAI Codex / ChatGPT CLI** (`CODEX.md`)
- **Cursor / Windsurf** (`.cursorrules` & `AGENTS.md`)

---

## 🛡️ Segurança Clínica & Isenção de Responsabilidade

> [!CAUTION]
> O **Salus** é um sistema de **organização, arquivamento e cruzamento de informações de saúde**. Ele **NÃO faz diagnósticos, NÃO prescreve tratamentos e NÃO substitui a avaliação de um médico ou veterinário**.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido por <a href="https://github.com/alberthpalhares">Alberth Palhares</a>
</p>

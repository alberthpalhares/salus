# Salus 🩺 — Central de Inteligência de Saúde da Família

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: Stable](https://img.shields.io/badge/status-stable-brightgreen.svg)]()
[![Platform: Multi-AI](https://img.shields.io/badge/IA-Claude%20%7C%20Gemini%20%7C%20Cursor%20%7C%20Codex-blue.svg)]()

**Salus** é um repositório local e inteligente para gerenciar o histórico de saúde de toda a família — **pessoas e animais de estimação (cães e gatos)**. 

Inspirado na mecânica do [Córtex](https://github.com/alberthpalhares/cortex), o Salus transforma exames de laboratório, laudos, receitas médicas, fotos e áudios de orientações em um **histórico vivo em Markdown**, permitindo que qualquer assistente de IA com acesso a arquivos locais leia, organize e cruze informações em linguagem natural.

---

## 🌟 Princípios Orientadores

- 🔒 **Privacidade em 1º Lugar**: Todos os seus dados de saúde pertencem a você e ficam armazenados exclusivamente na sua máquina em arquivos simples `.md` e PDFs/fotos originais.
- 🐶🐱 **Pessoas e Animais como Perfis de Primeira Classe**: Acompanhamento completo para membros humanos e animais (com tabelas de vacinação específicas, cálculo de vermífugos por peso, predisposições raciais e castração/microchip).
- 📁 **Entrada Única (`_Caixa de Entrada/`)**: Arraste qualquer documento (PDF, foto torta de receita manuscrita, áudio de consulta) para uma única pasta. A IA classifica, renomeia e arquiva no perfil correto.
- 📄 **A `Ficha.md` de 1 Página**: Cada perfil possui um resumo executivo exportável/imprimível (tipo sanguíneo, alergias, condições ativas, vacinas e contatos de emergência) pronto para ser levado ao pronto-socorro ou consulta médica/veterinária.
- 💬 **Linguagem Natural Sem Complicação**: Sem comandos decorados ou scripts técnicos. Pergunte naturalmente como se falasse com quem acompanha sua saúde há anos.

---

## 🚀 Como Usar (Início Rápido)

### 1. Inicialização e Onboarding

Abra a pasta do repositório no seu assistente de IA preferido (Claude, Gemini, Cursor, Windsurf, Codex, etc.) e diga:

> **"Quero montar meu Salus"**

A IA iniciará uma breve entrevista guiada para mapear os membros da sua família (humanos e pets) e ler os exames ou documentos que você já tiver.

### 2. Adicionando Novos Documentos

Sempre que fizer um exame ou receber um laudo/receita:
1. Copie o arquivo para a pasta `_Caixa de Entrada/`
2. Diga para a IA: **"organiza a caixa de entrada"** ou **"chegou um exame novo"**

A IA lerá o conteúdo nativamente, renomeará para o padrão `AAAA-MM-DD_Tipo_Descrição.ext`, moverá para a pasta do membro correspondente e atualizará a Ficha, o Histórico e a Tabela de Exames.

### 3. Consultas no Dia a Dia

Pergunte livremente sobre a saúde da sua família:

- *"Como está a saúde do Rex?"*
- *"O colesterol do Alberth melhorou em relação ao ano passado?"*
- *"Quais vacinas da família vencem nos próximos 60 dias?"*
- *"Resume a ficha médica da minha mãe para eu levar ao médico."*

---

## 💡 Atalhos em Linguagem Natural

Embora a linguagem seja 100% livre, o Salus possui atalhos prontos para facilitar o dia a dia:

| Atalho / Frase | O que faz |
|---|---|
| `"raio-x"` ou `"como estamos?"` | Exibe o panorama completo de saúde da família (remédios ativos, vacinas e exames pendentes). |
| `"registra que..."` | Anota rapidamente uma consulta, sintoma, vacina ou novo medicamento sem burocracia. |
| `"organiza a caixa de entrada"` | Processa e arquiva os novos documentos deixados na pasta de entrada. |
| `"cruza os exames de..."` | Compara marcadores clínicos ao longo do tempo e relaciona tratamentos. |
| `"revisar salus"` | Executa uma revisão periódica de receitas a renovar, exames de rotina e vacinas. |

---

## 📂 Estrutura do Repositório

```text
Salus/
├── CLAUDE.md · GEMINI.md · CODEX.md · AGENTS.md · .cursorrules  ← Inicialização multi-IA
├── COMECE_AQUI.md             ← Guia rápido do usuário final
├── PLANO_SALUS.md             ← Documento de arquitetura e design
├── README.md                  ← Este arquivo
├── CHANGELOG.md               ← Histórico de versões
├── LICENSE                    ← Licença MIT
├── _Caixa de Entrada/         ← Pasta única para upload de novos arquivos (PDF, imagens, áudios)
├── Frameworks/
│   └── PROTOCOLO_CLINICO.md   ← Diretrizes de segurança + glossário educativo de marcadores
├── .agents/skills/
│   ├── salus-onboarding/      ← Skill de entrevista inicial e criação de perfis
│   ├── raio-x/                ← Skill de panorama rápido da família
│   ├── registrar/             ← Skill de apontamento rápido de eventos
│   ├── salus-organiza/        ← Skill de triagem e arquivamento da caixa de entrada
│   ├── cruzar/                ← Skill de evolução temporal de exames
│   └── salus-revisao/         ← Skill de auditoria e lembretes periódicos
├── Perfis/
│   ├── [Nome da Pessoa]/
│   │   ├── Ficha.md           ← ⭐ Resumo de 1 página (tipo sanguíneo, alergias, remediários, etc.)
│   │   ├── Historico.md       ← Linha do tempo completa de eventos
│   │   ├── Exames.md          ← Tabela evolutiva de marcadores laboratoriais
│   │   └── Documentos/        ← Exames, laudos, receitas e áudios originais
│   └── [Nome do Pet]/         ← Estrutura idêntica adaptada para cão ou gato
└── Familia/
    ├── META.md                ← Índice central dos membros da família
    ├── Linha_do_Tempo_Geral.md← Histórico unificado da família
    ├── Medicamentos_Ativos.md ← Tabela consolidada de medicamentos em uso
    └── Genetica_Familiar.md   ← Mapeamento de condições hereditárias e histórico familiar
```

---

## 🤖 Compatibilidade Multi-Agente

O Salus foi projetado com arquivos de inicialização padronizados que garantem compatibilidade imediata com qualquer IDE ou assistente de IA:

- **Claude Desktop / Claude Code** (`CLAUDE.md`)
- **Google Gemini / Antigravity** (`GEMINI.md`)
- **OpenAI Codex / ChatGPT CLI** (`CODEX.md`)
- **Cursor / Windsurf** (`.cursorrules` & `AGENTS.md`)
- **Agentes Agnósticos** (`AGENTS.md`)

---

## 🛡️ Segurança Clínica & Isenção de Responsabilidade

> [!CAUTION]
> O **Salus** é um sistema de **organização, arquivamento e cruzamento de informações de saúde**. Ele **NÃO faz diagnósticos, NÃO prescreve tratamentos e NÃO substitui a avaliação de um médico ou veterinário**.
> 
> Sempre consulte profissionais de saúde qualificados para decisões clínicas. Em caso de discrepância ou alteração em exames, utilize a `Ficha.md` gerada para levar ao seu médico ou veterinário de confiança.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido por <a href="https://github.com/alberthpalhares">Alberth Palhares</a>
</p>

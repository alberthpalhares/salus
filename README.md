# Salus 🩺 — Central de Inteligência de Saúde da Família (v0.4.0)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/status-v0.4.0--beta-orange.svg)]()
[![NPM Package](https://img.shields.io/badge/npm-salus--ai-red.svg)](https://www.npmjs.com/package/salus-ai)
[![Platform: Multi-AI](https://img.shields.io/badge/IA-Claude%20%7C%20Gemini%20%7C%20Cursor%20%7C%20Codex-blue.svg)]()

**Salus** é um repositório local e inteligente para gerenciar o histórico de saúde de toda a família — **pessoas e animais de estimação (cães e gatos)**.

Inspirado na mecânica do [Córtex](https://github.com/alberthpalhares/cortex), o Salus transforma exames de laboratório, laudos, receitas médicas, carteirinhas de vacinação, fotos e áudios de orientações em um **histórico vivo em Markdown**, permitindo que qualquer assistente de IA com acesso a arquivos locais leia, organize e cruze informações em linguagem natural.

---

## ⚡ Instalação e Atualização Rápida (Via NPX 🚀)

### 📋 Pré-requisito
Para utilizar o instalador via terminal, é necessário ter o **Node.js** instalado no seu computador.
- Se você ainda não tem o Node.js instalado, faça o download da versão recomendada no site oficial: [Node.js (nodejs.org)](https://nodejs.org/).

### 🛠️ Comandos do CLI
Abra o terminal na pasta onde deseja criar ou manter sua central de saúde e execute:

```bash
# Inicializar um novo Salus na pasta atual (ou passe o nome da pasta: npx salus-ai init MinhaSaude)
npx salus-ai init

# Atualizar skills e protocolos sem sobrescrever seus perfis ou o AGENTS.md da família
npx salus-ai update

# Verificar integridade das pastas, perfis e pendências na Caixa de Entrada
npx salus-ai doctor
```

Após inicializar, abra a pasta gerada na sua ferramenta de IA (Claude, Gemini, Cursor, Codex, etc.) e diga no chat:

> **"Quero montar meu Salus"**

---

## 🌟 Princípios Orientadores (v0.4.0)

- 🔒 **Consentimento em 1º Lugar**: O Salus **NUNCA salva ou altera arquivos clínicos sem perguntar antes**. Tudo é apresentado para confirmação prévia do usuário.
- 🧠 **Índice Estruturado como Fonte Única de Verdade (`Familia/_index.yaml`)**: Concentra vínculo, alergias, condições ativas, medicamentos (com renovação ou data de término), vacinas, antiparasitários (para pets) e marcadores-chave de cada membro. Todas as skills leem esse arquivo primeiro.
- 📅 **Agenda de Saúde Proativa (`Familia/Agenda.md`)**: Mostra o que está vencido/ciclo encerrado, vencendo em 30 dias e em 31–90 dias, sincronizada automaticamente após cada registro ou revisão.
- 💊 **Ciclo de Vida Completo de Medicamentos**: Arquivo `Medicamentos.md` individual por perfil (`Em uso`, `Prescritos`, `Descontinuados`). Diferencia medicamentos de **uso contínuo** (`renova_em`) de **tratamentos temporários com fim programado** (`termino_em`), evitando falsos alertas de renovação para antibióticos ou antieméticos de curto prazo.
- 🐾 **Cuidado Completo para Pets**: Controle dedicado de vacinas e antiparasitários (vermífugos e antipulgas/carrapatos) direto no `_index.yaml` e na `Agenda.md`.
- 👨‍👩‍👧 **Diversidade Familiar & Genética**: Registro de parentesco e vínculo biológico (`biologico`, `adotivo`, `enteado`) como campo explícito no índice. O cruzamento genético é aplicado exclusivamente a membros com vínculo biológico.
- 📊 **Análises Salvas com Timestamp e Fontes**: Comparativos e relatórios de evolução são salvos em `Perfis/[Nome]/Analises/` de forma enxuta (dados + conclusão), acompanhados da data/hora exata e da lista de documentos consultados.
- 🏥 **Preparo para Consultas e Pronto-Socorro (`preparar-consulta`)**: Gera resumos em 1 página focados na especialidade médica/veterinária ou fichas rápidas de emergência.
- 📁 **Entrada Única (`_Caixa de Entrada/`)**: Arraste qualquer documento (PDF, foto, áudio) para uma única pasta. A IA lê, classifica e pede confirmação para arquivar.

---

## 💡 Atalhos em Linguagem Natural

| Atalho / Frase | O que faz |
|---|---|
| `"npx salus-ai init"` | Inicializa a estrutura do Salus em qualquer pasta via terminal (com proteção contra sobrescrita). |
| `"npx salus-ai update"` | Atualiza as skills e protocolos do Salus preservando os dados e o `AGENTS.md` da família. |
| `"npx salus-ai doctor"` | Faz um diagnóstico rápido da integridade da pasta, perfis e documentos pendentes. |
| `"raio-x"` ou `"como estamos?"` | Exibe o panorama completo de saúde da família (remédios ativos, vacinas, antiparasitários, receitas vencendo e ciclos encerrados) e atualiza a Agenda. |
| `"o que está vencendo"` | Responde direto a partir da `Familia/Agenda.md`, sem precisar rodar o raio-x inteiro. |
| `"registra que..."` | Anota rapidamente uma consulta, sintoma, vacina, antiparasitário ou medicamento (pede confirmação antes de gravar no perfil, índice e views). |
| `"organiza a caixa de entrada"` | Processa e pede autorização para arquivar novos documentos. |
| `"cruza os exames de..."` | Compara marcadores ao longo do tempo (respeita vínculo biológico e oferece salvar análise com timestamp). |
| `"prepara a consulta do [nome]"` | Gera resumo de 1 página focado na especialidade (ou ficha de pronto-socorro) para levar ao médico/veterinário. |
| `"revisar salus"` | Revisa receitas, tratamentos temporários encerrados, vacinas, antiparasitários e check-ups da família. |

---

## 📂 Estrutura do Repositório

```text
Salus/
├── CLAUDE.md · GEMINI.md · CODEX.md · AGENTS.md · .cursorrules  ← Inicialização multi-IA
├── COMECE_AQUI.md             ← Guia rápido do usuário final
├── README.md                  ← Este arquivo
├── CHANGELOG.md               ← Histórico de versões
├── LICENSE                    ← Licença MIT
├── package.json               ← Configuração do pacote NPX (salus-ai)
├── bin/cli.js                 ← Script CLI (init, update, doctor)
├── _Caixa de Entrada/         ← Pasta única para upload de novos arquivos (PDF, imagens, áudios)
├── Frameworks/
│   └── PROTOCOLO_CLINICO.md   ← Diretrizes de segurança, interações medicamentosas e regras de vínculo
├── .agents/skills/
│   ├── salus-onboarding/      ← Skill de entrevista inicial (parentesco, vínculo, criação de perfis)
│   ├── raio-x/                ← Skill de panorama rápido da família e atualização da Agenda
│   ├── registrar/             ← Skill de apontamento de eventos com sincronia completa
│   ├── salus-organiza/        ← Skill de triagem da caixa de entrada com regra de prescrições
│   ├── cruzar/                ← Skill de evolução temporal e salvamento de análises com timestamp
│   ├── preparar-consulta/     ← Skill de preparo de relatórios para consultas médicas/vet e emergência
│   └── salus-revisao/         ← Skill de auditoria periódica de saúde da família
├── Perfis/
│   ├── [Nome da Pessoa]/
│   │   ├── Ficha.md           ← Resumo de 1 página (tipo sanguíneo, alergias, condições, vacinas, contatos)
│   │   ├── Medicamentos.md    ← Controle de medicamentos (Em uso, Prescritos, Descontinuados)
│   │   ├── Genetica.md        ← Histórico genético individual e condições hereditárias
│   │   ├── Historico.md       ← Linha do tempo individual
│   │   ├── Exames.md          ← Tabela evolutiva de marcadores e sinais vitais (peso, pressão, glicemia)
│   │   ├── Analises/          ← Análises e preparos de consulta salvos com timestamp e fontes
│   │   └── Documentos/        ← Exames, laudos, receitas, requisições, vacinas e áudios originais
│   └── [Nome do Pet]/         ← Estrutura adaptada para cão ou gato (com antiparasitários)
└── Familia/
    ├── _index.yaml            ← Fonte única de verdade (vínculo, alergias, medicamentos, vacinas, antiparasitários, marcadores)
    ├── Agenda.md              ← O que vence e quando — view derivada do índice
    ├── META.md                ← Índice legível por humano (membros, datas de revisão e mapa de arquivos)
    ├── Arvore.md              ← Diagrama visual da árvore familiar em Mermaid (pessoas e pets)
    ├── Linha_do_Tempo_Geral.md← Histórico unificado da família
    ├── Medicamentos_Ativos.md ← Tabela consolidada de medicamentos em uso (view de leitura rápida)
    └── Genetica_Familiar.md   ← Mapeamento de condições hereditárias compartilhadas (apenas vínculo biológico)
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

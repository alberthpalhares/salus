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
Para utilizar o instalador via terminal, é necessário ter o **Node.js 22 ou mais recente** instalado no seu computador.
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
- 🧠 **Índice Estruturado como Fonte Primária (`Familia/_index.yaml`)**: Concentra vínculo, alergias, condições ativas, medicamentos (com renovação, término ou validade da receita), vacinas, antiparasitários (para pets), exames pendentes e marcadores-chave de cada membro. Todas as skills leem esse arquivo primeiro; ele manda em datas e status, e os arquivos de perfil mandam na narrativa.
- 📅 **Agenda de Saúde Proativa (`Familia/Agenda.md`)**: Mostra o que está vencido/ciclo encerrado, vencendo em 30 dias e em 31–90 dias, sincronizada automaticamente após cada registro ou revisão.
- 💊 **Ciclo de Vida Completo de Medicamentos**: Arquivo `Medicamentos.md` individual por perfil (`Em uso`, `Prescritos`, `Descontinuados`). Diferencia medicamentos de **uso contínuo** (`renova_em`) de **tratamentos temporários com fim programado** (`termino_em`), evitando falsos alertas de renovação para antibióticos ou antieméticos de curto prazo.
- 🐾 **Cuidado Completo para Pets**: Controle dedicado de vacinas e antiparasitários (vermífugos e antipulgas/carrapatos) direto no `_index.yaml` e na `Agenda.md`.
- 👨‍👩‍👧 **Diversidade Familiar & Genética**: Registro de parentesco e vínculo biológico (`biologico`, `adotivo`, `enteado`) como campo explícito no índice. O cruzamento genético é aplicado exclusivamente a membros com vínculo biológico.
- 📊 **Análises Salvas com Timestamp e Fontes**: Comparativos e relatórios de evolução são salvos em `Perfis/[Nome]/Analises/` de forma enxuta (dados + conclusão), acompanhados da data/hora exata e da lista de documentos consultados.
- 🏥 **Preparo para Consultas e Pronto-Socorro (`preparar-consulta`)**: Gera resumos em 1 página focados na especialidade médica/veterinária ou fichas rápidas de emergência.
- 📁 **Entrada Única (`_Caixa de Entrada/`)**: Arraste qualquer documento (PDF, foto e, nos assistentes que transcrevem, áudio) para uma única pasta. A IA lê, classifica, mostra os números que leu e pede confirmação para arquivar.
- 🔐 **Privacidade honesta**: os arquivos ficam no seu computador, mas o que a IA lê vai ao provedor do assistente. Veja a seção "Para onde vão seus dados".

---

## 💡 Comandos de terminal e atalhos no chat

**No terminal** (precisam do Node.js):

| Comando | O que faz |
|---|---|
| `npx salus-ai init [pasta]` | Inicializa a estrutura do Salus (lista o que já existe e pede confirmação antes de sobrescrever; `--force` pula a pergunta). |
| `npx salus-ai update [pasta]` | Atualiza skills, protocolos e guia preservando `Perfis/`, `Familia/` e o `AGENTS.md` da família. Só roda em pasta que já é um Salus. |
| `npx salus-ai doctor [pasta]` | Diagnóstico rápido da integridade da pasta, perfis e documentos pendentes. |

**No chat com a IA** (linguagem natural; os atalhos são só exemplos):

| Frase | O que faz |
|---|---|
| `"raio-x"` ou `"como estamos?"` | Exibe o panorama completo de saúde da família (remédios ativos, vacinas, antiparasitários, exames pendentes, receitas vencendo e ciclos encerrados) e atualiza a Agenda. |
| `"o que está vencendo"` | Responde direto a partir da `Familia/Agenda.md`, sem precisar rodar o raio-x inteiro. |
| `"registra que..."` | Anota rapidamente uma consulta, sintoma, vacina, antiparasitário ou medicamento (pede confirmação antes de gravar no perfil, índice e views). |
| `"organiza a caixa de entrada"` | Processa e pede autorização para arquivar novos documentos. |
| `"cruza os exames de..."` | Compara marcadores ao longo do tempo (respeita vínculo biológico e oferece salvar análise com timestamp). |
| `"prepara a consulta do [nome]"` | Gera resumo de 1 página focado na especialidade (ou ficha de pronto-socorro) para levar ao médico/veterinário. |
| `"revisar salus"` | Revisa receitas, tratamentos temporários encerrados, vacinas, antiparasitários, exames pendentes e check-ups da família; também reconstrói/migra o índice e remove membros a pedido. |

---

## 📂 Estrutura do Repositório

```text
Salus/
├── AGENTS.md · CLAUDE.md      ← Instruções de desenvolvimento deste repositório (não vão no pacote npm)
├── README.md                  ← Este arquivo
├── CHANGELOG.md               ← Histórico de versões
├── CONTRIBUTING.md · STATUS.md ← Para quem desenvolve o framework (não vão no pacote npm)
├── docs/                      ← Auditorias, ADRs, desenho e planos (não vão no pacote npm)
├── scripts/check-docs.sh      ← Trava de consistência das docs (roda no CI antes de publicar)
├── LICENSE                    ← Licença MIT
├── package.json               ← Configuração do pacote NPX (salus-ai)
├── src/                       ← Código-fonte do CLI em TypeScript (init, update, doctor; não vai no pacote npm)
│   ├── cli/                   ← Entrada e despacho dos comandos
│   └── core/framework/        ← init, update, doctor e utilitários
├── dist/cli.js                ← CLI empacotado, gerado por `npm run build` (não é commitado; é o binário do pacote)
├── test/                      ← Testes do CLI: unitários e de caracterização (não vão no pacote npm)
└── framework/                 ← Tudo que o `init` copia para a pasta do usuário (espelha o layout do cofre)
    ├── CLAUDE.md · GEMINI.md · CODEX.md · AGENTS.md · .cursorrules  ← Inicialização multi-IA
    ├── COMECE_AQUI.md         ← Guia rápido do usuário final
    ├── _Caixa de Entrada/     ← Pasta única para upload de novos arquivos (PDF, imagens, áudios)
    ├── Frameworks/
    │   └── PROTOCOLO_CLINICO.md   ← Diretrizes de segurança, interações medicamentosas e regras de vínculo
    └── .agents/skills/
        ├── salus-onboarding/  ← Skill de entrevista inicial (parentesco, vínculo, criação de perfis)
        ├── raio-x/            ← Skill de panorama rápido da família e atualização da Agenda
        ├── registrar/         ← Skill de apontamento de eventos com sincronia completa
        ├── salus-organiza/    ← Skill de triagem da caixa de entrada com regra de prescrições
        ├── cruzar/            ← Skill de evolução temporal e salvamento de análises com timestamp
        ├── preparar-consulta/ ← Skill de preparo de relatórios para consultas médicas/vet e emergência
        └── salus-revisao/     ← Skill de auditoria periódica de saúde da família
```

Na pasta do usuário, o onboarding cria também `Perfis/` e `Familia/` (não existem neste repositório):

```text
├── Perfis/                    ← (perfis criados no onboarding)
│   ├── [Nome da Pessoa]/
│   │   ├── Ficha.md           ← Resumo de 1 página (tipo sanguíneo, alergias, condições, vacinas, contatos)
│   │   ├── Medicamentos.md    ← Controle de medicamentos (Em uso, Prescritos, Descontinuados)
│   │   ├── Genetica.md        ← Histórico genético individual e condições hereditárias
│   │   ├── Historico.md       ← Linha do tempo individual
│   │   ├── Exames.md          ← Tabela evolutiva de marcadores e sinais vitais (peso, pressão, glicemia)
│   │   ├── Analises/          ← Análises e preparos de consulta salvos com timestamp e fontes
│   │   └── Documentos/        ← Exames, laudos, receitas, requisições, vacinas e áudios originais
│   └── [Nome do Pet]/         ← Estrutura adaptada para cão ou gato (com antiparasitários)
└── Familia/                   ← (criada no onboarding a partir dos templates)
    ├── _index.yaml            ← Fonte estruturada (vínculo, alergias, medicamentos, vacinas, antiparasitários, exames pendentes, marcadores)
    ├── Agenda.md              ← O que vence e quando — view derivada do índice
    ├── META.md                ← Índice legível por humano (membros, datas de revisão e mapa de arquivos)
    ├── Arvore.md              ← Diagrama visual da árvore familiar em Mermaid (pessoas e pets)
    ├── Linha_do_Tempo_Geral.md← Histórico unificado da família
    ├── Medicamentos_Ativos.md ← Tabela consolidada de medicamentos em uso (view de leitura rápida)
    └── Genetica_Familiar.md   ← Mapeamento de condições hereditárias compartilhadas (apenas vínculo biológico)
```

---

## 🤖 Compatibilidade Multi-Agente

Funciona com qualquer assistente que leia os arquivos da pasta e siga instruções. Depois do onboarding, `AGENTS.md` é o cérebro canônico e os outros arquivos são ponteiros para ele.

| Assistente | O que ele lê | Observação |
|---|---|---|
| **Claude Code** | `CLAUDE.md` → `AGENTS.md` | Não descobre `.agents/skills/` sozinho; o `AGENTS.md` traz a tabela de skills com caminhos. |
| **Codex CLI** | `AGENTS.md` | Lê `.agents/skills/` nativamente. `CODEX.md` é mantido só por compatibilidade. |
| **Gemini CLI / Antigravity** | `GEMINI.md` → `AGENTS.md` | Único que transcreve áudio nativamente. |
| **Cursor** | `.cursorrules` (legado) e `AGENTS.md` | O formato atual do Cursor é `.cursor/rules/`; `.cursorrules` ainda é aceito. |
| **Windsurf** | `AGENTS.md` | Não lê `.cursorrules`. |

Aplicativos de chat comuns (Claude Desktop, ChatGPT no navegador) **não** leem a pasta automaticamente. Áudio só é ouvido por assistentes que transcrevem áudio nativamente; nos demais, descreva o conteúdo para a IA.

---

## 🔐 Para onde vão seus dados

- Os arquivos ficam na pasta, no computador do usuário. O Salus não tem servidor nem conta.
- O que a IA lê para responder (trechos de exames, o índice da família) **é enviado ao provedor do assistente** (Anthropic, Google, OpenAI, Cursor…). Dependendo do plano, pode ser retido ou usado para treinamento — prefira um plano/provedor que não treine com os dados.
- Dados de saúde são dados pessoais sensíveis (LGPD, art. 5º, II): consentimento dos adultos envolvidos, cuidado com menores, e fluxo de remoção de membro a pedido (`"remover [nome] do Salus"`).
- Backup em nuvem só com criptografia. Nunca publique a pasta em repositório público.

---

## 🛡️ Segurança Clínica & Isenção de Responsabilidade

> [!CAUTION]
> O **Salus** é um sistema de **organização, arquivamento e cruzamento de informações de saúde**. Ele **NÃO faz diagnósticos, NÃO prescreve tratamentos e NÃO substitui a avaliação de um médico ou veterinário**. Os avisos de alergia e interação medicamentosa são lembretes gerados pela IA, podem estar incompletos, e a ausência de aviso não significa segurança.

---

## 📜 Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido por <a href="https://github.com/alberthpalhares">Alberth Palhares</a>
</p>

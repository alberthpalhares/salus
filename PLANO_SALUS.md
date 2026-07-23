# Plano — Salus v0.2.0 (Central de Inteligencia de Saude da Familia)

> Documento de planejamento do framework Salus v0.2.0.

## 1. O que e

O Salus e para saude o que o [Cortex](https://github.com/alberthpalhares/cortex) e para negocios: um repositorio local de arquivos `.md` + documentos brutos (exames, laudos, receitas, audios) que qualquer IA com acesso a arquivos locais le para dar ao usuario um historico de saude vivo — de pessoas e animais da familia — cruzando exames de epocas diferentes, relacionando condicoes, medicamentos e sintomas, e dando uma visao ampla do quadro de saude.

## 2. Principios orientadores

1. **Simplicidade para o usuario comum**: Linguagem natural, instalacao via `npx salus-ai init`, zero esforco tecnico.
2. **Privacidade e Controle Total**: Tudo fica local. O Salus **SEMPRE PERGUNTA** antes de salvar ou alterar qualquer arquivo (premissa basica).
3. **Perfis Isolados com Visao Consolidada**: Cada membro tem seus proprios arquivos (`Ficha.md`, `Medicamentos.md`, `Historico.md`, `Exames.md`, `Analises/`). A pasta `Familia/` fornece visao agregada.
4. **Diversidade Familiar & Vinculo Biologico**: Parentesco registrado no `META.md`. Cruzamento genetico ativado exclusivamente entre membros com vinculo `Biologico`.

## 3. Decisoes de Design v2.0

| Decisao | Escolha | Por que |
|---|---|---|
| Instalacao | **`npx salus-ai init [pasta]`** | Instalacao em um comando via Node.js, no mesmo modelo do Cortex. |
| Consentimento | **Confirmacao obrigatoria antes de gravar** | A IA nunca altera arquivos silenciosamente. Mostre o que sera gravado e peça confirmacao. |
| Medicamentos | **Arquivo dedicado `Medicamentos.md` por perfil** | Separa medicamentos ativos de descontinuados e prescritos. Remedio em receita so vira "Em uso" se o usuario confirmar que comprou/esta tomando. |
| Parentesco | **Parentesco + Vinculo biologico no `META.md`** | Respeita estruturas familiares diversas. Genética so e cruzada se houver vinculo biologico. |
| Analises | **Pasta `Analises/` por perfil com carimbo e fontes** | Comparativos e sugestoes para o medico sao salvos com timestamp e tabela de documentos consultados. |
| Preparo de Consulta | **Skill `preparar-consulta`** | Gera resumo focado na especialidade para levar ao medico ou veterinario. |

## 4. Estrutura de pastas final

```
Salus/
├── CLAUDE.md · GEMINI.md · CODEX.md · AGENTS.md · .cursorrules   ← arquivos de inicializacao
├── COMECE_AQUI.md            ← guia de uso em 1 pagina
├── PLANO_SALUS.md            ← este documento de arquitetura
├── README.md · CHANGELOG.md · LICENSE · package.json             ← metadados e instalador NPX
├── bin/cli.js                ← script CLI para npx salus-ai init
├── _Caixa de Entrada/        ← entrada unica de documentos
├── Frameworks/
│   └── PROTOCOLO_CLINICO.md  ← regras de seguranca clinica + glossario
├── .agents/skills/
│   ├── salus-onboarding/     ← entrevista inicial (cria perfis com parentesco e vinculo)
│   ├── raio-x/               ← panorama rapido de saude da familia + alerta de receitas
│   ├── registrar/            ← registra consultas/sintomas (com confirmacao)
│   ├── salus-organiza/        ← triagem da caixa de entrada (com confirmacao e regra de receitas)
│   ├── cruzar/               ← evolucao temporal + analises salvas com timestamp e fontes
│   ├── preparar-consulta/    ← 🆕 resumo focado para levar ao medico/veterinario
│   └── salus-revisao/        ← revisao periodica + commit Git opcional
├── Perfis/
│   ├── [Nome da Pessoa]/
│   │   ├── Ficha.md          ← resumo de 1 pagina (parentesco, vinculo, alergias, condicoes, vacinas)
│   │   ├── Medicamentos.md   ← 🆕 controle de medicamentos (Em uso, Prescritos, Descontinuados)
│   │   ├── Genetica.md       ← 🆕 historico genetico individual e condicoes hereditarias
│   │   ├── Historico.md      ← linha do tempo individual
│   │   ├── Exames.md         ← valores laboratoriais e sinais vitais (peso, pressao, glicemia)
│   │   ├── Analises/         ← 🆕 analises salvas com timestamp e fontes
│   │   └── Documentos/       ← exames, laudos, receitas e audios originais
│   └── [Nome do Animal]/     ← estrutura adaptada para cao ou gato
└── Familia/
    ├── META.md               ← indice geral (membros, parentesco e vinculo biologico)
    ├── Linha_do_Tempo_Geral.md ← linha do tempo consolidada da familia
    ├── Medicamentos_Ativos.md  ← visao consolidada dos medicamentos em uso
    └── Genetica_Familiar.md    ← condicoes hereditarias (apenas vinculo biologico)
```

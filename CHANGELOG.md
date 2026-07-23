# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.2.0] - 2026-07-23

### Adicionado
- **Instalador NPX (`salus-ai`)**: Inicialização simples via terminal com `npx salus-ai init [pasta]`, acompanhado por `package.json` e `bin/cli.js`.
- **Arquivos `Medicamentos.md` individuais por perfil**: Separação clara de medicamentos com seções `Em uso`, `Prescritos` e `Descontinuados/Histórico`.
- **Pasta `Analises/` por perfil**: Salvamento permanente de comparativos e evoluções de marcadores com carimbo de data/hora (`AAAA-MM-DD_HHmm`) e tabela de todos os arquivos fonte utilizados.
- **Skill `preparar-consulta`**: Geração de resumos de 1 página focados na especialidade médica/veterinária para levar a consultas.
- **Parentesco e Vínculo Biológico no `META.md`**: Suporte a estruturas familiares diversas (`Biológico`, `Adotivo`, `Enteado`). O cruzamento genético e hereditário passa a ser aplicado exclusivamente a membros com vínculo biológico confirmado.
- **Sinais Vitais em `Exames.md`**: Seções dedicadas para acompanhamento domiciliar de peso, pressão arterial e glicemia capilar em perfis humanos.
- **Alerta de Interações Medicamentosas**: Avisos calmos e factuais sobre possíveis combinações de medicamentos que exigem avaliação médica.
- **Alerta de Vencimento de Receitas**: Monitoramento de prazos de renovação de receitas em `raio-x` e `salus-revisao`.
- **Versionamento Git Automático**: Sugestão de commit no Git pós-revisões e atualizações estruturais.

### Alterado
- **Premissa Básica de Consentimento**: Regra estrita e inviolável onde o Salus **SEMPRE pede confirmação explícita antes de salvar, arquivar ou alterar qualquer arquivo**.
- **Regra de Cadastramento de Medicamentos**: Medicamentos identificados em receitas ou laudos são registrados com status `Prescrito` por padrão, só passando para `Em uso` após confirmação do usuário de que comprou ou está tomando.
- **Detecção Inteligente de Informações**: A IA reconhece relatos informais de saúde durante qualquer conversa e sugere ao final se o usuário deseja registrar no Salus.
- **Reorganização da pasta `Familia/`**: Os arquivos `Medicamentos_Ativos.md` e `Genetica_Familiar.md` passam a ser visões consolidadas auto-geradas a partir das Fichas e arquivos dos perfis.

---

## [0.1.0] - 2026-07-23

### Adicionado
- **Esqueleto do Framework Salus**: Central local de inteligência de saúde para humanos e animais.
- **Suporte Multi-Agente**: Compatibilidade nativa com Claude, Gemini, Codex, Cursor/Windsurf e agentes genéricos via arquivos de inicialização (`CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `AGENTS.md`, `.cursorrules`).
- **Skill de Onboarding** (`salus-onboarding`): Entrevista guiada nativa com templates para Humanos, Cães, Gatos e Família.
- **Skills de Operação Diária**: `salus-organiza`, `raio-x`, `registrar`, `cruzar`, `salus-revisao`.
- **Protocolo Clínico e Glossário** (`Frameworks/PROTOCOLO_CLINICO.md`).
- **Guia do Usuário** (`COMECE_AQUI.md`).

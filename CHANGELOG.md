# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-07-23

### Adicionado
- **Esqueleto do Framework Salus**: Central local de inteligência de saúde para humanos e animais.
- **Suporte Multi-Agente**: Compatibilidade nativa com Claude, Gemini, Codex, Cursor/Windsurf e agentes genéricos via arquivos de inicialização (`CLAUDE.md`, `GEMINI.md`, `CODEX.md`, `AGENTS.md`, `.cursorrules`).
- **Skill de Onboarding** (`salus-onboarding`): Entrevista guiada nativa com templates para Humanos, Cães, Gatos e Família.
- **Skills de Operação Diária**:
  - `salus-organiza`: Processamento automático de exames, laudos, receitas, fotos e áudios na pasta `_Caixa de Entrada/`.
  - `raio-x`: Panorama consolidado de saúde da família.
  - `registrar`: Registro rápido de consultas, sintomas, vacinas ou novos medicamentos.
  - `cruzar`: Análise comparativa e evolução de marcadores e histórico clínico ao longo do tempo.
  - `salus-revisao`: Revisão periódica de prazos de vacinas, check-ups e renovação de receitas.
- **Protocolo Clínico e Glossário** (`Frameworks/PROTOCOLO_CLINICO.md`): Diretrizes de segurança clínica e glossário educativo de marcadores.
- **Guia do Usuário** (`COMECE_AQUI.md`): Manual em linguagem natural para usuários finais.

# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.3.0] - 2026-07-23

### Adicionado
- **Índice estruturado `Familia/_index.yaml`**: nova fonte única de verdade para a IA — concentra vínculo, condições ativas, medicamentos (com datas de renovação), vacinas, check-ups e marcadores-chave de cada membro. Todas as skills passam a ler este arquivo primeiro, em vez de abrir todos os perfis a cada pergunta.
- **`Familia/Agenda.md`**: view proativa de "o que vem pela frente" (vencido / vencendo em 30 dias / 31-90 dias / sem data), gerada e mantida pelas skills `raio-x` e `salus-revisao`.
- **Núcleo inviolável do Protocolo Clínico**: as regras de segurança clínica que valem para toda resposta (8 regras) agora ficam embutidas no system prompt (`AGENTS.md`); o `Frameworks/PROTOCOLO_CLINICO.md` completo continua como referência para casos específicos.

### Alterado
- **Skills "índice primeiro"**: `raio-x`, `cruzar`, `salus-revisao`, `registrar` e `salus-organiza` agora leem `Familia/_index.yaml` antes de abrir arquivos de perfil completos, e atualizam o índice sempre que gravam um dado novo — reduzindo drasticamente a quantidade de arquivos lidos por consulta.
- **Vínculo biológico**: deixou de ser um comentário HTML oculto em `Familia/META.md` e passou a ser o campo explícito `vinculo` de cada membro em `Familia/_index.yaml` (`biologico` continua sendo o default), tornando a regra de cruzamento genético mais robusta.
- **Arquivos de inicialização multi-IA**: `GEMINI.md`, `CLAUDE.md`, `CODEX.md` e `.cursorrules` deixam de conter uma cópia completa do system prompt e passam a ser ponteiros curtos para o `AGENTS.md` (arquivo canônico gerado pelo onboarding). Evita 5 cópias idênticas do "cérebro" do Salus.
- **Análises salvas (`cruzar`) mais enxutas**: o arquivo salvo em `Analises/` passa a guardar a tabela de dados comparados e uma conclusão curta, em vez da narrativa inteira da resposta.
- **`Medicamentos_Ativos.md` e `Genetica_Familiar.md`**: explicitamente tratados como views de leitura rápida — o dado de verdade vive no `_index.yaml` e nos arquivos de perfil.
- **`Familia/Genetica_Familiar.md`**: adicionada nota visível no topo do arquivo explicando que ele só lista condições que aparecem em 2+ membros com vínculo biológico (cruzamento) — achados genéticos individuais ficam em `Perfis/[Nome]/Genetica.md`. Evita a impressão de que dados genéticos pessoais "sumiram" quando na verdade nunca deveriam estar ali.

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

### Removido
- **Solicitações de Git para Usuário Final**: Removidas todas as sugestões e automações de `git commit` nas skills e templates do Salus, mantendo a ferramenta focada exclusivamente na experiência do usuário final sem expor conceitos de desenvolvimento.

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

# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado
- Formato v2 do cofre especificado em `framework/Frameworks/FORMATO.md`, com os modelos de arquivo em `framework/templates/`.
- Leitura do cofre v2 no CLI, só leitura e com saída `--json` (para agentes e scripts): `membros`, `perfil`, `agenda`, `buscar` e `marcador`, com `--cofre`, `--secao` e `--hoje`. Cada arquivo com problema é apontado sem derrubar a leitura dos demais.
- `npx salus-ai inspecionar [pasta]`: mostra a estrutura de uma pasta (arquivos, seções, colunas, chaves) sem nenhum valor.
- `npx salus-ai anonimizar <origem> <destino>`: grava uma cópia anonimizada de um cofre (nomes, datas, telefones, e-mails e textos livres trocados), repetível com `--semente`. Não pega tudo (nomes de quem não tem perfil em títulos, colunas genéricas, valores YAML e nomes de arquivo; datas em outros formatos): revise a cópia antes de compartilhá-la.

### Alterado
- CLI reescrito em TypeScript e empacotado em `dist/cli.js` (comportamento idêntico, coberto por testes).
- Node mínimo passa a 22.
- `require('salus-ai')` não executa mais o CLI (use `npx salus-ai`).
- Cancelar o prompt do `init` com Ctrl+C/Ctrl+D agora termina com "Operação cancelada" e código 1 (antes saía 0 em silêncio).
- `init` não cria mais `_Caixa de Entrada/.gitkeep` na pasta do usuário (a pasta continua sendo criada).

### Interno
- Bibliotecas de runtime (`zod`, `yaml`, `unified`, `remark-parse`, `remark-gfm`, `remark-frontmatter`) inlinadas em `dist/cli.js` e declaradas em `devDependencies`, sem `dependencies` no pacote publicado (ADR-0008); o teste do bundle confere que ele só importa módulos nativos do Node.
- Núcleo em `src/core/{schema,format,vault,queries,inspecao}`: schema único (Zod), codecs de Markdown e YAML que regravam byte a byte quando nada muda, `Vault.abrir` e as consultas; corpus de arquivos "sujos" em `test/fixtures/dirty/`.
- Produto movido para `framework/`; CI em Linux e Windows; publicação só por tag, por trusted publishing (OIDC) e sem token do npm no repositório.

## [0.4.0] - 2026-10-20

### Adicionado
- **Comandos `npx salus-ai update` e `npx salus-ai doctor` no CLI (`bin/cli.js`)**:
  - `update`: atualiza `.agents/skills/`, `Frameworks/` e `COMECE_AQUI.md` preservando intactos os perfis (`Perfis/`), os dados familiares (`Familia/`) e o cérebro já customizado (`AGENTS.md`).
  - `doctor`: diagnostica a integridade da pasta, valida a presença dos arquivos obrigatórios em cada perfil e avisa quantos documentos estão aguardando triagem em `_Caixa de Entrada/`.
- **Proteção contra sobrescrita acidental no `npx salus-ai init`**: detecta se a pasta já possui um Salus inicializado e solicita confirmação antes de sobrescrever `AGENTS.md` (ou sugere usar `npx salus-ai update`).
- **Diferenciação entre medicamentos de uso contínuo (`renova_em`) e tratamentos temporários (`termino_em`)**: evita que tratamentos de ciclo fechado (ex: antibiótico ou antiemético por 5 dias) sejam reportados como "receita vencida para renovar" após o término, orientando a IA a confirmar a conclusão para movê-los ao histórico.
- **Campos `alergias` e `antiparasitarios` em `Familia/_index.yaml`**:
  - `alergias`: permite checagem imediata de segurança clínica antes de cadastrar novos medicamentos e no preparo de consultas sem precisar abrir `Ficha.md`.
  - `antiparasitarios`: acompanha vencimento de vermífugos e antipulgas/carrapatos de cães e gatos no `raio-x` e na `Familia/Agenda.md`.
- **Modo Ficha de Emergência / Pronto-Socorro e seção de Genética em `preparar-consulta`**: a skill agora segue o padrão Index-First (`Familia/_index.yaml` + `Genetica.md`) e destaca alergias e medicamentos ativos no topo.
- **Subpasta `Vacinas/` em `Perfis/[Nome]/Documentos/`**: dedicada a comprovantes e carteirinhas de vacinação e controle antiparasitário.

### Alterado
- **Sincronia completa das Views Derivadas (`Agenda.md`, `Medicamentos_Ativos.md`, `Linha_do_Tempo_Geral.md`)**: as skills `registrar` e `salus-organiza` agora sincronizam automaticamente a `Agenda.md` e `Medicamentos_Ativos.md` ao gravar novos eventos, medicamentos, vacinas ou antiparasitários, garantindo que o atalho `"o que está vencendo"` esteja sempre atualizado.
- **Alinhamento do `Frameworks/PROTOCOLO_CLINICO.md` e `Perfil_Humano/Genetica.md` com o `_index.yaml`**: removidas as referências residuais à mecânica antiga da v0.2.0 (comentário HTML oculto em `META.md`), unificando a checagem de vínculo biológico exclusivamente no campo `vinculo` de `Familia/_index.yaml`.
- **Padronização das tabelas de `Exames.md` (Humano, Cão e Gato)**: adicionadas as colunas `Unidade` e `Flag (do laudo)` para compatibilidade 1:1 com `Familia/_index.yaml` e `cruzar/SKILL.md`.
- **Cópia por allowlist em `bin/cli.js` e blindagem do `.gitignore`**: o CLI agora copia apenas os itens explícitos do framework (evitando copiar `.github/` ou arquivos de desenvolvimento) e o `.gitignore` passa a ignorar `Familia/*` no repositório base.
- **Padronização ortográfica UTF-8**: revisão completa de acentuação em português em todas as skills, templates, `PROTOCOLO_CLINICO.md`, `SALUS_TEMPLATE.md` e `COMECE_AQUI.md`.

### Corrigido (auditoria de 2026-10-20 — relatório em `docs/auditoria/2026-10-20_auditoria.md`)
- **Cérebro (`SALUS_TEMPLATE.md`)**: ganhou a tabela de skills com caminho e gatilhos (nenhum assistente além do Codex descobre `.agents/skills/` sozinho); deixou de copiar a data da próxima revisão e a lista de membros (vivem em `Familia/META.md` e `_index.yaml`, e ficavam desatualizadas); regras 9 (datas sempre `AAAA-MM-DD`) e 10 (checagem de alergia/interação é lembrete, não garantia); marcador `salus-template: 0.4.0` na primeira linha.
- **Índice (`_index.yaml`)**: `schema_versao`; `prescrito_por` e `validade_receita` em medicamentos; `exames_pendentes` (requisições sumiam da Agenda); `alergias: null` = não perguntado vs `[]` = nenhuma confirmada; `vinculo` aceita `nao_aplicavel`; `alertas_cache` removido (nenhuma skill usava); precedência índice × perfil unificada (índice manda em datas/status, perfil em narrativa) no índice, `META.md` e protocolo.
- **Protocolo clínico**: tabela "Quem lê, quem grava, o que é regenerado sem confirmação" (resolve três versões diferentes da exceção das views derivadas); números lidos de foto/áudio confirmados antes de gravar; seção de privacidade com LGPD, envio ao provedor da IA, backup só com criptografia e remoção de membro; pets fora da genética familiar; espécie `outro`.
- **Skills**: `raio-x` calcula as 4 faixas da Agenda (antes só 2) e inclui exames pendentes e validade de receita; `salus-revisao` ganhou "Reconstruir ou migrar o índice" e "Remover membro"; `salus-organiza` só transcreve áudio onde o assistente suporta, identifica o dono por nome + nascimento/tutor, lista os valores lidos para confirmação e registra requisições em `exames_pendentes`; `preparar-consulta` salva com `AAAA-MM-DD_HHmm` (colidia no mesmo dia), marca alergias não informadas e tipo sanguíneo não verificado; `cruzar` diz no prompt de confirmação que também atualiza o índice; `registrar` cita `atualizado_em`, `prescrito_por` e exames pendentes; `salus-onboarding` pergunta alergias explicitamente e orienta `tipo: outro`.
- **CLI (`bin/cli.js`)**: `init` lista os arquivos que já existem na pasta e pede confirmação (antes sobrescrevia `CLAUDE.md`/`.agents/` de outro projeto sem aviso) e sai com código 1 sem terminal interativo; `update` exige uma pasta que já seja um Salus (antes despejava o framework em qualquer pasta); `doctor` sugere `init` para `AGENTS.md` ausente e "reconstruir o índice" para `_index.yaml` ausente (as sugestões antigas não existiam); opção desconhecida é erro; aliases `check`/`status` documentados; erro no `init` não vaza stack trace.
- **Pacote**: **removidos os aliases de bin `salus` e `salus-framework`** — `salus` é um pacote de terceiro no npm e `npx salus` executaria código alheio; use só `npx salus-ai`. `engines.node >= 18`, `publishConfig.access`, autor alinhado à licença.
- **CI**: smoke test do CLI (init/doctor/update em pasta temporária + `npm pack --dry-run`) antes do publish; `concurrency` contra publicação dupla. `.gitattributes` normaliza LF.
- **Docs**: seção "Para onde vão seus dados" em `COMECE_AQUI.md` e `README.md` (substitui "total privacidade"); tabela de compatibilidade honesta (Claude Desktop/ChatGPT não leem a pasta; Codex lê `AGENTS.md`; só o Gemini transcreve áudio); `Familia/` marcada como criada no onboarding; comandos de terminal separados dos atalhos de chat.
- **Desenvolvimento**: `STATUS.md` (tier T1 e pendências com destino), `CONTRIBUTING.md` e `docs/auditoria/`.

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

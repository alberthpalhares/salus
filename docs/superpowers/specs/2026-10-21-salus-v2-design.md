# Salus v2 — Desenho de reestruturação

Data: 2026-10-21 · Status: aprovado pelo dono em 2026-10-21 · Versões-alvo: v0.5.0 (núcleo + formato v2), v0.6.0 (MCP + tela), v1.0.0 (consolidação)
Revisões incorporadas antes da aprovação: exploração do código e das docs, "teste do construtor" e crítica arquitetural independente.

---

## 0. Contexto — por que mexer na estrutura

A auditoria de 2026-10-20 (`docs/auditoria/2026-10-20_auditoria.md`) corrigiu ~25 itens de **consistência textual e endurecimento do CLI** e adiou **tudo que era estrutural** (DT-01 a DT-08 em `STATUS.md`). O problema do Salus não é texto desalinhado: **não existe código de domínio — existem prompts**.

Surgiu também uma necessidade nova: **uma pessoa da família que não usa IA** precisa consultar (histórico, exames, medicamentos, agenda) e registrar o rotineiro (dose tomada, sintoma, peso, vacina, consulta marcada), do computador dela e do celular/tablet na rede de casa. E a IA deve passar a operar o Salus por **MCP**, não editando arquivos "na mão".

Resultado pretendido: um núcleo de domínio em código, servido por três portas que compartilham o mesmo código — **CLI**, **servidor MCP** e **interface web local** — mantendo Markdown como verdade, dados em casa, instalação por `npx`, e o fluxo conversacional com IA preservado (e mais confiável).

---

## 1. Diagnóstico estrutural (o que a auditoria não atacou)

| # | Problema | Evidência | Consequência |
|---|---|---|---|
| D1 | **Lógica de negócio vive em prompts** | faixas da Agenda (`raio-x`), migração/cascata (`salus-revisao`), renomear/arquivar (`salus-organiza`), gerar perfis (onboarding), "+6 meses", "3 registros na mesma direção" | não determinístico, não testável; o comportamento das skills "num assistente real" nunca foi verificado |
| D2 | **Um fato, 2 a 5 lugares** | um medicamento toca `Medicamentos.md`, `Ficha.md`, `_index.yaml`, `Medicamentos_Ativos.md`, `Agenda.md` | "falha de sincronia" virou regra escrita em 4–6 arquivos em vez de ser impossível |
| D3 | **Views em disco dependentes de "hoje"** | `Agenda.md` vencido/30/90 | envelhece sozinha; "views" definidas de 3 jeitos (2, 3 ou 4 arquivos) |
| D4 | **Sem camada de domínio nem schema** | sub-esquemas só em comentários YAML; datas são strings; placeholders sobram | `doctor` não lê conteúdo e sai 0 com alertas; zero dependências impede até um parser YAML |
| D5 | **Identidade frágil** | `id` no índice × pasta `Perfis/[Nome]`; `tipo` com 3 vocabulários | renomear/homônimos quebram caminhos |
| D6 | **Formatos hostis à máquina** | títulos livres em `Exames.md`; vacinas como checkboxes de texto; parentesco só em Mermaid; `vinculo` por membro; `dose` mistura frequência | impossível construir GUI/MCP confiável por cima |
| D7 | **Cérebro congelado** | `AGENTS.md` mistura regras com nome/data da família (DT-05) | correções nunca chegam a famílias existentes |
| D8 | **Ciclo de vida sem garantias** | `update` sem backup/manifesto/dry-run; `init --force` recoloca stub sobre o cérebro; onboarding não protege `Perfis/` | risco real de perda de dados de saúde |
| D9 | **CLI monolítico e intestável; CI publica em todo push** | `bin/cli.js` 405 linhas CJS, globais, `process.exit`, 0 testes; CI só Linux e só em push na `main` (que **publica**) | nada roda em Windows apesar de `_Caixa de Entrada` |
| D10 | **Repo = pacote = pasta de usuário** | `AGENTS.md`/`CLAUDE.md` da raiz do repo são stubs do produto | sessão de IA no repo lê instruções de usuário final |
| D11 | **Índice inteiro vai ao provedor a cada pergunta** (DT-07); toda leitura/escrita passa pelo LLM | "abra só o que a pergunta exige" × "índice primeiro" | sem acesso local estruturado não há minimização |
| D12 | **Integração multi-assistente por 5 arquivos de texto** | `CODEX.md` redundante; Claude Code não descobre `.agents/skills/`; sem MCP | frágil e manual |

Este desenho absorve **DT-01 a DT-08** integralmente.

---

## 2. Decisões do dono (não derivar do código)

| Tema | Decisão |
|---|---|
| Pessoa-alvo da tela | Membro da família que não usa IA: **consulta tudo e registra o simples** (dose, sintoma, peso, vacina, consulta marcada). Laudos/genética/interpretação continuam com o dono + IA. |
| Aparelhos | **Computador dela (separado)** e **celular/tablet em casa** (rede local). |
| Verdade dos dados | **Markdown continua a fonte única**, legível e editável; índice reconstruível. |
| Como os aparelhos chegam aos dados | **Pasta sincronizada por OneDrive** entre as máquinas. |
| Anti-metas | dados saírem de casa · Markdown ilegível · instalação complicada (continua `npx`; sem Docker/banco/conta) · perder o fluxo com a IA |
| Acesso | **Todos veem tudo**; rede de casa + **PIN simples**. |
| IA / MCP | **Claude Code + Claude Desktop + Codex CLI** via MCP. **`AGENTS.md` é o canônico; `CLAUDE.md`, `GEMINI.md`, `.cursorrules` só o referenciam.** |
| Ordem de entrega | Núcleo primeiro (v0.5.0); depois **MCP e tela estritamente juntos** (v0.6.0). Na Fase 1 a IA escreve via CLI `propor`/`confirmar`. |
| Leitura fora da IA | **Obsidian, VS Code, Explorer** → frontmatter (Propriedades no Obsidian) e tabelas são aceitáveis; texto cru legível. |
| Fixture do mundo real | O dono roda `salus-ai anonimizar` sobre uma **cópia** do cofre real, fora do repo; resultado em `test/fixtures/local/` (gitignored). Dados reais nunca entram no repo. |
| Topologia da casa | PC dela **na mesma rede Wi-Fi**; **nenhuma máquina fica sempre ligada** → não há servidor fixo: os dois PCs podem rodar `serve` sobre a própria cópia do OneDrive. **Duas máquinas escrevendo é o caso normal.** |

---

## 3. Desenho alvo

### 3.1 Princípios de arquitetura

1. **Um fato, um lugar.** Cada dado vive em um único arquivo de verdade. Índice e views são **gerados**, somente-leitura, nunca editados.
2. **Núcleo em código; prompts só para conversa.** Regras verificáveis do núcleo inviolável viram código (máquina de estados de medicamento, consentimento em duas etapas, ISO, flag só com faixa do laudo, espécie como tipo). Skills/prompts ficam com entender, perguntar, apresentar.
3. **Três portas, um motor.** CLI, MCP e HTTP chamam as mesmas funções. Nenhuma regra existe em só uma porta.
4. **O Salus não reescreve o que não é dele.** Gravação por *splice* de regiões gerenciadas; todo o resto do arquivo é copiado byte a byte. Linhas que o núcleo não reconhece dentro de uma região são preservadas como opacas e listadas pelo `doctor`. **Nunca** re-serializar o documento inteiro.
5. **Markdown legível primeiro.** Frontmatter só com escalares e listas de strings (o Obsidian não edita listas de objetos); listas de objetos vão para tabelas com colunas fixas no corpo. Cabeçalhos canônicos. Nada de IDs opacos.
6. **Local, sem banco, sem cache em disco.** Um cofre familiar parseia em dezenas de ms; índice em memória, reconstruído na abertura e mantido por vigia. Nada nativo; `npx` continua funcionando.
7. **Tolerante a nuvem.** Gravação atômica com retry, hash de conteúdo em tudo (nunca mtime), views determinísticas sem relógio, detecção de arquivos inesperados, fusão automática só do que é append-only.
8. **Minimização.** Portas devolvem só o que foi pedido.

### 3.2 Formato do cofre v2 (`schema_versao: 2`)

```
<cofre>/
├── salus.yaml                   manifesto (NOVO): schema_versao: 2, versao_salus, familia, criado_em, ultima_revisao
├── AGENTS.md                    GERADO a cada init/update; sem dados da família
├── CLAUDE.md · GEMINI.md · .cursorrules   ponteiros de 3 linhas (gerados). CODEX.md removido.
├── .mcp.json                    GERADO: servidor MCP do Salus para o Claude Code nesta pasta
├── MIGRACAO_PENDENTE.md         só após migrate: itens de revisão assistida (some quando vazio)
├── Familia/
│   ├── Notas_para_a_IA.md       editável: instruções da família para a IA
│   ├── .gerado/indice.yaml      GERADO, oculto, somente-leitura: visão "quente" por membro p/ agentes sem MCP
│   ├── Agenda.md · Medicamentos_Ativos.md · Linha_do_Tempo_Geral.md · Resumo.md · Arvore.md · Genetica_Familiar.md
│   │                            GERADOS (nome mantido; cabeçalho "GERADO"; atributo somente-leitura reaplicado a cada gravação;
│   │                            edição manual é sobrescrita e registrada no doctor/tela). META.md e _index.yaml deixam de existir.
├── Perfis/<Nome legível>/       pasta com nome humano; `id` estável no frontmatter
│   ├── Ficha.md                 frontmatter (escalares/listas de strings): id, nome, tipo, nascimento, sexo, tipo_sanguineo,
│   │                            plano, papel, alergias (null | [] | [...]), condicoes_ativas, marcadores_chave (nomes),
│   │                            pais_biologicos, responsaveis, tutores, conjuges.
│   │                            corpo: tabelas gerenciadas `## Contatos de emergência` e `## Profissionais de referência`
│   │                            + texto livre.
│   ├── Medicamentos.md          VERDADE. Tabelas fixas Em uso / Prescritos / Descontinuados; Dose e Frequência separadas;
│   │                            Renovação e Término separados; header único "Prescrito por" para todas as espécies.
│   ├── Vacinas.md               NOVO. Tabela de vacinas; em pets, tabela de antiparasitários.
│   ├── Exames.md                VERDADE. `## <Exame>` + tabela (Data|Marcador|Valor|Unidade|Faixa do laudo|Flag do laudo|Obs);
│   │                            sinais vitais em tabelas próprias com cabeçalhos canônicos.
│   ├── Historico.md             VERDADE (log de eventos). `- **AAAA-MM-DD** [tipo] texto`; itens fora da gramática são opacos.
│   ├── Pendencias.md            NOVO. Tabelas: Exames solicitados / Consultas e check-ups marcados.
│   ├── Doses.md                 NOVO, append-only (Data|Hora|Medicamento|Dose|Obs). Sem rotação por enquanto.
│   ├── Genetica.md              frontmatter: condicoes_hereditarias []; corpo livre.
│   ├── Analises/ · Documentos/{Exames,Laudos,Receitas,Requisicoes,Vacinas,Audios}/   como hoje
├── Frameworks/PROTOCOLO_CLINICO.md · Frameworks/FORMATO.md (NOVO: a especificação legível do v2)
├── .agents/skills/*/SKILL.md    finas (3.4)
├── _Caixa de Entrada/           a tela faz upload para cá
└── _Backups/                    AAAA-MM-DD_HHmm_<motivo>/ (texto + manifesto de hash dos binários); removidos/<id>/
```

Contratos garantidos pelo núcleo (detalhados em `Frameworks/FORMATO.md`):
- **Identidade:** `id` slug ASCII único, imutável; pasta renomeável (re-mapeia por `id`).
- **Espécie:** `tipo: pessoa | cao | gato | outro`, um vocabulário só; template para `outro`.
- **Parentesco por relação:** `pais_biologicos` (ids de membros **ou nomes de pessoas sem perfil**; irmãos que listam o mesmo nome externo compartilham linhagem; `doctor` avisa nomes quase iguais) decide cruzamento genético; `responsaveis`, `tutores`, `conjuges` (só árvore). `vinculo` deixa de existir; a migração guarda `migracao_v1: {vinculo}` transitório e põe "informar pais/responsáveis/tutores" no topo de `MIGRACAO_PENDENTE.md`. Ficha/tela não exibem linhagem por padrão.
- **Histórico = eventos imutáveis; tabelas = estado atual.** Nenhuma view deriva estado do Histórico (ADR-0007).
- **Medicamento:** `prescrito → em_uso → descontinuado` por comandos explícitos; nunca entra em `em_uso` sozinho.
- **Exame:** `flag` só com `faixa_do_laudo`; `valor` é string como digitado (`5,5`), `valorNumerico` derivado só para gráfico/tendência.
- **Derivados, não verdade:** `ultimo_exame_em`, `peso_atual`, `proxima_revisao`.
- **Datas:** ISO estrito; aritmética civil em strings (nunca `new Date('AAAA-MM-DD')`); "hoje" injetável.
- **Regiões gerenciadas:** heading canônico (NFC, case-fold) + **primeira** tabela/lista após ele; o resto da seção é livre. Colunas por posição validadas pelo header, com colunas extras pass-through; `|` em célula escapado como `\|`; HTML em célula é texto.
- **Arquivo:** BOM removido na leitura (doctor avisa); **EOL dominante preservado** nos arquivos de verdade; LF só em gerados/novos; leitura truncada → reler após 200 ms.
- **Frontmatter:** `yaml.parseDocument` (preserva comentários e ordem); chaves desconhecidas pass-through; pacote `yaml` (não `js-yaml`: não converte datas).
- **Gerados:** cabeçalho explícito; sem relógio; regravados só se o conteúdo mudou; somente-leitura.
- **Edição direta continua permitida** nos arquivos de verdade (Obsidian, VS Code, agentes sem MCP). O vigia só atualiza a memória; views em disco são regravadas **em todo commit** e no `salus-ai sync`; `doctor` acusa "views desatualizadas"; a tela mostra aviso com "regenerar".
- **Append-only com fusão automática:** `Doses.md` e `Historico.md` fundem cópias em conflito por união de linhas (3-way com a "última cópia gravada" guardada em app-data).

### 3.3 Núcleo de domínio (`src/core`)

| Módulo | Faz |
|---|---|
| `schema/` | Zod: Membro, Medicamento, Vacina, Antiparasitario, Marcador, SinalVital, Evento, Pendencia, Dose, Documento, Manifesto; enums únicos; ISO |
| `format/` | localiza regiões com `remark` + `remark-frontmatter` + `remark-gfm` (**só para achar offsets**, inclusive fences do Mermaid); parser próprio de linhas cruas de tabela/lista; emissor próprio; **splice** por faixas; linhas opacas; invariante "nenhuma linha some" |
| `vault/` | `Vault.open(dir)`: lê manifesto, lê **todos** os arquivos de verdade (força hidratação do OneDrive; modo degradado por arquivo se falhar), valida, indexa em memória; vigia (`awaitWriteFinish`, gate por hash, supressão dos próprios eventos, ignora dotfolders); **lock por cofre em app-data**; `propose(cmd) → ChangeSet{comando, hashes-base, diff derivado}`; `commit(id)`: relê, se hash divergiu **re-executa o comando** e devolve `409` com nova proposta; TTL 15 min; gravação atômica (temp `.nome.salus-tmp` no mesmo diretório, `fsync`, rename com retry/backoff em `EPERM/EBUSY/EACCES`, limpeza de órfãos); ordem fixa verdades→views; comandos idempotentes por chave natural; auditoria (`audit.jsonl` em app-data, uma linha por commit, com origem e flag "confirmação < 2 s"); detecção de **arquivo inesperado** em `Perfis/*` e `Familia/`; "última cópia gravada" por arquivo em app-data |
| `commands/` | `registrarEvento`, `registrarMedicamento`, `transicionarMedicamento`, `registrarVacina`, `registrarAntiparasitario`, `registrarExame` (lote), `registrarSinalVital`, `registrarDose`, `registrarPendencia`, `concluirPendencia`, `atualizarFicha`, `arquivarDocumento` (Caixa → `Documentos/` com `AAAA-MM-DD_Tipo_Desc.ext`), `adicionarMembro`, `removerMembro` (move para `_Backups/removidos/<id>/` + relatório LGPD), `salvarAnalise` |
| `views/` | geradores puros com `hoje` injetado: agenda (4 faixas), medicamentos ativos, linha do tempo, resumo, `indice.yaml`, árvore (só arestas inferíveis), genética familiar (por linhagem; cabeçalho avisa que parentes sem perfil não entram) |
| `queries/` | membros, perfil por seções, agenda, busca (`includes` normalizado em memória), série de marcador, dados para preparo de consulta e para cruzar |
| `migrate/` | v1→v2 (0.3.0 e 0.4.0): dry-run com relatório por membro e **pares cruzados antes/depois**; `--apply` com backup; re-executável; `MIGRACAO_PENDENTE.md`; automatizável: manifesto, ids, `tipo`, tabelas por header com sinônimos, Histórico por regex (resto opaco), listas do `_index.yaml` (fonte de precedência v1), `pais_biologicos` do Mermaid quando o template foi seguido; **revisão assistida**: parentesco, checkboxes de vacina fora da regex, datas não ISO, `Dose` com frequência embutida, divergência índice×perfil, contatos por ` — `, `condicoes_hereditarias`, homônimos |
| `doctor/` | saída ≠ 0: manifesto, schema, placeholders, ids, referências de parentesco, flag sem faixa, BOM, linhas opacas, arquivos inesperados, views desatualizadas, gerados editados, tempo de leitura alto, Caixa (ignora subpastas) |
| `framework/` | gera/atualiza `AGENTS.md`, ponteiros, `.mcp.json`, `Frameworks/`, `.agents/skills/`, templates; grava `versao_salus`; backup antes; remove skills órfãs; nunca toca `Perfis/`, `Notas_para_a_IA.md`, `_Caixa de Entrada/` |

### 3.4 As três portas

**CLI `salus-ai`** (`commander`): `init`, `update` (backup → framework → oferece `migrate`), `migrate [--apply]`, `doctor [--json]`, `sync`, `inspecionar` (somente leitura: estrutura sem valores), `anonimizar <origem> <destino>`, `serve [--lan] [--port]`, `mcp [--config]`, consultas `--json` (`membros`, `perfil`, `agenda`, `buscar`, `marcador`, `preparo-consulta`, `cruzar`, `caixa`).
Escrita por CLI (porta da IA na Fase 1 e fallback permanente para agentes sem MCP): `propor <evento|medicamento|exame|vacina|pendencia|ficha|documento|membro> --stdin` (JSON pela entrada padrão — nunca na linha de comando, por causa do PowerShell) → imprime id + diff legível; `confirmar <id>`; `cancelar <id>`. ChangeSets pendentes ficam em app-data com TTL. Os subcomandos espelham 1:1 as tools MCP.

**Servidor MCP** (`@modelcontextprotocol/sdk`, **stdio apenas**; sem Resources; sem `/mcp` HTTP):
- Tools de consulta (`readOnlyHint`): `salus_membros`, `salus_perfil`, `salus_agenda`, `salus_buscar`, `salus_marcador`, `salus_preparo_consulta`, `salus_cruzar`, `salus_caixa`, `salus_doctor`.
- Tools de escrita **por domínio**: `salus_propor_evento`, `salus_propor_medicamento` (com `acao`), `salus_propor_exame`, `salus_propor_vacina`, `salus_propor_pendencia`, `salus_propor_ficha`, `salus_propor_documento`, `salus_propor_membro`; `salus_confirmar` (`destructiveHint`), `salus_cancelar`. Usa **elicitation** quando o cliente suporta; senão, fluxo de duas tools + permissão por tool do cliente + auditoria.
- Prompts: `registrar`, `organizar-caixa`, `raio-x`, `cruzar`, `preparar-consulta`, `revisar`, `onboarding`.
- `salus-ai mcp --config` imprime trechos para `claude_desktop_config.json` e `~/.codex/config.toml`; `.mcp.json` gerado no cofre. Recomendação: `npm i -g salus-ai` para quem usa MCP. `salus-ai mcp --dump-tools` para snapshot de contrato.

**Interface web local** (Hono + Vite/Preact pré-compilados):
- Mobile-first, pt-BR, sem rede externa. **PIN** único (hash em app-data), cookie HttpOnly, limite de tentativas. Padrão `127.0.0.1`; `--lan` abre na rede e mostra URL + QR a cada início. HTTP simples na LAN = risco aceito e documentado.
- Telas v1: Família (cards + agenda), Perfil (Ficha, Medicamentos, Vacinas, Exames com gráfico por marcador, Histórico, Pendências, Documentos), Registrar (dose, sintoma/evento, peso/pressão/glicemia, vacina/antiparasitário, consulta/exame marcado, "terminei o remédio"), Enviar documento (upload → Caixa), Imprimir (CSS de impressão), Saúde do cofre.
- Formulário = confirmação (propose+commit num request, re-execução automática no 409); tela "Revisar" só para ações destrutivas.
- Modo degradado: arquivo inválido não derruba a tela.
- Não faz na v1: OCR/laudos, editar texto livre, genética, remover membro, configurar IA.

**`AGENTS.md` v2 (gerado):** núcleo inviolável com regras 4 e 8 reescritas; ordem de acesso **MCP → `salus-ai ... --json` → ler `Familia/.gerado/indice.yaml` → editar arquivos de verdade conforme `FORMATO.md` (último recurso; nunca os gerados)**; tabela de prompts/skills; ponteiro para `Notas_para_a_IA.md`. `check-docs.sh` proíbe "atualize o índice/_index" em qualquer arquivo de `framework/`.

### 3.5 Concorrência, nuvem e cache
- **Sem servidor fixo na casa:** cada PC roda `serve` sobre a própria cópia do OneDrive; o celular abre o que estiver no ar. Dois escritores é o caso normal → hash-base no commit, arquivos inesperados e fusão append-only são **requisitos da Fase 1**.
- **OneDrive:** "Arquivos sob demanda" é o padrão → `Vault.open` hidrata; doc manda marcar a pasta como "Sempre manter neste dispositivo". Cópia em conflito = `Nome-NOMEDOPC.md`. Limite de caminho (~400 caracteres) → nomes de backup curtos. Temp no mesmo diretório; retry em `EPERM/EBUSY`.
- `serve` + `mcp` na mesma máquina: índices independentes; verdade é o disco; todo commit relê antes de aplicar.
- Nada do núcleo em disco dentro do cofre além dos arquivos do formato: lock, auditoria, PIN, últimas cópias em `%LOCALAPPDATA%\salus\<id-do-cofre>\` (auditoria **por máquina**, ADR-0006).
- Iniciar `serve` com a sessão do Windows (Task Scheduler) documentado na Fase 2.

### 3.6 Segurança e privacidade
Sem rede de saída, telemetria ou contas. A IA vê o que as tools devolvem. Auditoria local. Remoção de membro gera relatório (LGPD art. 18). Criptografia em repouso fora de escopo (orientação Cryptomator mantida).

### 3.7 Atualização e migração
`salus.yaml` lido por código. `update`: backup → regenera framework (inclusive `AGENTS.md`) → oferece `migrate`. `migrate`: dry-run → `--apply` com backup → `doctor` → `MIGRACAO_PENDENTE.md` consumido pelo prompt `revisar`. Onboarding cria membros via `adicionarMembro` com proteção contra cofre povoado. Backup = `.md/.yaml` + manifesto de hash dos binários (nunca duplica `Documentos/`).

### 3.8 Stack

| Escolha | Por quê |
|---|---|
| TypeScript, ESM, Node ≥ 20 | tipos = parte do schema; padrão do MCP SDK e do Hono |
| Zod (versão pinada compatível com o MCP SDK) | schema único para validação, tools e API |
| `yaml` (parseDocument) + `remark`/`remark-gfm`/`remark-frontmatter` **só para localizar** + emissor/splice próprios | round-trip real |
| Sem banco, sem cache em disco | escala de família; zero nativo |
| Hono | minúsculo, TS-first |
| `@modelcontextprotocol/sdk` stdio | oficial; elicitation; annotations |
| Vite + Preact + uPlot, pré-compilados | bundle pequeno; sem build na máquina do usuário |
| **Bundle único com `tsdown`** (deps inlined, nenhuma nativa) | `npx` frio rápido; `.mcp.json` confiável |
| Vitest + `fast-check` | tudo em processo, roda em Windows |
| `commander` (a partir da Fase 1) | subcomandos e `--json` |
| Pacote único `salus-ai` (`dist/` + `framework/`) | um `npx` só |

### 3.9 Estrutura do repositório (alvo)
```
<repo>/
├── package.json  ("type": "module", bin: dist/cli.js, files: [dist, framework], engines >=20)
├── src/{core,cli,mcp,server}/ · ui/ (Vite+Preact → dist/ui)
├── framework/  (tudo que vai ao cofre do usuário)
├── test/{unit,integration,fixtures/{vaults/{v1-0.3,v1-0.4,v2},dirty/}}/   (+ test/fixtures/local/ gitignored)
├── docs/{auditoria,superpowers/{specs,plans},adr}/ · scripts/check-docs.sh
├── .github/workflows/ci.yml (PR+push: typecheck, test ubuntu+windows, pack+instalar tarball em pasta com acento)
├── .github/workflows/publish.yml (SÓ tag v*: ci + npm publish --provenance)
├── AGENTS.md · CLAUDE.md (instruções DE DESENVOLVIMENTO do repo)
└── README.md · CHANGELOG.md · STATUS.md · CONTRIBUTING.md
```

---

## 4. Roteiro de entrega (resumo; cada fase tem plano próprio em `docs/superpowers/plans/`)

- **Fase 0 — Fundação de engenharia** (sem mudar formato; sem release): testes de caracterização do CLI atual, CI em Linux+Windows, publicação só por tag, produto movido para `framework/`, CLI portado para TypeScript com paridade. Absorve DT-01, DT-03, DT-04 (parte), D9, D10.
- **Fase 1 — Núcleo + formato v2 + migração → v0.5.0.** Absorve DT-02, DT-05–08, D1–D8, D11. Dogfood numa cópia do cofre real, com os dois PCs escrevendo.
- **Fase 2 — MCP + interface web, juntos → v0.6.0.** Dogfood com a pessoa da família.
- **Fase 3 — Consolidação → v1.0.0.**

Portões: qualquer push, tag ou publish exige pedido explícito do dono.

## 5. Riscos e mitigações
| Risco | Mitigação |
|---|---|
| Migração perder dado de saúde | dry-run, backup, fixture real anonimizada, relatório antes/depois, `MIGRACAO_PENDENTE.md`, re-executável |
| Salus "mexer no meu texto" | splice + opacos + no-op write byte-idêntico como teste de ouro |
| Conflitos de sincronização | um fato por arquivo; atômico+retry; hash; views sem relógio; arquivos inesperados; fusão append-only |
| IA pular consentimento | duas etapas + elicitation + annotations + permissão por tool do cliente + auditoria com flag |
| Agente editar gerado | `.gerado/` oculto, somente-leitura, sobrescrita com aviso, regra no check-docs |
| `npx` frio lento / `.mcp.json` falhando | bundle único; `npm i -g` para MCP; medir no CI |
| Nenhum servidor fixo; PC dorme | os dois PCs servem; Task Scheduler; QR a cada início |
| Windows (caminhos, CRLF, BOM, policy do PowerShell) | CI Windows; EOL preservado; BOM tolerado; `npx.cmd` na doc |

## 6. Fora de escopo / anti-metas
Nuvem própria, contas, sincronização própria, criptografia em repouso, permissões por perfil, notificações push, FHIR, OCR próprio, app nativo, banco, telemetria, MCP por HTTP, MCP Resources.

## 7. Decisões de desenho tomadas pelo agente (conferidas pelo dono)
1. Pasta do perfil com nome humano; `id` no frontmatter.
2. Índice gerado vira `Familia/.gerado/indice.yaml`; views humanas mantêm nome em `Familia/`, somente-leitura; `META.md` e `_index.yaml` somem.
3. `vinculo` some; linhagem por `pais_biologicos` (aceita nome sem perfil); `conjuges` só para a árvore; migração mostra pares cruzados antes/depois e guarda `migracao_v1`.
4. Novos arquivos de verdade: `Vacinas.md`, `Pendencias.md`, `Doses.md`; contatos/profissionais viram tabelas no corpo da Ficha; `marcadores_chave` e `papel` no frontmatter.
5. Gravação por splice; nunca re-serializa; EOL preservado; BOM tolerado.
6. Sem banco e sem cache em disco; lock/auditoria/PIN/últimas cópias em `%LOCALAPPDATA%\salus\`.
7. PIN único; HTTP na LAN como risco aceito.
8. Tools MCP por domínio em português; stdio apenas; sem Resources; elicitation quando houver.
9. ChangeSet = comando + hashes; 409 re-propõe; tela confirma no formulário.
10. Backup copia texto e registra hash de binários; `removerMembro` move.
11. Append-only (`Doses.md`, `Historico.md`) com fusão automática por união.
12. Bundle único; `npm i -g` recomendado para MCP.
13. UI só em pt-BR; sem Playwright na v0.6.
14. ChangeSets do CLI persistidos em app-data; subcomandos `propor <dominio>` espelham as tools MCP.
15. Anonimizador como subcomando do próprio CLI (`anonimizar`).

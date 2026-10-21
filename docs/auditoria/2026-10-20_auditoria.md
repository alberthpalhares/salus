# Auditoria do Salus — 2026-10-20

| | |
|---|---|
| **Versão auditada** | v0.4.0 (working tree, commitada como baseline em `61f3bad`; npm ainda em 0.3.0) |
| **Tier** | T1 (CLI/script + framework documental), declarado em `STATUS.md` |
| **Método** | Leitura integral de todos os arquivos do repositório; auditoria independente por um segundo agente sem acesso às conclusões do primeiro; execução do CLI em pasta temporária; consulta ao registro npm |
| **Modelo** | Claude Fable 5.1 · effort xhigh |
| **Resultado** | 32 achados: 24 corrigidos nesta rodada, 8 adiados com destino (`STATUS.md`, DT-01 a DT-08) |

## Resumo executivo

Os cinco achados mais graves:

1. **`npx salus` executava código de terceiro.** O pacote tinha aliases de bin `salus` e `salus-framework`; já existe um pacote `salus@0.0.1` no npm, então `npx salus init` rodaria código alheio. Aliases removidos; o comando é só `npx salus-ai`.
2. **`init` sobrescrevia arquivos de outro projeto sem aviso.** Pasta com `CLAUDE.md`, `GEMINI.md`, `.cursorrules` ou `.agents/` próprios (mas sem `AGENTS.md`) era sobrescrita em silêncio; sem terminal interativo o cancelamento saía com código 0. Agora o `init` lista colisões, pede confirmação e sai com 1 sem TTY.
3. **O cérebro gerado no onboarding não dizia onde as skills estão.** Mandava "acionar a skill X" sem citar `.agents/skills/X/SKILL.md`; só o Codex descobre essa pasta sozinho. Agora há uma tabela nome → caminho → gatilhos.
4. **As docs prometiam "total privacidade" e "tudo fica local".** Cada pergunta envia o conteúdo lido ao provedor da IA. Substituído por uma seção honesta "Para onde vão seus dados" (COMECE_AQUI, README, protocolo), com LGPD, backup criptografado e remoção de membro.
5. **O cérebro é congelado no onboarding** e `update` nunca o alcança (regras novas de cada versão não chegam a famílias existentes). Adiado para a v0.5.0 (DT-05); nesta rodada entrou o marcador de versão que a migração vai usar.

Nenhum dado pessoal entrou no histórico Git. Dois scripts com dados reais da família existiam fora do Git (em `graphify-out/`, pasta ignorada) e foram movidos para a pasta pessoal do dono.

## Achados → dono → trava

Legenda da coluna **Trava**: o que impede o problema de voltar. "`check-docs`" = `scripts/check-docs.sh` (roda no CI). "smoke CI" = step do workflow. "sem trava — revisão humana" = texto de skill que nenhum script consegue cobrar.

### Arquitetura e atualização

| # | Achado | Dono | Trava |
|---|---|---|---|
| 1 | Cérebro congelado no onboarding; `update` não propaga regras novas | DT-05 (v0.5.0) | marcador `salus-template` já existe; `check-docs` cobra que ele bate com `package.json` |
| 2 | Cérebro não citava o caminho das skills | Corrigido: tabela "Skills" em `SALUS_TEMPLATE.md` | `check-docs`: toda skill citada tem caminho; toda pasta de skill está na tabela |
| 3 | Cérebro copiava `{{DATA_REVISAO}}` e `{{LISTA_MEMBROS}}`, que ficavam desatualizados | Corrigido: regra 8 e mapa apontam para `META.md`/`_index.yaml` | `check-docs`: resíduo `{{DATA_REVISAO}}`/`{{LISTA_MEMBROS}}` reprova |
| 4 | Três frases contraditórias sobre quem manda (índice × perfil) | Corrigido: frase única no índice, `META.md`, protocolo e núcleo (regra 8) | sem trava — revisão humana |
| 5 | Exceção de confirmação para views escrita de três jeitos; `cruzar` alterava o índice fora do prompt; `cruzar`/`preparar-consulta` fora da regra de sincronia | Corrigido: tabela "Quem lê, quem grava" no protocolo; núcleo regra 4; prompt do `cruzar` | sem trava — revisão humana |

### CLI, pacote e CI

| # | Achado | Dono | Trava |
|---|---|---|---|
| 6 | Zero testes, sem porta de verificação | DT-01 (próxima rodada) | provisório: smoke CI + roteiro manual em `CONTRIBUTING.md` |
| 7 | Aliases `salus`/`salus-framework` colidiam com pacote de terceiro | Corrigido: só `salus-ai` | `npm pack --dry-run` no smoke CI; regra em `CONTRIBUTING.md` |
| 8 | `init` sobrescrevia arquivos alheios; cancelamento silencioso com exit 0 sem TTY | Corrigido: `findInitCollisions`, exit 1 sem TTY | sem trava automática até DT-01 (cenário roteirizado abaixo) |
| 9 | `update` despejava o framework em qualquer pasta | Corrigido: `looksLikeSalus` exige `AGENTS.md` ou `.agents/` | smoke CI roda `update` só em pasta inicializada; cenário roteirizado para DT-01 |
| 10 | `doctor` sugeria remédios inexistentes (`update` não restaura `AGENTS.md`; nenhuma skill reconstruía o índice) | Corrigido: mensagens + seção "Reconstruir ou migrar o índice" em `salus-revisao` | sem trava — revisão humana |
| 11 | Flag desconhecida ignorada; aliases `check`/`status` fora do help; `init` sem `.catch` | Corrigido | cenário roteirizado para DT-01 |
| 12 | Sem `engines`, autor divergente, sem `publishConfig`, sem `.gitattributes`, sem versão de schema/template | Corrigido | `check-docs` (versão); `.gitattributes` |
| 13 | Workflow publicava sem nenhuma verificação | Corrigido: `check-docs` + smoke test + `concurrency` | o próprio workflow |
| 14 | `update` aditivo deixa skill órfã | DT-02 | — |
| 15 | Miúdos: heurística por string acentuada, subpastas/links na Caixa, `doctor` sempre 0, `cli.js` acima do alvo | DT-04 | — |

### Consistência entre skills, templates e protocolo

| # | Achado | Dono | Trava |
|---|---|---|---|
| 16 | `raio-x` calculava 2 faixas, Agenda exige 4 | Corrigido | sem trava — revisão humana |
| 17 | `Medicamentos_Ativos.md` pedia "Prescrito por" inexistente no índice | Corrigido: `prescrito_por`, `validade_receita` | `check-docs`: campo citado sem definição reprova |
| 18 | Requisições sumiam da Agenda | Corrigido: `exames_pendentes` no índice, `salus-organiza`, `registrar`, `raio-x`, `preparar-consulta`, `salus-revisao` | `check-docs` (campo definido) |
| 19 | Ninguém reconstruía nem migrava o índice | Corrigido: seção em `salus-revisao`; `schema_versao` | sem trava — revisão humana |
| 20 | `DD/MM/AAAA` na Ficha; `preparar-consulta` sem `HHmm` (colisão no mesmo dia) | Corrigido; regra 9 do núcleo | `check-docs`: resíduo `DD/MM/AAAA` reprova |
| 21 | Pets na `Genetica_Familiar.md`; enum de `vinculo` sem `nao_aplicavel` | Corrigido | sem trava — revisão humana |
| 22 | `alergias: []` não distinguia "nenhuma" de "não perguntado"; ia ao topo da ficha de PS | Corrigido: `null` = não informado; `preparar-consulta` rotula; tipo sanguíneo "não verificado" | sem trava — revisão humana |
| 23 | `registrar` sem `atualizado_em`; `tipo: outro` sem instrução; `alertas_cache` morto; homônimos; README com `Familia/` como se existisse | Corrigido | `check-docs`: resíduo `alertas_cache` reprova |
| 24 | `CODEX.md` redundante; `dose` mistura dose e frequência | DT-08 | — |

### Modelo de dados

| # | Achado | Dono | Trava |
|---|---|---|---|
| 25 | `vinculo` por membro modela o que é por relação (enteado × mãe biológica; cônjuges) | DT-06 (v0.5.0) | — |
| 26 | Índice inteiro vai ao provedor em qualquer pergunta | DT-07 (v0.5.0) | — |

### Privacidade, segurança clínica e docs

| # | Achado | Dono | Trava |
|---|---|---|---|
| 27 | "Total privacidade" / "tudo local" falsos na prática; sem LGPD; nuvem sem criptografia | Corrigido: seções "Para onde vão seus dados" + protocolo + fluxo "Remover membro" | `check-docs`: resíduo "total privacidade" reprova |
| 28 | Interações/alergias checadas "de memória" sem disclaimer | Corrigido: regra 10 do núcleo, protocolo, `preparar-consulta`, `registrar`, `salus-organiza` | sem trava — revisão humana |
| 29 | Números de foto/áudio sem confirmação específica | Corrigido: protocolo item 4; `salus-organiza` passo 3e e plano | sem trava — revisão humana |
| 30 | Compatibilidade superestimada (Claude Desktop, "ChatGPT CLI", Windsurf × `.cursorrules`); áudio em assistentes que não transcrevem | Corrigido: tabela no README; notas em COMECE_AQUI e `salus-organiza` | `check-docs`: resíduo "ChatGPT CLI" reprova |
| 31 | Scripts com dados reais da família em `graphify-out/` | Corrigido: movidos para a pasta pessoal do dono (fora do repo). `graphify-out/cortex_cli.js` é resto do Córtex, ignorado pelo Git, não tocado | `.gitignore` (`graphify-out/`) |

### Governança

| # | Achado | Dono | Trava |
|---|---|---|---|
| 32 | Sem STATUS, tier nem lugar para regras de dev (os `AGENTS.md`/`CLAUDE.md` da raiz são do produto) | Corrigido: `STATUS.md`, `CONTRIBUTING.md`, este relatório | `CONTRIBUTING.md` checklist |

## Verificação executada

**CLI** — 29 cenários em pasta temporária fora do repositório, todos verdes (roteiro para a futura `test/cli.test.js`, DT-01):

- `node --check`; `--version`; `--help` saem com 0. Flag desconhecida (`--froce`) e comando desconhecido saem com 1.
- `init` em pasta nova sem TTY: cria `AGENTS.md`, `.agents/skills/*`, `Frameworks/`, `Perfis/`, `_Caixa de Entrada/LEIA-ME.md`; `doctor` diz "ainda não foi inicializado" com 0 alertas.
- `init` repetido sem TTY: sai com 1, lista as colisões, `AGENTS.md` byte a byte igual.
- Família simulada (índice, `Perfis/Teste/` com os 5 arquivos, `AGENTS.md` editado, documento na Caixa, `SKILL.md` do `cruzar` corrompido): `update` sai com 0, preserva `AGENTS.md`, `Perfis/`, `Familia/` e a Caixa, e deixa `.agents/` idêntico ao do repositório.
- `doctor` na família: detecta inicialização, lista o perfil, conta 1 documento; com índice ausente sugere "reconstruir o índice"; com `AGENTS.md` ausente sugere `init`.
- `update` em pasta vazia: sai com 1 e não cria nada.
- `init` em pasta com `CLAUDE.md` próprio e sem `AGENTS.md`: sai com 1, lista `CLAUDE.md`, não copia nada; `--force` sobrescreve.

**Docs** — `scripts/check-docs.sh` verde: nenhum resíduo; 7 skills na tabela do cérebro com caminho; 24 campos do índice citados em skills/protocolo definidos no template; 12 arquivos de perfil/família citados com template; versão 0.4.0 alinhada em `package.json`, cérebro, README e COMECE_AQUI. Proveta: o mesmo script reprova (exit 1) uma cópia do repositório com `alertas_cache` injetado.

**Pacote** — `npm pack --dry-run`: `docs/`, `scripts/`, `STATUS.md` e `CONTRIBUTING.md` fora; `bin` só `salus-ai`.

## O que a porta NÃO cobre

- O comportamento das skills dentro de um assistente de IA real: só houve revisão de texto e checagem cruzada de campos e caminhos. A primeira família que rodar a 0.4.0 é o teste real; registrar o que a IA fizer de diferente do SKILL.md em `APRENDIZADOS.md` (ainda não existe) ou no CHANGELOG.
- A publicação no npm e o step do workflow só foram validados localmente (`npm pack --dry-run` e o mesmo roteiro executado à mão).
- O YAML do índice foi validado por leitura, sem parser.

## Próximos passos (ordem sugerida)

1. Conferir e dar `git push` (publica a 0.4.0).
2. DT-01: `test/cli.test.js` com os 29 cenários acima + `npm test` no workflow.
3. DT-02 a DT-04 na mesma rodada de testes.
4. v0.5.0: DT-05 a DT-08 (cérebro atualizável, linhagem por `pais`/`tutores`, índice por membro) — uma única migração de formato, com a seção "Reconstruir ou migrar o índice" já preparada para isso.

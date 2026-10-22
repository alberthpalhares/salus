# Fase 1A — Formato v2, codecs e leitura — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Definir o formato v2 do cofre em código (schema + codecs Markdown/YAML com gravação por *splice*), abrir um cofre v2 em memória com consultas (`membros`, `perfil`, `agenda`, `buscar`, `marcador`) expostas pelo CLI em JSON, e entregar `salus-ai inspecionar` e `salus-ai anonimizar` para que o dono produza a fixture anonimizada do cofre real antes de o migrador existir.

**Architecture:** O núcleo ganha quatro camadas puras e testáveis sem I/O de rede: `schema/` (Zod: entidades e validação), `format/` (localiza regiões com `remark`, parseia linhas cruas de tabela/lista com parser próprio, grava por *splice* preservando byte a byte o que não é dele), `vault/` (abre a pasta, lê todos os arquivos de verdade, agrega por membro, lista problemas por arquivo sem derrubar o todo) e `queries/` (funções puras sobre o modelo em memória, com `hoje` injetado). O CLI continua com o parser próprio (`node:util` `parseArgs` em vez de `commander`, para manter a ajuda e as mensagens em português) e ganha os comandos de leitura. **Nada grava no cofre nesta fase** além de `anonimizar`, que escreve numa pasta de destino nova. A Fase 1B (comandos, ChangeSet, views, `sync`, vigia, `doctor` v2) e a Fase 1C (migração v1→v2, framework v2, skills, release 0.5.0) têm planos próprios.

**Tech Stack:** TypeScript 7 (ESM, `NodeNext`), Vitest 5 + `fast-check`, tsdown; dependências de runtime novas (inlinadas no bundle): `zod` (v4), `yaml` (v2), `unified` + `remark-parse` + `remark-gfm` + `remark-frontmatter` (+ tipos `@types/mdast`). Sem `commander`, sem banco, sem nada nativo.

**Spec:** `docs/superpowers/specs/2026-10-21-salus-v2-design.md` — seções 3.1, 3.2, 3.3 (`schema/`, `format/`, `vault/`, `queries/`), 3.4 (CLI: `inspecionar`, `anonimizar`, consultas `--json`), 3.8. Desvios desta fase em relação à spec: parser de argumentos próprio (`node:util` `parseArgs`) em vez de `commander`; módulo `src/core/inspecao/` (inspecionar/anonimizar) não listado na spec.

## Global Constraints

- Node `>=22`; TypeScript estrito, sem `any`; imports entre `.ts` com sufixo `.js`.
- Dependências de runtime permitidas **somente**: `zod`, `yaml`, `unified`, `remark-parse`, `remark-gfm`, `remark-frontmatter` (e `@types/mdast` em dev). Qualquer outra exige ADR. `dist/cli.js` continua um bundle único sem `node_modules/`.
- **O núcleo não reescreve o que não é dele** (spec 3.1 §4): toda gravação é por *splice* de regiões gerenciadas; linhas não reconhecidas dentro de uma região são preservadas como opacas; `render(parse(x))` sem mudanças devolve `x` **byte a byte** (incluindo CRLF e espaços); BOM é removido só na gravação.
- **Frontmatter** só com escalares e listas de strings; lido com `yaml.parseDocument` (esquema `core`: datas ficam strings); comentários e ordem preservados.
- **Datas** `AAAA-MM-DD` validadas por regex + calendário; aritmética civil em UTC (`Date.UTC`), nunca `new Date('AAAA-MM-DD')` local; `hoje` sempre injetado.
- **`valor` de exame é string** como digitado (`5,5`); `valorNumerico` derivado (vírgula→ponto) só para série/gráfico.
- Cabeçalhos canônicos comparados após `trim` + NFC + *case-fold*; colunas por posição validadas pelo texto do cabeçalho; colunas extras passam adiante (`extras`).
- `inspecionar` **nunca imprime valores** nem nomes de pessoas (pastas de perfil são mascaradas); `anonimizar` **nunca** lê fora de `origem` nem grava fora de `destino`.
- O comportamento de `init`, `update` e `doctor` **não muda** (suíte de caracterização continua verde; só a ajuda ganha linhas novas).
- pt-BR, UTF-8, LF nos arquivos do repositório; português nos nomes de domínio (`Membro`, `Medicamento`, `agenda`), inglês nos nomes de módulo da spec (`schema/`, `format/`, `vault/`, `queries/`).
- Nunca push/tag/publish sem pedido do dono; dados reais de família nunca entram no repositório (`test/fixtures/local/` é gitignored).
- Commits por tarefa, mensagens no estilo do repo, trailer de atribuição do modelo que escreveu.

## Review Focus

1. **Arquivo escrito por outra ferramenta (Obsidian, Notepad, OneDrive)**: CRLF, BOM, espaço no fim da linha, célula vazia, linha de template `| | | |` — tudo deve ler sem exceção e regravar sem mudar nada → testes de no-op byte-idêntico e corpus sujo (Tarefa 4).
2. **Tabela com coluna a mais ou a menos, `|` dentro de célula, HTML em célula**: nenhuma linha some; extras passam adiante; `\|` lido e escrito; HTML é texto → invariante "nenhuma linha some" + `fast-check` (Tarefa 4).
3. **Cofre com um arquivo quebrado** (YAML inválido, cabeçalho de tabela errado, pasta de perfil sem `Ficha.md`): `Vault.abrir` termina, lista o problema com arquivo e linha, e os demais membros continuam consultáveis (Tarefa 6).
4. **Agenda em 29/02, virada de ano, `hoje` igual à data do item**: item na data de hoje conta como "até 30 dias", não como vencido; cálculo em UTC → testes com datas fixas (Tarefa 7).
5. **`anonimizar` deixando escapar um nome ou uma data** no corpo livre, em nomes de arquivos binários ou em células de "Prescrito por" → teste que afirma a ausência de todos os nomes/datas originais no destino inteiro, inclusive nomes de pastas e arquivos (Tarefa 9).

---

## Estrutura de arquivos (criada nesta fase)

```
src/core/schema/        comuns.ts (DataIso, TipoMembro, Id, Flag), membro.ts, medicamento.ts, vacina.ts, exame.ts,
                        evento.ts, pendencia.ts, dose.ts, manifesto.ts, index.ts
src/core/format/        texto.ts (BOM/EOL/normalização/escape), splice.ts, documento.ts (remark → regiões),
                        tabela.ts, lista.ts, frontmatter.ts,
                        arquivos/ ficha.ts, medicamentos.ts, vacinas.ts, exames.ts, historico.ts, pendencias.ts,
                                  doses.ts, genetica.ts, manifesto.ts, index.ts
src/core/vault/         Vault.ts, perfil.ts, problemas.ts
src/core/queries/       membros.ts, perfil.ts, agenda.ts, buscar.ts, marcador.ts, datas.ts
src/core/inspecao/      inspecionar.ts, anonimizar.ts
src/cli/                args.ts (parseArgs), comandos/{inspecionar,anonimizar,consultas}.ts; main.ts e help.ts modificados
framework/Frameworks/FORMATO.md                        especificação legível do v2
framework/templates/{Familia,Perfil_Pessoa,Perfil_Cao,Perfil_Gato,Perfil_Outro}/   templates v2 (ainda não usados pelo init)
test/fixtures/vaults/v2-exemplo/                        cofre v2 completo (3 membros) usado como ouro
test/fixtures/dirty/                                    arquivos v2 "sujos" (CRLF, BOM, coluna extra, `\|`, linha opaca…)
test/unit/{schema,format,vault,queries,inspecao,args}/*.test.ts · test/cli/leitura.test.ts
docs/adr/0008-dependencias-de-runtime.md
```

---

### Task 1: FORMATO.md, templates v2 e fixture `v2-exemplo`

**Files:**
- Create: `framework/Frameworks/FORMATO.md`
- Create: `framework/templates/Familia/{salus.yaml,Notas_para_a_IA.md}`, `framework/templates/Perfil_Pessoa/{Ficha,Medicamentos,Vacinas,Exames,Historico,Pendencias,Doses,Genetica}.md`, idem `Perfil_Cao/`, `Perfil_Gato/`, `Perfil_Outro/`
- Create: `test/fixtures/vaults/v2-exemplo/` — `salus.yaml`, `Familia/Notas_para_a_IA.md`, `Perfis/Ana/…`, `Perfis/Bruno/…`, `Perfis/Mia (gata)/…` (8 arquivos cada), `_Caixa de Entrada/LEIA-ME.md`
- Modify: `scripts/check-docs.sh` (item 4: arquivos citados também podem ter template em `framework/templates/*/`; novo item 6: todo cabeçalho canônico listado em `FORMATO.md` existe nos templates v2)

**Interfaces:**
- Produces: o contrato textual que todos os codecs implementam. Cabeçalhos canônicos e colunas (copiar literalmente nos codecs):
  - `salus.yaml`: `schema_versao: 2`, `versao_salus`, `familia`, `criado_em`, `ultima_revisao` (ISO ou `null`).
  - `Ficha.md` frontmatter: `id`, `nome`, `tipo` (`pessoa|cao|gato|outro`), `nascimento`, `sexo`, `tipo_sanguineo`, `plano`, `papel`, `alergias` (`null` | `[]` | lista), `condicoes_ativas`, `marcadores_chave`, `pais_biologicos`, `responsaveis`, `tutores`, `conjuges`; pets ainda `raca`, `castrado`, `microchip`. Corpo: `# Ficha de Saúde — <nome>`, texto livre, `## Contatos de emergência` → `| Nome | Relação | Telefone |`, `## Profissionais de referência` → `| Nome | Especialidade | Contato | Acompanha |`.
  - `Medicamentos.md`: `## Em uso` → `| Medicamento | Dose | Frequência | Via | Desde | Prescrito por | Renova em | Término em | Obs |`; `## Prescritos` → `| Medicamento | Dose | Frequência | Data da receita | Prescrito por | Validade da receita | Obs |`; `## Descontinuados` → `| Medicamento | Dose | Frequência | Início | Fim | Prescrito por | Motivo |`.
  - `Vacinas.md`: `## Vacinas` → `| Vacina | Aplicada em | Próxima em | Obs |`; `## Antiparasitários` (só pets) → `| Produto | Tipo | Aplicado em | Próximo em | Obs |` com `Tipo` ∈ `antipulgas|vermifugo`.
  - `Exames.md`: `## Peso` → `| Data | Peso (kg) | Obs |`; `## Pressão arterial` → `| Data | Sistólica | Diastólica | FC | Obs |`; `## Glicemia` → `| Data | Hora | Valor (mg/dL) | Condição | Obs |`; qualquer outro `## <Exame>` → `| Data | Marcador | Valor | Unidade | Faixa do laudo | Flag | Obs |` com `Flag` ∈ `normal|alto|baixo|` (vazio).
  - `Historico.md`: `## Eventos` → itens `- **AAAA-MM-DD** [tipo] texto` (`[tipo]` opcional ∈ `consulta|sintoma|procedimento|observacao`).
  - `Pendencias.md`: `## Exames solicitados` → `| Exame | Solicitado em | Solicitado por | Realizar até | Obs |`; `## Consultas e check-ups` → `| Tipo | Data | Profissional | Obs |`.
  - `Doses.md`: `## Doses` → `| Data | Hora | Medicamento | Dose | Obs |` (append-only).
  - `Genetica.md`: frontmatter `condicoes_hereditarias: []`; corpo livre.
  - Região gerenciada = cabeçalho `##` canônico + **primeira** tabela (ou lista) até o próximo cabeçalho de nível ≤ 2; o resto da seção é livre. Linha de tabela com número de células diferente do cabeçalho, ou item de lista fora da gramática, é **opaca** (preservada, listada pelo `doctor`). Linhas só com células vazias (`| | |`) são opacas e ignoradas na leitura.

- [ ] **Passo 1: Escrever `FORMATO.md`** com as tabelas acima, as regras de região/opacos, `\|` em células, datas ISO, `valor` como texto, EOL preservado, BOM tolerado, e um exemplo completo de cada arquivo (copiar de `v2-exemplo/Perfis/Ana`).
- [ ] **Passo 2: Criar os templates v2** (`framework/templates/...`) com cabeçalhos canônicos, tabelas vazias (só cabeçalho + delimitador) e comentários HTML curtos de orientação. `Perfil_Cao`/`Perfil_Gato` têm `## Antiparasitários`; `Perfil_Pessoa` não; `Perfil_Outro` = `Perfil_Cao` sem texto específico de espécie.
- [ ] **Passo 3: Criar a fixture `v2-exemplo`** com dados fictícios porém realistas: Ana (pessoa, `alergias: ["Dipirona"]`, 2 medicamentos em uso com `renova_em` 2026-11-05 e `termino_em` 2026-10-25, 1 prescrito com validade 2026-12-01, vacinas, 3 datas de peso, Hemograma com 4 marcadores em 2 datas, 5 eventos com e sem `[tipo]`, 1 exame solicitado, 1 consulta marcada, 3 doses, `pais_biologicos: ["Maria (avó materna)"]`, `conjuges: [bruno]`), Bruno (pessoa, `alergias: []`, `pais_biologicos: ["Maria (avó materna)"]`), Mia (gata, `tutores: [ana, bruno]`, antiparasitários com `proximo_em` 2026-10-30 e vacina vencida 2026-09-01). Incluir de propósito: um texto livre com acento e emoji na Ficha da Ana; uma célula com `\|`; uma linha de template vazia numa tabela; uma coluna extra `Laboratório` no Hemograma do Bruno; `Historico.md` do Bruno com um item fora da gramática (`- Primeira consulta em março`).
- [ ] **Passo 4: Criar o corpus sujo `test/fixtures/dirty/`** — cada arquivo é um `Medicamentos.md` ou `Exames.md` v2 válido com **um** defeito nomeado no arquivo: `crlf.md` (todo em CRLF), `bom.md` (começa com U+FEFF), `coluna-extra.md` (coluna `Laboratório` a mais), `pipe-escapado.md` (célula com `a \| b`), `linha-opaca.md` (uma linha de prosa no meio da tabela), `linha-vazia.md` (linha `| | | |` de template), `html-na-celula.md` (`<b>alto</b>` numa célula), `espaco-final.md` (espaços no fim de várias linhas), `flag-sem-faixa.md` (Hemograma com `Flag` `alto` e `Faixa do laudo` vazia). Acrescentar ao `.gitattributes`: `test/fixtures/dirty/** -text` e `test/fixtures/vaults/** -text` (para CRLF e BOM sobreviverem ao checkout em qualquer SO).
- [ ] **Passo 5: Adaptar `check-docs.sh`** conforme Files e rodar.

Run: `bash scripts/check-docs.sh`
Expected: `check-docs: OK`.

- [ ] **Passo 6: Commit** — `docs(formato): FORMATO.md, templates v2, fixture v2-exemplo e corpus sujo`

---

### Task 2: Dependências de runtime (ADR-0008) e `schema/`

**Files:**
- Create: `docs/adr/0008-dependencias-de-runtime.md`; Modify: `docs/adr/README.md` (índice), `package.json`, `package-lock.json`, `CONTRIBUTING.md` (linha "sem dependências de runtime sem ADR" aponta para o ADR-0008)
- Create: `src/core/schema/{comuns,membro,medicamento,vacina,exame,evento,pendencia,dose,manifesto,index}.ts`
- Test: `test/unit/schema/{comuns,entidades}.test.ts`

**Interfaces (produz; consumido por todas as tarefas seguintes):**
- `comuns.ts`: `DataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(calendárioVálido)`; `HoraHHmm`; `TipoMembro = z.enum(['pessoa','cao','gato','outro'])`; `Id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/)`; `FlagExame = z.enum(['normal','alto','baixo',''])`; `TipoAntiparasitario = z.enum(['antipulgas','vermifugo'])`; `TipoEvento = z.enum(['consulta','sintoma','procedimento','observacao'])`; `export function ehDataValida(s: string): boolean`.
- `membro.ts`: `FichaFrontmatter` (chaves da Task 1; todas opcionais exceto `id`, `nome`, `tipo`; `alergias: z.union([z.null(), z.array(z.string())])`; listas default `[]`), `Contato {nome, relacao, telefone}`, `Profissional {nome, especialidade, contato, acompanha}`, `Membro` (agregado: `id, pasta, ficha: {frontmatter, contatos, profissionais}, medicamentos, vacinas, antiparasitarios, exames, historico, pendencias, doses, genetica: {condicoes_hereditarias: string[]}`) — todos `z.object(...)` com `type X = z.infer<typeof X>` exportados.
- `medicamento.ts`: `MedicamentoEmUso {nome, dose, frequencia, via, desde, prescrito_por, renova_em, termino_em, obs}` (datas `DataIso | ''`), `MedicamentoPrescrito {nome, dose, frequencia, data_receita, prescrito_por, validade_receita, obs}`, `MedicamentoDescontinuado {nome, dose, frequencia, inicio, fim, prescrito_por, motivo}`.
- `vacina.ts`: `Vacina {nome, aplicada_em, proxima_em, obs}`, `Antiparasitario {produto, tipo, aplicado_em, proximo_em, obs}`.
- `exame.ts`: `Marcador {exame, data, marcador, valor, unidade, faixa_do_laudo, flag, obs}` com `superRefine`: `flag !== ''` exige `faixa_do_laudo !== ''`; `Peso {data, peso, obs}`, `Pressao {data, sistolica, diastolica, fc, obs}`, `Glicemia {data, hora, valor, condicao, obs}`; `export function valorNumerico(valor: string): number | null` (aceita `5,5`, `5.5`, `< 0,5` → `null`).
- `evento.ts`: `Evento {data, tipo: TipoEvento | null, texto}`.
- `pendencia.ts`: `ExameSolicitado {exame, solicitado_em, solicitado_por, realizar_ate, obs}`, `Consulta {tipo, data, profissional, obs}`.
- `dose.ts`: `Dose {data, hora, medicamento, dose, obs}`.
- `manifesto.ts`: `SalusYaml {schema_versao: z.literal(2), versao_salus: string, familia: string, criado_em: DataIso, ultima_revisao: DataIso | null}`.

- [ ] **Passo 1: ADR-0008** ("Dependências de runtime: zod, yaml, unified/remark-parse/remark-gfm/remark-frontmatter — inlinadas no bundle; nada nativo; qualquer outra exige ADR") com Contexto (spec 3.8 e ADR-0004) e Consequências (tamanho do bundle medido no CI; `npx` frio).
- [ ] **Passo 2:** `npm i zod yaml unified remark-parse remark-gfm remark-frontmatter && npm i -D @types/mdast fast-check` (últimas estáveis; lockfile commitado). Conferir `npm run build` e que `test/unit/dist.test.ts` continua passando (o bundle não contém `node_modules/`).
- [ ] **Passo 3: Testes (falhando)** — `comuns.test.ts`: `ehDataValida('2026-02-29') === false`, `('2024-02-29') === true`, `('2026-13-01') === false`; `DataIso.safeParse('26-1-1').success === false`; `Id` rejeita `Ana` e aceita `ana-maria`. `entidades.test.ts`: `Marcador` rejeita `flag: 'alto'` com `faixa_do_laudo: ''` e aceita com faixa; `valorNumerico('5,5') === 5.5`, `('< 0,5') === null`, `('') === null`; `FichaFrontmatter` aceita `alergias: null`, `[]` e `['Dipirona']` e aplica defaults `[]` nas listas ausentes; `SalusYaml` rejeita `schema_versao: 1`.
- [ ] **Passo 4: Implementar** os schemas. **Passo 5:** `npm run typecheck && npx vitest run test/unit/schema` verdes. **Passo 6: Commit** — `feat(schema): entidades do formato v2 em Zod (ADR-0008)`

---

### Task 3: `format/` base — texto, splice, documento (remark), frontmatter

**Files:**
- Create: `src/core/format/{texto,splice,documento,frontmatter}.ts`
- Test: `test/unit/format/{texto,splice,documento,frontmatter}.test.ts`

**Interfaces (produz):**
- `texto.ts`: `removerBom(s): {texto, tinhaBom}`; `detectarEol(s): 'LF' | 'CRLF'` (dominante; empate → LF); `normalizarCabecalho(s): string` (trim, NFC, `toLocaleLowerCase('pt-BR')`, colapsa espaços); `escaparCelula(s)` (`|` → `\|`); `desescaparCelula(s)`; `dividirLinhas(s): {linhas: string[], eols: string[]}` (cada linha com seu terminador original).
- `splice.ts`: `type Edicao = {inicio: number; fim: number; texto: string}`; `aplicarEdicoes(fonte: string, edicoes: Edicao[]): string` (ordena decrescente, rejeita sobreposição com `Error`).
- `documento.ts`: `type Secao = {nivel: 1|2|3|4|5|6; titulo: string; tituloNormalizado: string; inicio: number; fim: number; tabela?: Faixa; lista?: Faixa}`; `type Faixa = {inicio: number; fim: number}` (offsets em **unidades UTF-16 da string de origem**, como o `position.start.offset` do mdast); `type Documento = {frontmatter?: Faixa & {texto: string}; secoes: Secao[]}`; `parseDocumento(fonte: string): Documento` — usa `unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).use(remarkGfm)` **só para obter offsets** de `yaml`, `heading`, `table`, `list` e `code`; `tabela`/`lista` de uma seção = primeiro nó `table`/`list` após o heading e antes do próximo heading de nível ≤ ao dele; fences de código nunca viram tabela/lista.
- `frontmatter.ts`: `lerFrontmatter(doc: Documento, fonte): {documento: YAML.Document; faixa: Faixa} | undefined` (via `YAML.parseDocument(texto)`; erro de YAML → `Error` com linha); `escreverFrontmatter(fonte, faixa, docYaml, mudou: boolean): Edicao | undefined` (se `!mudou` devolve `undefined`; senão `Edicao` com `docYaml.toString()` entre `---`, usando o EOL dominante).

- [ ] **Passo 1: Testes (falhando)** — `texto`: BOM removido e sinalizado; `detectarEol` em `a\r\nb\r\nc\n` → `CRLF`; `normalizarCabecalho('  Pressão  Arterial ')` === `normalizarCabecalho('pressão arterial')`; escape/desescape round-trip. `splice`: duas edições fora de ordem aplicadas corretamente; sobreposição lança. `documento`: para `test/fixtures/vaults/v2-exemplo/Perfis/Ana/Medicamentos.md` devolve 3 seções nível 2 com `tabela` definida, offsets batem com `fonte.slice(inicio, fim)` começando em `|`; tabela dentro de ```` ``` ```` não conta; frontmatter da `Ficha.md` tem `texto` começando em `id:`; arquivo com CRLF dá os mesmos títulos. `frontmatter`: `lerFrontmatter` preserva comentário ao `toString()`; `escreverFrontmatter` com `mudou=false` devolve `undefined`; com `doc.set('papel','Mãe')` devolve edição cujo texto contém `papel: Mãe` e mantém o comentário.
- [ ] **Passo 2: Implementar.** **Passo 3:** `npx vitest run test/unit/format` verde; `npm run typecheck`. **Passo 4: Commit** — `feat(format): texto, splice, documento (remark só para offsets) e frontmatter`

---

### Task 4: `format/` tabela e lista — parser próprio, opacos, invariantes, fast-check

**Files:**
- Create: `src/core/format/{tabela,lista}.ts`
- Test: `test/unit/format/{tabela,lista,propriedades}.test.ts` (usa o corpus `test/fixtures/dirty/` criado na Task 1)

**Interfaces (produz):**
- `tabela.ts`: `type LinhaTabela = {raw: string; eol: string; celulas: string[]; extras: Record<string,string>; modificada: boolean}`; `type LinhaOpaca = {raw: string; eol: string; indice: number; motivo: string}`; `type Tabela = {colunas: string[]; colunasExtras: string[]; cabecalhoRaw: string; delimitadorRaw: string; eolCabecalho: string; eolDelimitador: string; linhas: LinhaTabela[]; opacas: LinhaOpaca[]; eolPadrao: string}`; `parseTabela(trecho: string, colunasEsperadas: readonly string[]): {tabela: Tabela; problemas: string[]}` — valida o cabeçalho por posição (normalizado); colunas além das esperadas viram `colunasExtras` e suas células vão para `extras`; linha com menos células → `celulas` completadas com `''`; linha com mais células que o cabeçalho, ou linha que não começa com `|` → opaca; linha cujas células são todas vazias → opaca (motivo `vazia`); split por `|` **não precedido de `\`**, com `desescaparCelula` em cada célula; `emitirTabela(tabela, novasLinhas?: string[][]): string` — reemite **`raw` das linhas não modificadas e opacas na ordem original**, regenera só linhas `modificada` (células com `escaparCelula`, formato `| a | b |`) e acrescenta `novasLinhas` ao final com `eolPadrao`; cabeçalho e delimitador sempre `raw`.
- `lista.ts`: `type ItemEvento = {raw; eol; data: string; tipo: string | null; texto: string; modificada: boolean}`; `parseListaEventos(trecho): {itens: ItemEvento[]; opacas: LinhaOpaca[]}` com a gramática `^- \*\*(\d{4}-\d{2}-\d{2})\*\*( \[([a-z]+)\])? (.*)$`; itens com continuação indentada (linha seguinte começando com 2+ espaços) são anexados ao `texto`; `emitirListaEventos(itens, opacas, novos?)` idem à tabela (raw para não modificados; novos no fim).
- Invariante exportada para testes: `contarLinhas(trecho) === tabela.linhas.length + tabela.opacas.length + 2` (cabeçalho + delimitador).

- [ ] **Passo 1: Conferir o corpus sujo** da Task 1 (`git ls-files --eol test/fixtures/dirty` deve mostrar `crlf.md` com `w/crlf`); se faltar algum caso listado lá, acrescentar.
- [ ] **Passo 2: Testes (falhando)** — `tabela.test.ts`: cabeçalho fora de ordem → `problemas` contém `cabeçalho`; coluna extra `Laboratório` → `colunasExtras` e `extras['Laboratório']`; `a \| b` lido como `a | b` e reemitido como `a \| b`; linha com célula a mais → opaca com motivo; linha vazia → opaca `vazia`; **no-op**: `emitirTabela(parseTabela(x).tabela) === x` para todos os arquivos de `dirty/` e para todas as tabelas de `v2-exemplo` (iterar com `parseDocumento`); invariante de contagem em todos. `lista.test.ts`: item com `[tipo]` e sem; `- Primeira consulta em março` → opaca; continuação indentada anexada; no-op byte-idêntico no `Historico.md` de Bruno. `propriedades.test.ts` (`fast-check`, 200 execuções): gerar tabelas aleatórias (3–6 colunas, 0–20 linhas, células com `|`, `\`, acentos, vazias, CRLF ou LF) → `parseTabela` não lança e a invariante vale; gerar perturbações (BOM, espaço final, coluna extra, linha de texto no meio) → idem e `emitirTabela` no-op byte-idêntico.
- [ ] **Passo 3: Implementar.** **Passo 4:** `npx vitest run test/unit/format` verde. **Passo 5: Commit** — `feat(format): parser proprio de tabela e lista com linhas opacas e no-op byte a byte`

---

### Task 5: Codecs por arquivo (`format/arquivos/*`)

**Files:**
- Create: `src/core/format/arquivos/{ficha,medicamentos,vacinas,exames,historico,pendencias,doses,genetica,manifesto,index}.ts`
- Test: `test/unit/format/arquivos.test.ts`

**Interfaces (produz; consumido por `vault/` e, na 1B, por `commands/`):**
- Todo codec exporta `ler(fonte: string, contexto: {arquivo: string}): {dados: T; problemas: Problema[]; estado: EstadoArquivo}` e `escrever(estado: EstadoArquivo, dados: T): string`, onde `type Problema = {arquivo: string; linha?: number; codigo: string; mensagem: string}` (`problemas.ts` em `vault/` — criar aqui como `src/core/format/problema.ts` e reexportar de `vault/`) e `EstadoArquivo` guarda `fonte`, `tinhaBom`, `eol`, `documento`, as `Tabela`/lista parseadas por região e o `YAML.Document` do frontmatter — tudo que `escrever` precisa para o *splice*.
- `ficha.ts`: `T = {frontmatter: FichaFrontmatter; contatos: Contato[]; profissionais: Profissional[]}`; `escrever` só regrava frontmatter (se `mudou`) e as duas tabelas gerenciadas.
- `medicamentos.ts`: `T = {emUso: MedicamentoEmUso[]; prescritos: MedicamentoPrescrito[]; descontinuados: MedicamentoDescontinuado[]}`; seção ausente → `problemas` (`secao_ausente`) e lista vazia.
- `vacinas.ts`: `T = {vacinas: Vacina[]; antiparasitarios: Antiparasitario[]}` (`## Antiparasitários` ausente não é problema).
- `exames.ts`: `T = {pesos: Peso[]; pressoes: Pressao[]; glicemias: Glicemia[]; marcadores: Marcador[]}` — cada `## <Exame>` não canônico vira marcadores com `exame = título`; cabeçalho de marcadores inválido → problema `cabecalho_invalido` e seção ignorada.
- `historico.ts`: `T = {eventos: Evento[]}`; `pendencias.ts`: `T = {examesSolicitados: ExameSolicitado[]; consultas: Consulta[]}`; `doses.ts`: `T = {doses: Dose[]}`; `genetica.ts`: `T = {condicoes_hereditarias: string[]}`; `manifesto.ts`: `T = SalusYaml` (YAML puro, `parseDocument`).
- Validação: cada linha vira entidade via `schema.safeParse`; falha → `problemas` com linha (offset→linha via contagem de `\n`) e a linha é tratada como opaca (preservada), nunca descartada.
- `index.ts`: `export const codecs = {ficha, medicamentos, …}` e `export const ARQUIVOS_DE_VERDADE = ['Ficha.md','Medicamentos.md','Vacinas.md','Exames.md','Historico.md','Pendencias.md','Doses.md','Genetica.md'] as const`.

- [ ] **Passo 1: Testes (falhando)** sobre `v2-exemplo`: Ana → 2 em uso (`renova_em` `2026-11-05`, `termino_em` `2026-10-25`), 1 prescrito, 4 marcadores × 2 datas, `alergias` `['Dipirona']`, `conjuges` `['bruno']`, 1 contato, 5 eventos (um com `tipo === null`); Bruno → `colunasExtras` `['Laboratório']` no Hemograma e 1 opaca no histórico com `problemas.length === 0` (opaca de gramática não é problema de validação; é listada como `opaca`); Mia → 2 antiparasitários; `flag: 'alto'` sem faixa (fixture extra em `dirty/`) → problema `faixa_obrigatoria` na linha certa e a linha preservada. **No-op**: para cada arquivo de verdade dos 3 membros e cada arquivo de `dirty/`: `escrever(estado, dados) === fonte` byte a byte. **Escrita mínima**: alterar `dados.emUso[0].renova_em` e verificar que só a linha correspondente mudou (diff por linhas = 1), mantendo CRLF quando a fonte é CRLF e removendo BOM quando havia.
- [ ] **Passo 2: Implementar** os codecs sobre `documento.ts` + `tabela.ts` + `lista.ts` + `frontmatter.ts` + `splice.ts`. **Passo 3:** `npx vitest run test/unit/format` verde. **Passo 4: Commit** — `feat(format): codecs dos arquivos de verdade v2 com escrita por splice`

---

### Task 6: `vault/` — abrir um cofre v2 em memória, por membro, com problemas por arquivo

**Files:**
- Create: `src/core/vault/{Vault,perfil,problemas}.ts`
- Test: `test/unit/vault/vault.test.ts`; fixtures: `test/fixtures/vaults/v2-quebrado/` (cópia de `v2-exemplo` com `Perfis/Ana/Medicamentos.md` de cabeçalho errado, `Perfis/Bruno/Ficha.md` com YAML inválido, `Perfis/Sem Ficha/Historico.md` sem `Ficha.md`, e dois perfis com o mesmo `id`)

**Interfaces (produz):**
- `perfil.ts`: `lerPerfil(dirPerfil: string, nomePasta: string): {membro: Membro | undefined; problemas: Problema[]; estados: Record<string, EstadoArquivo>}` — lê os 8 arquivos (ausente → problema `arquivo_ausente` e seção vazia; `Ficha.md` ausente ou sem `id` válido → `membro` `undefined`).
- `Vault.ts`: `class Vault { static abrir(dir: string): Vault; readonly dir: string; readonly manifesto: SalusYaml | undefined; readonly membros: ReadonlyArray<Membro>; readonly problemas: ReadonlyArray<Problema>; membro(id: string): Membro | undefined; readonly estados: ReadonlyMap<string, EstadoArquivo> }` — lê `salus.yaml` (ausente ou `schema_versao !== 2` → problema `manifesto_invalido`, `manifesto` `undefined`, e segue); varre `Perfis/*` (pastas não ocultas, ignora `_Backups/`); **lê todos os arquivos de uma vez** (hidratação do OneDrive); `id` duplicado → problema `id_duplicado` nos dois e só o primeiro entra em `membros`; leitura síncrona (`fs.readFileSync`) nesta fase; nunca lança por conteúdo inválido — só por `dir` inexistente (`Error('Cofre não encontrado: …')`).
- `problemas.ts`: reexporta `Problema` e `codigosDeProblema` (lista fechada de códigos usados: `manifesto_invalido`, `arquivo_ausente`, `yaml_invalido`, `cabecalho_invalido`, `secao_ausente`, `linha_invalida`, `faixa_obrigatoria`, `id_invalido`, `id_duplicado`, `bom`).

- [ ] **Passo 1: Testes (falhando)** — `v2-exemplo`: 3 membros, `problemas` vazio exceto nenhum; `membro('mia')?.ficha.frontmatter.tipo === 'gato'`; `estados` tem 24 entradas. `v2-quebrado`: `abrir` não lança; `membros` contém Ana (com `medicamentos.emUso` vazio e problema `cabecalho_invalido` em `Perfis/Ana/Medicamentos.md`) e **não** contém Bruno (problema `yaml_invalido` com `linha`); `Sem Ficha` gera `arquivo_ausente`; o segundo perfil com `id` repetido gera `id_duplicado`; pasta inexistente lança `Cofre não encontrado`. Review Focus 3 coberto aqui.
- [ ] **Passo 2: Implementar.** **Passo 3:** `npx vitest run test/unit/vault` verde. **Passo 4: Commit** — `feat(vault): abertura do cofre v2 em memoria com problemas por arquivo`

---

### Task 7: `queries/` — membros, perfil, agenda (4 faixas), buscar, marcador

**Files:**
- Create: `src/core/queries/{datas,membros,perfil,agenda,buscar,marcador,index}.ts`
- Test: `test/unit/queries/{datas,agenda,consultas}.test.ts`

**Interfaces (produz; consumido pelo CLI nesta fase e pelo MCP/tela na Fase 2):**
- `datas.ts`: `diasEntre(a: DataIso, b: DataIso): number` (b − a, em dias civis, via `Date.UTC`); `somarDias(a, n): DataIso`; `hojeIso(agora = new Date()): DataIso` (data local do servidor, formatada manualmente — não `toISOString`).
- `membros.ts`: `listarMembros(vault): ResumoMembro[]` com `{id, nome, tipo, pasta, nascimento, alergias, condicoes_ativas, papel}`.
- `perfil.ts`: `type Secao = 'ficha'|'medicamentos'|'vacinas'|'exames'|'historico'|'pendencias'|'doses'|'genetica'`; `lerPerfil(vault, id, secoes?: Secao[]): Partial<Membro> | undefined` (sem `secoes` devolve tudo; `estados` nunca saem).
- `agenda.ts`: `type ItemAgenda = {membro: string; nome: string; tipo: 'renovacao'|'termino'|'receita'|'vacina'|'antiparasitario'|'exame_solicitado'|'consulta'; descricao: string; data: DataIso | null}`; `type Agenda = {hoje: DataIso; vencido: ItemAgenda[]; ate30: ItemAgenda[]; de31a90: ItemAgenda[]; semData: ItemAgenda[]}`; `calcularAgenda(vault, hoje: DataIso): Agenda` — fontes: em uso `renova_em`/`termino_em`; prescritos `validade_receita` (vazia → `semData`); vacinas `proxima_em`; antiparasitários `proximo_em`; exames solicitados `realizar_ate` (vazia → `semData`); consultas `data`. Faixas: `d = diasEntre(hoje, data)`: `d < 0` → vencido; `0 ≤ d ≤ 30` → ate30; `31 ≤ d ≤ 90` → de31a90; `d > 90` → fora da agenda; cada faixa ordenada por data, depois nome.
- `buscar.ts`: `buscar(vault, texto): Ocorrencia[]` com `{membro, arquivo, linha, trecho}` — `includes` sobre texto normalizado (NFC, case-fold, sem acentos) nas fontes dos arquivos de verdade; máximo 200 ocorrências.
- `marcador.ts`: `serieMarcador(vault, id, nomeMarcador): PontoMarcador[]` com `{data, valor, valorNumerico, unidade, faixa_do_laudo, flag, exame}` ordenado por data; nome comparado normalizado.

- [ ] **Passo 1: Testes (falhando)** — `datas`: `diasEntre('2026-02-28','2026-03-01') === 1`; `('2024-02-28','2024-03-01') === 2`; `('2026-12-31','2027-01-01') === 1`; `somarDias('2026-01-31', 1) === '2026-02-01'`. `agenda` com `hoje = '2026-10-21'` sobre `v2-exemplo`: `termino_em 2026-10-25` → `ate30` (renovação/término da Ana), `2026-11-05` → `ate30`, `validade 2026-12-01` → `de31a90`, vacina da Mia `2026-09-01` → `vencido`, antiparasitário `2026-10-30` → `ate30`, prescrito sem validade → `semData`; item com data **igual a hoje** → `ate30` (Review Focus 4); `hoje = '2028-02-29'` aceito. `consultas`: `listarMembros` devolve 3 ordenados por nome; `lerPerfil(vault,'ana',['medicamentos'])` só tem essa chave; `buscar(vault,'dipirona')` acha a Ficha da Ana (acento/caixa ignorados); `serieMarcador(vault,'ana','Colesterol total')` devolve 2 pontos ordenados com `valorNumerico` numérico.
- [ ] **Passo 2: Implementar.** **Passo 3:** `npx vitest run test/unit/queries` verde. **Passo 4: Commit** — `feat(queries): membros, perfil, agenda em 4 faixas, buscar e serie de marcador`

---

### Task 8: CLI — `parseArgs`, comandos de leitura `--json`, ajuda atualizada

**Files:**
- Create: `src/cli/args.ts`, `src/cli/comandos/consultas.ts`
- Modify: `src/cli/main.ts` (despacho via registro de comandos), `src/cli/help.ts` (novas linhas), `src/core/framework/manifest.ts` (`KNOWN_FLAGS` deixa de existir: as flags válidas passam a vir do registro)
- Test: `test/unit/args.test.ts`, `test/cli/leitura.test.ts`; `test/unit/main.test.ts` (ajustar só se o registro mudar assinaturas)

**Interfaces (produz):**
- `args.ts`: `type EspecComando = {nome: string; aliases?: string[]; posicionais: {nome: string; obrigatorio: boolean}[]; opcoes: Record<string, {tipo: 'boolean'|'string'; curto?: string}>}`; `parseArgumentos(argv, specs: EspecComando[]): {comando?: string; posicionais: string[]; opcoes: Record<string, string | boolean>; erro?: {tipo: 'opcao_desconhecida'|'comando_desconhecido'|'posicional_faltando'; detalhe: string}}` — implementado com `node:util` `parseArgs({strict: true, allowPositionals: true, tokens: true})`; `--version/-v`, `--help/-h` globais; **mantém a precedência atual**: opção desconhecida > `--version` > `--help`/sem comando > comando desconhecido > posicional faltando.
- `main.ts`: registro `comandos: EspecComando[]` com `init [pasta] --force/-f`, `update [pasta]`, `doctor|check|status [pasta]`, `inspecionar [pasta] --json`, `anonimizar <origem> <destino> --semente <n>`, `membros --cofre <pasta> --json`, `perfil <id> --cofre --secao <a,b> --json`, `agenda --cofre --hoje <AAAA-MM-DD> --json`, `buscar <texto> --cofre --json`, `marcador <id> <nome> --cofre --json`. Mensagens atuais mantidas (`Opção desconhecida:`, `Comando desconhecido:`); nova: `Argumento obrigatório ausente: <nome>` (código 1).
- `comandos/consultas.ts`: `executarConsulta(nome, posicionais, opcoes, io, cwd): number` — abre o `Vault` em `--cofre` (default `cwd`); `--json` obrigatório nesta fase (sem ele imprime `Use --json (saída em texto chega na Fase 2)` e devolve 1); saída = `JSON.stringify(resultado, null, 2)`; cofre inexistente → `io.err('Cofre não encontrado: …')` e 1; `perfil`/`marcador` sem resultado → `{"erro": "nao_encontrado", …}` e código 2; `problemas` do vault vão num campo `problemas` no JSON de `membros`.

- [ ] **Passo 1: Testes (falhando)** — `args.test.ts`: os 9 casos de precedência atuais do `main.test.ts` reescritos contra `parseArgumentos` + `--cofre=x` e `--cofre x` equivalentes + `--secao medicamentos,exames` + posicional faltando. `leitura.test.ts` (processo filho, sobre uma cópia temporária de `v2-exemplo`): `membros --cofre <dir> --json` → JSON com 3 itens e `problemas: []`; `perfil ana --secao medicamentos --json` → só `medicamentos`; `agenda --hoje 2026-10-21 --json` → faixas como na Task 7; `buscar dipirona --json` → 1+ ocorrências; `marcador ana "Colesterol total" --json` → 2 pontos; `perfil zzz --json` → código 2; `membros --cofre /nao/existe --json` → código 1 com `Cofre não encontrado`; `membros` sem `--json` → código 1; `--help` lista `inspecionar` e `agenda`. Caracterização existente (`test/cli/caracterizacao.test.ts`) continua verde sem alterações.
- [ ] **Passo 2: Implementar** (`init/update/doctor` continuam chamando as funções atuais; `KNOWN_FLAGS` removido e `manifest.test.ts` ajustado). **Passo 3:** `npm run typecheck && npm test` verdes. **Passo 4: Commit** — `feat(cli): parseArgs, comandos de leitura --json (membros, perfil, agenda, buscar, marcador)`

---

### Task 9: `inspecionar` e `anonimizar`

**Files:**
- Create: `src/core/inspecao/{inspecionar,anonimizar}.ts`, `src/cli/comandos/{inspecionar,anonimizar}.ts`
- Test: `test/unit/inspecao/{inspecionar,anonimizar}.test.ts`; fixture `test/fixtures/vaults/v1-exemplo/` (gerada no `beforeAll` com `init` + `simulateFamily` **mais** valores realistas: `_index.yaml` com 2 membros, nomes em `META.md`, 1 `Documentos/Exames/2026-03-10_Hemograma.pdf` vazio e um `Historico.md` com 3 datas — construir programaticamente num helper `test/helpers/v1.ts` para não commitar dados)

**Interfaces (produz):**
- `inspecionar.ts`: `inspecionar(dir): Inspecao` com `{versao_detectada: 'v1'|'v2'|'desconhecida'; raiz: string; pastas: string[]; arquivos: ArquivoInspecionado[]; binarios: number}` e `ArquivoInspecionado = {caminho; bom: boolean; eol: 'LF'|'CRLF'|'misto'; frontmatter_chaves?: string[]; yaml_chaves?: string[]; secoes?: {nivel; titulo; tabela_colunas?: string[]; linhas?: number; itens_lista?: number}[]}` — detecta v2 por `salus.yaml` `schema_versao: 2`, v1 por `Familia/_index.yaml` ou `AGENTS.md` sem sentinela; **mascara** `Perfis/<Nome>` → `Perfis/<membro-N>` (N estável por ordem alfabética) em `pastas` e `caminho`; nunca inclui valores de YAML, células, nem texto de itens; títulos de seção são incluídos (são estruturais), exceto o `# <Título> — <Nome>` nível 1, que vira `# … — <membro-N>`.
- `anonimizar.ts`: `anonimizar(origem, destino, opcoes: {semente?: number}): RelatorioAnonimizacao` com `{semente; deslocamentoDias; membros: number; arquivosTexto: number; binarios: number}` — regras: (1) aliases de membros: nomes das pastas `Perfis/*`, `nome:` no `_index.yaml`/frontmatter, linhas da tabela de membros do `META.md` e `familia:` → `Membro A`, `Membro B`, … (`id` → `membro-a`); o alias substitui o nome **em todo texto e em nomes de arquivos/pastas**, inclusive formas com e sem acento e caixa; (2) datas `AAAA-MM-DD` e `DD/MM/AAAA` deslocadas por `deslocamentoDias` ∈ [100, 900] derivado da semente (também em nomes de arquivo); (3) números em células de tabela e valores YAML numéricos perturbados ±(0–15)% mantendo casas decimais e vírgula; (4) telefones e e-mails → `(00) 00000-0000` / `pessoa@exemplo.com`; (5) células das colunas `Prescrito por`, `Veterinário`, `Solicitado por`, `Profissional` e linhas de contatos/profissionais → `Dr. Alias N`; (6) parágrafos e itens de lista fora de tabelas/frontmatter/cabeçalhos: o prefixo estrutural (`- **data**`, `- [ ]`, `**Rótulo:**`) é mantido e o texto livre vira `Texto anonimizado (N caracteres).`; (7) arquivos que não são `.md/.yaml/.yml/.txt/.json` → arquivo vazio com o nome tratado; (8) `destino` precisa não existir ou estar vazio; escreve `ANONIMIZACAO.md` no destino com semente, deslocamento e contagens — **nunca o mapa de nomes**. Determinístico para a mesma semente.
- CLI: `inspecionar [pasta] --json` (sem `--json`: texto em árvore, uma linha por arquivo com seções e colunas); `anonimizar <origem> <destino> [--semente n]` imprime o relatório; ambos saem 1 se a pasta não existe.

- [ ] **Passo 1: Testes (falhando)** — `inspecionar`: sobre `v2-exemplo` → `versao_detectada 'v2'`, 3 pastas de perfil mascaradas `Perfis/membro-1..3`, `Ficha.md` com `frontmatter_chaves` contendo `alergias` e nenhum valor (`JSON.stringify(resultado)` não contém `Dipirona`, `Ana`, `2026-11-05`); sobre `v1-exemplo` → `'v1'`, `yaml_chaves` do `_index.yaml` contém `membros` e não contém nomes; arquivo CRLF reporta `eol 'CRLF'`. `anonimizar` (semente fixa 42) sobre `v1-exemplo` e sobre `v2-exemplo`: destino existe com a mesma árvore (comparar `inspecionar(origem)` e `inspecionar(destino)` ignorando `raiz`); `JSON.stringify(todos os textos do destino)` e a lista de caminhos do destino **não contêm** nenhum nome original, nenhuma data original (lista das datas da fixture) nem o telefone da fixture; o `.pdf` do destino tem 0 bytes e nome com data deslocada; rodar duas vezes com a mesma semente dá bytes idênticos; destino não vazio → lança. Review Focus 5 coberto aqui.
- [ ] **Passo 2: Implementar.** **Passo 3:** `npm run typecheck && npm test` verdes; rodar à mão `node dist/cli.js inspecionar test/fixtures/vaults/v2-exemplo` e conferir a olho que nenhum valor aparece. **Passo 4: Commit** — `feat(inspecao): salus-ai inspecionar (estrutura sem valores) e anonimizar (copia anonimizada deterministica)`

---

### Task 10: Fechar a Fase 1A (docs, STATUS, CHANGELOG)

**Files:** Modify `STATUS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `README.md` (seção "Comandos do terminal": `inspecionar`, `anonimizar`, consultas `--json` marcadas como "para agentes e scripts"), `framework/COMECE_AQUI.md` (um parágrafo: "Quer me ajudar a testar a migração? Rode `npx salus-ai anonimizar <sua pasta> <pasta nova>`…" — só se o dono aprovar o texto no review), `scripts/check-docs.sh` (comandos citados no README existem no `help.ts`).

- [ ] **Passo 1:** STATUS: "Concluído" ganha a Fase 1A; "Onde retomar": "Fase 1B — comandos/ChangeSet/views/sync/vigia/doctor v2 (plano próprio); antes, o dono roda `salus-ai anonimizar` numa cópia do cofre real e coloca o resultado em `test/fixtures/local/`"; "Aguardando aprovação": pedir ao dono a fixture local. CHANGELOG `[Não publicado]` → Adicionado: formato v2 (FORMATO.md), codecs, consultas `--json`, `inspecionar`, `anonimizar`; Interno: dependências de runtime (ADR-0008). CONTRIBUTING: tabela ganha `src/core/{schema,format,vault,queries,inspecao}`, regra "todo codec tem teste de no-op byte-idêntico", e o corpus `test/fixtures/dirty/`.
- [ ] **Passo 2:** `npm run typecheck && npm test && bash scripts/check-docs.sh` verdes. **Passo 3: Commit** — `docs: fecha a Fase 1A (formato v2, codecs e leitura)`

---

## Verificação final da fase

1. `npm run typecheck && npm test && bash scripts/check-docs.sh` verdes localmente (Windows) e na CI do PR (4 jobs).
2. `node dist/cli.js inspecionar test/fixtures/vaults/v2-exemplo --json | grep -c Dipirona` → `0`.
3. `node dist/cli.js anonimizar test/fixtures/vaults/v2-exemplo <tmp> --semente 7` e `grep -r "Ana" <tmp>` → nada.
4. Tamanho de `dist/cli.js` registrado no `STATUS.md` (medir: `ls -l dist/cli.js`); se passar de 2 MB, abrir item para a 1B.
5. Entrega ao dono: instrução de uma linha para rodar `anonimizar` numa **cópia** do cofre real, fora do repositório, e colocar o resultado em `test/fixtures/local/` (gitignored) — a 1B/1C só começam a migração com ela.

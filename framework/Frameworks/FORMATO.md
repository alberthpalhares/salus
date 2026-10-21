# Formato do cofre — Salus v2

> **Estado:** contrato do formato v2 (`schema_versao: 2`), em implementação para a v0.5.0. O CLI desta versão do pacote ainda opera o formato anterior; os comandos que leem e gravam o v2 chegam com a v0.5.0.

Esta é a especificação legível do formato dos arquivos de verdade do Salus. Três leitores usam o mesmo contrato: você (Obsidian, VS Code, Explorador de Arquivos), a IA e o código do Salus (leitura, gravação, `doctor`, migração). Os cabeçalhos, colunas e chaves abaixo são **literais**, salvo a normalização (trim, NFC, caixa, espaços repetidos) com que cabeçalhos e nomes de coluna são comparados (ver "Cabeçalhos" em Regras gerais); as chaves do frontmatter são comparadas exatamente. Todos os exemplos vêm do cofre de exemplo fictício usado nos testes; nenhum dado é real.

## Estrutura do cofre

```
<cofre>/
├── salus.yaml                  manifesto do cofre (fica na raiz)
├── Familia/
│   └── Notas_para_a_IA.md      texto livre da família para a IA (o Salus nunca sobrescreve)
├── Perfis/
│   └── <Nome legível>/         pasta com nome humano, renomeável; o id fica na Ficha.md
│       ├── Ficha.md · Medicamentos.md · Vacinas.md · Exames.md
│       ├── Historico.md · Pendencias.md · Doses.md · Genetica.md      (arquivos de verdade)
│       └── Analises/ · Documentos/
├── Frameworks/                 PROTOCOLO_CLINICO.md e este FORMATO.md
└── _Caixa de Entrada/          documentos novos, antes de arquivar
```

Os oito arquivos de cada perfil são a **verdade**. Qualquer arquivo gerado (agenda, resumos, índices) é somente leitura e nunca é fonte de dados. Perfis de pessoa não têm a seção `## Antiparasitários`; perfis de animais (`cao`, `gato`, `outro`) têm.

## Regras gerais

- **Arquivo e texto.** UTF-8. Um BOM (U+FEFF) no início é tolerado: é ignorado na leitura, removido ao gravar o arquivo, e o `doctor` avisa. O fim de linha dominante do arquivo (LF ou CRLF) é preservado ao gravar; arquivos novos usam LF. O Salus nunca reescreve o arquivo inteiro: troca só as linhas que mudaram e copia o resto byte a byte.
- **Datas e horas.** Data em ISO estrito `AAAA-MM-DD`; hora em `HH:MM`. No frontmatter, datas entre aspas (`nascimento: "1985-03-10"`) para continuarem texto. Data desconhecida é célula vazia. Data que não existe no calendário (`2026-02-30`) é erro de schema.
- **Valores de exame.** `Valor` é texto exatamente como está no laudo (`5,5`, `< 0,5`). O número usado em gráficos é derivado depois; nunca arredonde nem converta ao registrar.
- **Células de tabela.** O caractere `|` dentro de uma célula é escrito `\|`. HTML numa célula é só texto. Célula vazia é válida.
- **Colunas.** As colunas listadas aqui devem aparecer neste nome e nesta ordem. Colunas extras no fim (por exemplo `Laboratório`) são preservadas e ignoradas pelo Salus.
- **Cabeçalhos.** O Salus acha cada região pelo cabeçalho `##` canônico e confere as colunas da tabela pelo nome. A comparação (de cabeçalhos e de nomes de coluna) apara espaços, normaliza o Unicode (NFC), ignora maiúsculas e minúsculas e colapsa espaços repetidos.
- **Frontmatter.** Só texto e listas de texto (nada de listas de objetos: o Obsidian não as edita). Chaves desconhecidas e comentários YAML são preservados. Valores escalares são sempre texto; números longos, como `microchip`, vão entre aspas.

## Regiões gerenciadas

Uma **região gerenciada** é um cabeçalho `##` canônico mais a **primeira** tabela (ou lista, no `Historico.md`) que vem depois dele, até o próximo cabeçalho de nível 2 ou menor. Só essa tabela ou lista é do Salus. O resto da seção (texto antes ou depois da tabela, subseções `###`) é livre: o Salus não mexe e você pode escrever à vontade. Cabeçalhos `##` que não são canônicos também são texto livre, exceto nos exames (ver `Exames.md`).

## Linhas opacas

Dentro de uma região gerenciada, o Salus preserva sem alterar tudo o que não entende e as lista no `doctor`:

- linha de tabela com mais células que o cabeçalho (uma linha com menos células é lida normalmente: as células que faltam no fim valem vazio);
- linha dentro da tabela que não começa com `|` (por exemplo, uma frase solta; espaços antes do `|` não contam);
- item de lista do histórico fora da gramática (por exemplo, `- Primeira consulta em março`).

Linhas de tabela só com células vazias (`| | |`, o resto de um modelo) também são opacas, mas são ignoradas na leitura: não viram registro. Linha opaca nunca é apagada nem reordenada; para corrigi-la, edite à mão.

## Cabeçalhos canônicos

Cada linha abaixo é um cabeçalho `##` que o Salus procura. Os modelos em `framework/templates/` trazem todos eles (a verificação `scripts/check-docs.sh` confere).

| Arquivo | Cabeçalho | Região gerenciada |
|---|---|---|
| `Ficha.md` | `## Contatos de emergência` | tabela de contatos |
| `Ficha.md` | `## Profissionais de referência` | tabela de profissionais |
| `Medicamentos.md` | `## Em uso` | tabela de medicamentos em uso |
| `Medicamentos.md` | `## Prescritos` | tabela de receitas ainda não iniciadas |
| `Medicamentos.md` | `## Descontinuados` | tabela de medicamentos encerrados |
| `Vacinas.md` | `## Vacinas` | tabela de vacinas |
| `Vacinas.md` | `## Antiparasitários` | tabela de antiparasitários (só animais) |
| `Exames.md` | `## Peso` | tabela de peso |
| `Exames.md` | `## Pressão arterial` | tabela de pressão arterial |
| `Exames.md` | `## Glicemia` | tabela de glicemia |
| `Historico.md` | `## Eventos` | lista de eventos |
| `Pendencias.md` | `## Exames solicitados` | tabela de exames pedidos |
| `Pendencias.md` | `## Consultas e check-ups` | tabela de consultas marcadas |
| `Doses.md` | `## Doses` | tabela de doses tomadas |

## Arquivos

### `salus.yaml`

YAML puro, na raiz do cofre. O Salus lê e atualiza; não é preciso editar.

| Chave | Valor |
|---|---|
| `schema_versao` | `2` (número) |
| `versao_salus` | versão do Salus que gravou o cofre, em texto (`"0.5.0"`) |
| `familia` | nome ou sobrenome que identifica a família |
| `criado_em` | data ISO, entre aspas |
| `ultima_revisao` | data ISO entre aspas, ou `null` se nunca houve revisão |

```yaml
schema_versao: 2
versao_salus: "0.5.0"
familia: Exemplo
criado_em: "2026-01-15"
ultima_revisao: "2026-09-15"
```

### `Ficha.md`

Frontmatter (texto e listas de texto), depois o corpo.

| Chave | Valor |
|---|---|
| `id` | obrigatório. Identificador curto: letras minúsculas sem acento, números e hífen (`ana`, `ana-maria`). Único no cofre e imutável; a pasta pode ser renomeada, o `id` não |
| `nome` | obrigatório. Como a pessoa ou o animal é chamado |
| `tipo` | obrigatório. `pessoa`, `cao`, `gato` ou `outro` |
| `nascimento` | data ISO entre aspas, ou vazio |
| `sexo` | texto livre (`F`, `M`) |
| `tipo_sanguineo` | texto livre (`O+`) |
| `plano` | texto livre: plano de saúde ou convênio |
| `papel` | texto livre: papel na família (`Mãe`, `Gata da família`) |
| `alergias` | `null` = ainda não perguntado; `[]` = confirmado que não há alergia conhecida; ou lista de textos |
| `condicoes_ativas` | lista de textos |
| `marcadores_chave` | lista com os **nomes** dos marcadores acompanhados (sem valores) |
| `pais_biologicos` | lista de `id` de membros **ou** nomes de pessoas sem perfil (`"Maria (avó materna)"`). Decide o cruzamento genético; irmãos que listam o mesmo nome compartilham linhagem |
| `responsaveis` | lista de `id` dos responsáveis (crianças) |
| `tutores` | lista de `id` dos tutores (animais) |
| `conjuges` | lista de `id`; só alimenta a árvore da família |
| `raca`, `castrado`, `microchip` | só animais, texto livre (`castrado`: `sim`, `não` ou a data); `microchip` entre aspas |
| *(chave ausente ou vazia)* | vale `''` (texto) ou `[]` (lista); só `alergias` é diferente: ausente ou vazia vale `null` (ainda não perguntado) |

Corpo: o título `# Ficha de Saúde — <nome>`, texto livre, e as duas regiões gerenciadas:

- `## Contatos de emergência` → `| Nome | Relação | Telefone |`
- `## Profissionais de referência` → `| Nome | Especialidade | Contato | Acompanha |`

```markdown
---
id: ana
nome: Ana
tipo: pessoa
nascimento: "1985-03-10"
sexo: F
tipo_sanguineo: O+
plano: Plano Exemplo Saúde
papel: Mãe
# alergias: null = ainda não perguntado; [] = sem alergias conhecidas; lista = alergias confirmadas
alergias: ["Dipirona"]
condicoes_ativas: ["Hipertensão"]
marcadores_chave: ["Colesterol total"]
pais_biologicos: ["Maria (avó materna)"]
responsaveis: []
tutores: []
conjuges: [bruno]
---

# Ficha de Saúde — Ana

Ana prefere consultas pela manhã e sempre leva o diário de pressão 📒. Evita café depois das 16 h ☕ por orientação da cardiologista. Em qualquer atendimento de urgência, avisar logo na chegada: alergia confirmada a dipirona 🚑.

## Contatos de emergência

| Nome | Relação | Telefone |
|---|---|---|
| Bruno | Cônjuge | (11) 90000-0001 |

Ligar primeiro para o Bruno; se não atender, tentar de novo em dez minutos.

## Profissionais de referência

| Nome | Especialidade | Contato | Acompanha |
|---|---|---|---|
| Dra. Helena Prado | Cardiologia | (11) 3000-0001 | Hipertensão |
| Dr. Paulo Mendes | Clínica geral | (11) 3000-0002 | Check-up anual |

## Observações

Texto livre: o Salus não mexe nesta seção. Escreva aqui o que ajudar quem for atender.
```

### `Medicamentos.md`

Três tabelas. `Prescrito por` é o mesmo cabeçalho para pessoas e animais. Dose e frequência ficam em colunas separadas. `Renova em` é a renovação da receita de uso contínuo; `Término em` é o fim de um tratamento de ciclo fechado (por exemplo, antibiótico por 7 dias): preencha só um dos dois. Um medicamento nunca entra em `Em uso` sozinho: ele sai de `Prescritos` para `Em uso`, e de `Em uso` para `Descontinuados`, movendo a linha de uma tabela para a outra, sempre com a confirmação de quem usa.

- `## Em uso` → `| Medicamento | Dose | Frequência | Via | Desde | Prescrito por | Renova em | Término em | Obs |`
- `## Prescritos` → `| Medicamento | Dose | Frequência | Data da receita | Prescrito por | Validade da receita | Obs |`
- `## Descontinuados` → `| Medicamento | Dose | Frequência | Início | Fim | Prescrito por | Motivo |`

Colunas de data (`Desde`, `Renova em`, `Término em`, `Data da receita`, `Validade da receita`, `Início`, `Fim`) são ISO ou vazias.

```markdown
# Medicamentos — Ana

## Em uso

| Medicamento | Dose | Frequência | Via | Desde | Prescrito por | Renova em | Término em | Obs |
|---|---|---|---|---|---|---|---|---|
| Losartana | 50 mg | 1x ao dia | oral | 2024-08-20 | Dra. Helena Prado | 2026-11-05 | | Uso contínuo |
| Amoxicilina | 500 mg | a cada 8 h | oral | 2026-10-18 | Dr. Paulo Mendes | | 2026-10-25 | Tomar com alimento \| completar os 7 dias |

## Prescritos

| Medicamento | Dose | Frequência | Data da receita | Prescrito por | Validade da receita | Obs |
|---|---|---|---|---|---|---|
| Atorvastatina | 20 mg | 1x ao dia, à noite | 2026-10-10 | Dra. Helena Prado | 2026-12-01 | Ainda não iniciada |

## Descontinuados

| Medicamento | Dose | Frequência | Início | Fim | Prescrito por | Motivo |
|---|---|---|---|---|---|---|
| | | | | | | |
```

A última tabela do exemplo tem só uma linha de modelo vazia (`| | | | | | | |`): ela é ignorada na leitura. A célula `Tomar com alimento \| completar os 7 dias` mostra o `|` escapado.

### `Vacinas.md`

- `## Vacinas` → `| Vacina | Aplicada em | Próxima em | Obs |`
- `## Antiparasitários` (só animais) → `| Produto | Tipo | Aplicado em | Próximo em | Obs |`, com `Tipo` igual a `antipulgas` ou `vermifugo`.

```markdown
# Vacinas — Ana

## Vacinas

| Vacina | Aplicada em | Próxima em | Obs |
|---|---|---|---|
| Influenza | 2026-04-15 | 2027-04-15 | Campanha anual |
| dT (difteria e tétano) | 2022-06-10 | 2032-06-10 | Reforço a cada 10 anos |
| COVID-19 (reforço) | 2025-11-20 | | |
```

Exemplo de animal, com antiparasitários:

```markdown
# Vacinas — Mia

## Vacinas

| Vacina | Aplicada em | Próxima em | Obs |
|---|---|---|---|
| V4 (quádrupla felina) | 2025-09-01 | 2026-09-01 | Reforço anual |
| Antirrábica | 2026-02-10 | 2027-02-10 | |

## Antiparasitários

| Produto | Tipo | Aplicado em | Próximo em | Obs |
|---|---|---|---|---|
| Revolution 45 mg | antipulgas | 2026-09-30 | 2026-10-30 | Aplicação mensal |
| Drontal Gatos | vermifugo | 2026-08-10 | 2027-02-10 | |
```

### `Exames.md`

Quatro tipos de tabela. Peso, pressão e glicemia têm cabeçalhos fixos; **qualquer outro cabeçalho `##` é um exame de laboratório** (`## Hemograma`, `## Perfil lipídico`) e usa a tabela de marcadores.

- `## Peso` → `| Data | Peso (kg) | Obs |`
- `## Pressão arterial` → `| Data | Sistólica | Diastólica | FC | Obs |`
- `## Glicemia` → `| Data | Hora | Valor (mg/dL) | Condição | Obs |`
- exame de laboratório (nome livre no cabeçalho) → `| Data | Marcador | Valor | Unidade | Faixa do laudo | Flag | Obs |`

`Flag` é `normal`, `alto`, `baixo` ou vazio, **sempre a do próprio laudo**, e só existe quando `Faixa do laudo` está preenchida: o Salus não interpreta valores nem inventa faixas. `Condição` da glicemia é texto livre (`jejum`, `pós-prandial`). Uma linha por marcador por data.

```markdown
# Exames — Ana

## Peso

| Data | Peso (kg) | Obs |
|---|---|---|
| 2026-03-10 | 68,4 | |
| 2026-06-12 | 67,1 | Depois de três meses de caminhada |
| 2026-09-15 | 66,5 | |

## Pressão arterial

| Data | Sistólica | Diastólica | FC | Obs |
|---|---|---|---|---|
| 2026-09-15 | 128 | 82 | 72 | Aferição no consultório |
| 2026-10-05 | 124 | 80 | 70 | Aferição em casa |

## Glicemia

| Data | Hora | Valor (mg/dL) | Condição | Obs |
|---|---|---|---|---|
| 2026-09-15 | 07:30 | 92 | jejum | |

## Hemograma

| Data | Marcador | Valor | Unidade | Faixa do laudo | Flag | Obs |
|---|---|---|---|---|---|---|
| 2026-03-10 | Hemoglobina | 13,2 | g/dL | 12,0 a 15,5 | normal | |
| 2026-03-10 | Leucócitos | 6800 | /mm³ | 4000 a 11000 | normal | |
| 2026-03-10 | Plaquetas | 250 | mil/mm³ | 150 a 450 | normal | |
| 2026-03-10 | Colesterol total | 212 | mg/dL | < 190 | alto | Flag do próprio laudo |
| 2026-09-15 | Hemoglobina | 13,8 | g/dL | 12,0 a 15,5 | normal | |
| 2026-09-15 | Leucócitos | 7200 | /mm³ | 4000 a 11000 | normal | |
| 2026-09-15 | Plaquetas | 262 | mil/mm³ | 150 a 450 | normal | |
| 2026-09-15 | Colesterol total | 188 | mg/dL | < 190 | normal | |
```

### `Historico.md`

Log de eventos, na lista da região `## Eventos`. Cada item segue a gramática:

```
- **AAAA-MM-DD** [tipo] texto
```

`[tipo]` é opcional e vale `consulta`, `sintoma`, `procedimento` ou `observacao`. Um evento pode continuar nas linhas seguintes, desde que indentadas com dois ou mais espaços; elas fazem parte do texto. Eventos não se editam: um fato novo ou uma correção é um novo item no fim. Item fora da gramática é opaco.

```markdown
# Histórico de Saúde — Ana

## Eventos

- **2026-03-10** [consulta] Consulta de rotina com a cardiologista; pressão controlada.
- **2026-03-09** Coleta de sangue para hemograma e colesterol.
- **2026-06-05** [sintoma] Dor de cabeça leve por três dias; melhorou com repouso.
- **2026-09-15** [procedimento] Exames de controle colhidos em jejum.
- **2026-10-10** [observacao] A cardiologista sugeriu iniciar atorvastatina; receita retirada.
```

### `Pendencias.md`

- `## Exames solicitados` → `| Exame | Solicitado em | Solicitado por | Realizar até | Obs |`
- `## Consultas e check-ups` → `| Tipo | Data | Profissional | Obs |`

`Realizar até` pode ficar vazio. A linha sai da tabela quando o exame é feito ou a consulta acontece; o registro fica em `Exames.md` e no `Historico.md`.

```markdown
# Pendências — Ana

## Exames solicitados

| Exame | Solicitado em | Solicitado por | Realizar até | Obs |
|---|---|---|---|---|
| Perfil lipídico completo | 2026-10-10 | Dra. Helena Prado | 2027-02-15 | Em jejum de 12 horas |

## Consultas e check-ups

| Tipo | Data | Profissional | Obs |
|---|---|---|---|
| Retorno de cardiologia | 2027-03-18 | Dra. Helena Prado | Levar o diário de pressão |
```

### `Doses.md`

- `## Doses` → `| Data | Hora | Medicamento | Dose | Obs |`

Registro de doses tomadas, **só de acréscimo**: novas linhas vão sempre ao fim; nunca reordene nem edite as antigas.

```markdown
# Doses — Ana

## Doses

| Data | Hora | Medicamento | Dose | Obs |
|---|---|---|---|---|
| 2026-10-20 | 08:00 | Losartana | 50 mg | |
| 2026-10-20 | 22:00 | Amoxicilina | 500 mg | Com o jantar |
| 2026-10-21 | 08:00 | Losartana | 50 mg | |
```

### `Genetica.md`

Frontmatter com uma única chave, `condicoes_hereditarias` (lista de textos, só o nome de cada condição, `[]` se nenhuma). O corpo é texto livre e o Salus não o altera.

```markdown
---
condicoes_hereditarias: ["Hipertensão"]
---

# Genética e Histórico Familiar — Ana

Hipertensão relatada na família biológica (informação da própria pessoa, sem laudo).

## Predisposições monitoradas

Pressão arterial e colesterol, com acompanhamento de cardiologia.
```

## Vocabulários fechados

| Onde | Valores |
|---|---|
| `tipo` (Ficha) | `pessoa`, `cao`, `gato`, `outro` |
| `alergias` (Ficha) | `null`, `[]` ou lista de textos |
| `Tipo` (antiparasitários) | `antipulgas`, `vermifugo` |
| `Flag` (marcadores) | `normal`, `alto`, `baixo`, ou vazio |
| `[tipo]` (evento do histórico) | `consulta`, `sintoma`, `procedimento`, `observacao`, ou sem tipo |

## O que o Salus preserva sem entender

Uma coluna extra no fim da tabela (`Laboratório`) é preservada e ignorada:

```markdown
## Hemograma

| Data | Marcador | Valor | Unidade | Faixa do laudo | Flag | Obs | Laboratório |
|---|---|---|---|---|---|---|---|
| 2026-08-20 | Hemoglobina | 15,1 | g/dL | 13,5 a 17,5 | normal | | Laboratório Exemplo |
| 2026-08-20 | Leucócitos | 11800 | /mm³ | 4000 a 11000 | alto | Sem sintomas no dia da coleta | Laboratório Exemplo |
```

Um item do histórico fora da gramática é opaco: o Salus o mantém no lugar e o `doctor` o lista.

```markdown
# Histórico de Saúde — Bruno

## Eventos

- **2026-02-12** [consulta] Check-up anual com o clínico geral.
- Primeira consulta em março
- **2026-08-20** [procedimento] Coleta de sangue para hemograma.
```

## Editando à mão

- Mantenha o cabeçalho `##` canônico, o cabeçalho da tabela e a linha delimitadora (`|---|---|`).
- Escreva datas como `AAAA-MM-DD` e `|` como `\|` dentro de células.
- Para mudar o estado de um medicamento, mova a linha de uma tabela para outra; não crie `Em uso` por conta própria sem confirmar que o medicamento foi comprado ou iniciado.
- Para renomear um perfil, renomeie a pasta; não mude o `id` da Ficha.
- Nunca edite arquivos gerados: a edição manual é sobrescrita.

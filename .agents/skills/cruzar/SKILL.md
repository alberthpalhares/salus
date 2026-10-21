---
name: cruzar
description: "Compara exames do mesmo marcador ao longo do tempo, relaciona condições/medicamentos com resultados, e identifica padrões entre membros da família. Acione com: 'cruza os exames de...', 'compara o [marcador] de...', 'evoluiu como...'."
---

# Skill: Cruzar

Esta é a skill que entrega o valor analítico central do Salus: olhar o histórico inteiro de um membro (ou de vários) e mostrar relações temporais ou familiares que não são óbvias olhando um documento isolado.

## Antes de tudo: consulte o índice

Leia `Familia/_index.yaml` primeiro. Se o `marcadores_chave` do membro já cobre o que foi pedido (ex: "qual foi o último colesterol?"), responda a partir dele. Abra `Perfis/[Nome]/Exames.md` quando precisar da série histórica completa do marcador (múltiplas datas) ou de um marcador que não está entre os marcadores-chave.

## Tipos de cruzamento

1. **Evolução de um marcador ao longo do tempo** (ex: *"como está o colesterol do Alberth?"*)
   - Leia `Perfis/[Nome]/Exames.md`, encontre todas as entradas do marcador pedido e ordene por data.
   - Mostre a evolução numérica com unidade, indicando se subiu, desceu ou ficou estável, acompanhada da faixa de referência e flag de cada data (**sempre a impressa no próprio laudo**, nunca uma faixa memorizada).

2. **Relação entre condição/medicamento e exames** (ex: *"o remédio pro Rex está funcionando?"*)
   - Leia `Familia/_index.yaml`, `Perfis/[Nome]/Ficha.md`, `Perfis/[Nome]/Medicamentos.md` e `Perfis/[Nome]/Exames.md` do membro.
   - Cruze a data de início/ajuste do medicamento com os valores de exame e sinais vitais antes e depois, de forma estritamente factual (sem diagnosticar causa e efeito).

3. **Padrões entre membros da família (GENÉTICA E FAMÍLIA)**
   - **REGRA DE OURO:** Todos os membros humanos da família **são considerados biológicos por padrão** (`vinculo: "biologico"`).
   - Antes de cruzar condições hereditárias entre membros, **verifique obrigatoriamente o campo `vinculo` de cada membro em `Familia/_index.yaml`** e a estrutura em `Familia/Arvore.md`.
   - **NÃO** cruze informações genéticas/hereditárias com membros cujo `vinculo` seja `adotivo` ou `enteado` (nem trate cônjuges sem consanguinidade como mesma linhagem genética, exceto para avaliar herança combinada nos filhos biológicos do casal).
   - Leia `Familia/Genetica_Familiar.md` e os arquivos `Perfis/[Nome]/Genetica.md` dos membros biológicos relevantes.
   - Se identificar uma condição hereditária presente em 2 ou mais membros biológicos que ainda não esteja em `Familia/Genetica_Familiar.md`, ofereça adicioná-la lá (mediante confirmação do usuário).

## 💾 Salvamento de análises (com carimbo e fontes) — versão enxuta

Após apresentar a análise no chat, **SEMPRE pergunte ao usuário**:

> *"Quer que eu salve esta análise no Salus para referência futura?"*

Se o usuário confirmar:
1. Identifique o perfil principal (`Perfis/[Nome]/Analises/`).
2. Gere o arquivo `AAAA-MM-DD_HHmm_[Descricao_Curta].md` com o seguinte formato — **guarde a tabela de dados e a conclusão enxuta, não a resposta inteira em prosa**:

```markdown
# [Título da Análise]

**Gerado em:** [AAAA-MM-DD] às [HH:mm] (horário local)
**Membro(s):** [Nome(s)]
**Tipo de análise:** Evolução de marcador / Relação com medicamento / Padrão familiar

## Fontes utilizadas
| Arquivo | Data do documento | Última modificação |
|---|---|---|
| `Perfis/[Nome]/Exames.md` | [Datas] | [Data mod] |
| `Perfis/[Nome]/Documentos/Exames/[Nome_Arquivo]` | [Data doc] | — |

## Dados comparados
| Data | Marcador | Valor | Unidade | Faixa de referência (do laudo) | Flag (do laudo) |
|---|---|---|---|---|---|
| | | | | | |

## Conclusão (2–4 linhas, factual — sem causa/efeito)
[Tendência observada e o que vale levar ao médico/veterinário]

---
*⚠️ Esta análise foi gerada por inteligência artificial com base nos documentos acima. Não substitui avaliação profissional.*
```

3. Registre no `Perfis/[Nome]/Historico.md`: `- **[AAAA-MM-DD]** Análise comparativa salva em Analises/[Nome_Arquivo].md`
4. Se o marcador comparado estiver em `marcadores_chave` no `Familia/_index.yaml` (e o índice estiver desatualizado em relação ao exame mais recente), atualize o valor mais recente lá também (`data`, `valor`, `unidade`, `flag`).

## Regras de apresentação

- Mostre os dados de forma factual: números, unidades, datas, tendência. Não conclua causa e efeito — isso é papel do profissional de saúde.
- Sempre siga o `Frameworks/PROTOCOLO_CLINICO.md`: sem alarme, sem diagnóstico, sempre sugerindo levar o achado ao médico/veterinário quando relevante.
- Se os dados forem insuficientes para comparar, diga isso claramente.

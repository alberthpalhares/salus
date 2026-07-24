---
name: cruzar
description: "Compara exames do mesmo marcador ao longo do tempo, relaciona condições/medicamentos com resultados, e identifica padrões entre membros da família. Acione com: 'cruza os exames de...', 'compara o [marcador] de...', 'evoluiu como...'."
---

# Skill: Cruzar

Esta e a skill que entrega o valor central do Salus: olhar o historico inteiro de um membro (ou de varios) e mostrar relacoes que nao sao obvias olhando um documento isolado.

## Antes de tudo: consulte o índice

Leia `Familia/_index.yaml` primeiro. Se o `marcadores_chave` do membro já cobre o que foi pedido (ex: "como está o colesterol?"), responda a partir dele. Só abra `Perfis/[Nome]/Exames.md` inteiro quando precisar do histórico completo do marcador (mais pontos do que o índice guarda) ou de um marcador que não está entre os marcadores-chave.

## Tipos de cruzamento

1. **Evolucao de um marcador ao longo do tempo** (ex: "como esta o colesterol do Alberth?")
   - Leia `Perfis/[Nome]/Exames.md`, encontre todas as entradas do marcador pedido, ordene por data.
   - Mostre a evolucao numerica, indicando se subiu, desceu ou ficou estavel, e a faixa de referencia de cada data (sempre a impressa no laudo, nunca uma faixa memorizada).

2. **Relacao entre condicao/medicamento e exames** (ex: "o remedio pro Rex esta funcionando?")
   - Leia `Perfis/[Nome]/Ficha.md`, `Perfis/[Nome]/Medicamentos.md` e `Exames.md` do membro.
   - Cruze a data de inicio do medicamento com os valores de exame antes e depois.

3. **Padroes entre membros da familia (GENETICA E FAMILIA)**
   - **REGRA DE OURO:** Todos os membros humanos da família **são considerados biológicos por padrão**.
   - Antes de cruzar condicoes hereditarias entre membros, **verifique o campo `vinculo` de cada membro em `Familia/_index.yaml`**.
   - NÃO cruze informações genéticas/hereditárias com membros cujo `vinculo` seja `adotivo` ou `enteado`.
   - Leia `Familia/Genetica_Familiar.md` e os arquivos `Genetica.md` dos membros biológicos relevantes.

## 💾 Salvamento de analises (com carimbo e fontes) — versão enxuta

Apos apresentar a analise no chat, **SEMPRE pergunte ao usuario**:

> *"Quer que eu salve esta analise no Salus para referencia futura?"*

Se o usuario confirmar:
1. Identifique o perfil principal (`Perfis/[Nome]/Analises/`).
2. Gere o arquivo `AAAA-MM-DD_HHmm_[Descricao_Curta].md` com o seguinte formato — **guarde a conclusão e os dados, não a resposta inteira em prosa** (os números permitem regerar a narrativa quando precisar, e o arquivo fica mais leve de reler no futuro):

```markdown
# [Titulo da Analise]

**Gerado em:** [AAAA-MM-DD] as [HH:mm] (horario local)
**Membro:** [Nome]
**Tipo de analise:** Evolucao de marcador / Comparativo / Padrao familiar

## Fontes utilizadas
| Arquivo | Data do documento | Ultima modificacao |
|---|---|---|
| `Perfis/[Nome]/Exames.md` | [Datas] | [Data mod] |
| `Perfis/[Nome]/Documentos/Exames/[Nome_Arquivo]` | [Data doc] | — |

## Dados comparados
| Data | Marcador | Valor | Unidade | Flag (do laudo) |
|---|---|---|---|---|
| | | | | |

## Conclusão (2-4 linhas, factual — sem causa/efeito)
[Tendência observada e o que vale levar ao profissional]

---
*⚠️ Esta analise foi gerada por inteligencia artificial com base nos documentos acima. Nao substitui avaliacao profissional.*
```

3. Registre no `Historico.md`: `- **[AAAA-MM-DD]** Analise comparativa salva em Analises/[Nome_Arquivo].md`
4. Se o marcador comparado estiver em `marcadores_chave` no `_index.yaml`, atualize o valor mais recente lá também (data, valor, unidade, flag).

## Regras de apresentacao

- Mostre os dados de forma factual: numeros, datas, tendencia. Nao conclua causa e efeito — isso e papel do profissional de saude.
- Sempre siga o `Frameworks/PROTOCOLO_CLINICO.md`: sem alarme, sem diagnostico, sempre sugerindo levar o achado ao medico/veterinario quando relevante.
- Se os dados forem insuficientes para comparar, diga isso claramente.

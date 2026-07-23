---
name: cruzar
description: "Compara exames do mesmo marcador ao longo do tempo, relaciona condições/medicamentos com resultados, e identifica padrões entre membros da família. Acione com: 'cruza os exames de...', 'compara o [marcador] de...', 'evoluiu como...'."
---

# Skill: Cruzar

Esta é a skill que entrega o valor central do Salus: olhar o histórico inteiro de um membro (ou de vários) e mostrar relações que não são óbvias olhando um documento isolado.

## Tipos de cruzamento

1. **Evolução de um marcador ao longo do tempo** (ex: "como está o colesterol do Alberth?")
   - Leia `Perfis/[Nome]/Exames.md`, encontre todas as entradas do marcador pedido, ordene por data.
   - Mostre a evolução numérica, indicando se subiu, desceu ou ficou estável, e a faixa de referência de cada data (elas podem variar entre laudos).

2. **Relação entre condição/medicamento e exames** (ex: "o remédio pro Rex está funcionando?")
   - Leia a `Ficha.md` (condições e medicamentos) e o `Exames.md` do membro.
   - Cruze a data de início do medicamento com os valores de exame antes e depois, se existirem.

3. **Padrões entre membros da família** (ex: "alguém mais na família tem colesterol alto?")
   - Leia `Familia/Genetica_Familiar.md` e as Fichas de todos os membros humanos (ou todos os pets, conforme o pedido).
   - Aponte condições que se repetem.

## Regras de apresentação

- Mostre os dados de forma factual: números, datas, tendência. Não conclua causa e efeito — isso é papel do profissional de saúde.
- Sempre siga o `Frameworks/PROTOCOLO_CLINICO.md`: sem alarme, sem diagnóstico, sempre sugerindo levar o achado ao médico/veterinário quando relevante.
- Se os dados forem insuficientes para comparar (só um exame no histórico, por exemplo), diga isso claramente em vez de forçar uma conclusão.
- Caminhos sempre relativos à raiz do workspace.

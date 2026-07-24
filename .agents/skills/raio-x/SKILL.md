---
name: raio-x
description: "Levanta um panorama rápido de saúde de toda a família: condições ativas, medicamentos em uso, e vacinas/exames/check-ups vencendo. Use quando o usuário pedir o status geral. Acione com: 'raio-x', 'como estamos?', 'status da família', 'panorama de saúde'."
---

# Skill: Raio-X

Da ao usuario uma visao instantanea (10-15 linhas) da situacao de saude da familia — pessoas e pets.

## Passo a Passo (índice primeiro — não abra os perfis inteiros)

1. **Leia apenas** `Familia/_index.yaml`. Ele já contém, por membro: vínculo, condições ativas, medicamentos em uso/prescritos com datas de renovação, vacinas com próxima data, e marcadores-chave. Isso basta para montar o relatório inteiro.
2. **Calcule os alertas você mesmo**, comparando cada data (`renova_em`, `proxima_em` de vacinas, `data` de `proximos_checkups`) com a data atual do sistema:
   - Vencido: data já passou.
   - Vencendo: data nos próximos 30 dias.
3. **Só abra um arquivo de perfil completo** (`Ficha.md`, `Medicamentos.md`, `Exames.md`) se o índice estiver incompleto para o que foi pedido, ou se o usuário pedir detalhe de um membro específico depois do panorama.
4. Gere o relatorio neste formato:

```
🩺 **RAIO-X — Familia [Nome] — [Data de hoje]**

🔴 **VENCIDO OU VENCENDO:**
   • [Nome] — [vacina/check-up/receita a renovar] — vence/venceu em [data]

💊 **MEDICAMENTOS EM USO (ATIVOS):**
   • [Nome] — [medicamento] — [dose] (desde [data])

📋 **CONDIÇÕES ATIVAS:**
   • [Nome] — [condicao]

💡 Quer que eu detalhe algum desses pontos ou prepare o resumo para uma consulta?
```

5. **Atualize `Familia/Agenda.md`** com os itens calculados no passo 2, agrupados por Vencido / 30 dias / 31–90 dias / sem data — assim ele fica pronto para o usuário reabrir depois sem precisar te perguntar de novo. Isso não precisa de confirmação do usuário (é uma view derivada, não um dado clínico novo).

## Regras
- Se nao houver nada vencido ou vencendo nos proximos 30 dias, escreva "Nada vencendo nos proximos 30 dias. ✅".
- So inclua em "Medicamentos em uso" os que estão em `medicamentos_em_uso` no índice. Os de `medicamentos_prescritos` podem ser listados como "Receita pendente de inicio".
- Seja conciso — nao repita o conteudo inteiro da Ficha, so o essencial.
- Siga o `Frameworks/PROTOCOLO_CLINICO.md` ao mencionar qualquer condicao ou exame.
- Se `Familia/_index.yaml` não existir ou estiver vazio (família recém-montada ou desatualizado), avise o usuário e ofereça rodar `salus-revisao` ou reler os perfis para reconstruí-lo — não trave a resposta.

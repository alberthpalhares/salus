---
name: raio-x
description: "Levanta um panorama rápido de saúde de toda a família: condições ativas, medicamentos em uso, e vacinas/antiparasitários/exames/check-ups/receitas vencendo ou ciclos de tratamento encerrados. Use quando o usuário pedir o status geral. Acione com: 'raio-x', 'como estamos?', 'status da família', 'panorama de saúde'."
---

# Skill: Raio-X

Dá ao usuário uma visão instantânea (10–20 linhas) da situação de saúde da família — pessoas e pets.

## Passo a Passo (índice primeiro — não abra os perfis inteiros)

1. **Leia apenas `Familia/_index.yaml`**. Ele já contém, por membro: vínculo, alergias, condições ativas, medicamentos em uso/prescritos (com `renova_em` ou `termino_em`), vacinas (`proxima_em`), antiparasitários (`proximo_em` para pets), check-ups (`data` de `proximos_checkups`) e marcadores-chave. Isso basta para montar o relatório inteiro.
2. **Calcule os alertas você mesmo**, comparando cada data com a data atual do sistema:
   - **Vencido / Ciclo encerrado**: data já passou.
     - *Atenção à diferença:* se for `termino_em` de um medicamento de ciclo fechado (ex: tratamento por 5 dias já concluído), sinalize como **"Tratamento encerrado em [data] (confirmar conclusão para mover ao histórico)"**, e NÃO como "receita vencida para renovar".
   - **Vencendo em breve**: data nos próximos 30 dias (`renova_em`, `proxima_em` de vacina, `proximo_em` de antiparasitário, `data` de check-up, ou `termino_em` de medicamento).
3. **Só abra um arquivo de perfil completo** (`Ficha.md`, `Medicamentos.md`, `Exames.md`) se o índice estiver incompleto para o que foi pedido, ou se o usuário pedir detalhe de um membro específico depois do panorama.
4. Gere o relatório neste formato:

```text
🩺 **RAIO-X — Família [Nome] — [Data de hoje]**

🔴 **VENCIDO, VENCENDO (30 DIAS) OU CICLO ENCERRADO:**
   • [Nome] — [vacina / antiparasitário / check-up / receita a renovar / tratamento concluído] — [data]

💊 **MEDICAMENTOS EM USO (ATIVOS):**
   • [Nome] — [medicamento] — [dose] (desde [data] · [contínuo / término em data])

📋 **CONDIÇÕES ATIVAS & ALERGIAS:**
   • [Nome] — Condições: [condições] | Alergias: [alergias]

💡 Quer que eu detalhe algum desses pontos, encerre algum tratamento já concluído ou prepare o resumo para uma consulta?
```

5. **Atualize `Familia/Agenda.md`** com os itens calculados no passo 2, agrupados por:
   - `🔴 Vencido ou ciclo encerrado (confirmar)`
   - `🟡 Vencendo nos próximos 30 dias`
   - `🟢 Vencendo em 31–90 dias`
   - `📌 Sem data definida (acompanhar / receitas prescritas aguardando início)`
   Isso não precisa de confirmação do usuário (é uma view derivada, não um dado clínico novo).

## Regras
- Se não houver nada vencido ou vencendo nos próximos 30 dias, escreva `"Nada vencido ou vencendo nos próximos 30 dias. ✅"`.
- Só inclua em "Medicamentos em uso" os que estão em `medicamentos_em_uso` no índice. Os de `medicamentos_prescritos` devem ser lembrados em "Sem data definida / Receita pendente de início".
- Seja conciso — não repita o conteúdo inteiro da Ficha, só o essencial.
- Siga o `Frameworks/PROTOCOLO_CLINICO.md` ao mencionar qualquer condição ou exame.
- Se `Familia/_index.yaml` não existir ou estiver vazio (família recém-montada ou desatualizado), avise o usuário e ofereça rodar `salus-revisao` ou reler os perfis para reconstruí-lo — não trave a resposta.

---
name: raio-x
description: "Levanta um panorama rápido de saúde de toda a família: condições ativas, medicamentos em uso, e vacinas/exames/check-ups vencendo. Use quando o usuário pedir o status geral. Acione com: 'raio-x', 'como estamos?', 'status da família', 'panorama de saúde'."
---

# Skill: Raio-X

Da ao usuario uma visao instantanea (10-15 linhas) da situacao de saude da familia — pessoas e pets.

## Passo a Passo

1. **Leia silenciosamente** `Familia/META.md` para saber quem sao os membros e seus vinculos.
2. **Leia silenciosamente** a `Ficha.md` e `Medicamentos.md` de cada membro.
3. **Leia silenciosamente** `Familia/Medicamentos_Ativos.md`.
4. Compare datas de vacinas, reforcos e datas de **proxima renovacao de receita** mencionadas em `Medicamentos.md` com a data atual do sistema.
5. Gere o relatorio neste formato:

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

## Regras
- Se nao houver nada vencido ou vencendo nos proximos 30 dias, escreva "Nada vencendo nos proximos 30 dias. ✅".
- So inclua em "Medicamentos em uso" aqueles com status `Em uso` confirmado. Medicamentos com status `Prescrito` podem ser listados como "Receita pendente de inicio".
- Seja conciso — nao repita o conteudo inteiro da Ficha, so o essencial.
- Siga o `Frameworks/PROTOCOLO_CLINICO.md` ao mencionar qualquer condicao ou exame.

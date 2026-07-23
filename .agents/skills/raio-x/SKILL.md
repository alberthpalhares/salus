---
name: raio-x
description: "Levanta um panorama rápido de saúde de toda a família: condições ativas, medicamentos em uso, e vacinas/exames/check-ups vencendo. Use quando o usuário pedir o status geral. Acione com: 'raio-x', 'como estamos?', 'status da família', 'panorama de saúde'."
---

# Skill: Raio-X

Dá ao usuário uma visão instantânea (10-15 linhas) da situação de saúde da família — pessoas e pets.

## Passo a Passo

1. **Leia silenciosamente** `Familia/META.md` para saber quem são os membros.
2. **Leia silenciosamente** a `Ficha.md` de cada membro (seções de condições, medicamentos e vacinas).
3. **Leia silenciosamente** `Familia/Medicamentos_Ativos.md`.
4. Compare datas de vacinas e reforços mencionados nas Fichas com a data atual do sistema.
5. Gere o relatório neste formato:

```
🩺 **RAIO-X — Família [Nome] — [Data de hoje]**

🔴 **VENCIDO OU VENCENDO:**
   • [Nome] — [vacina/check-up/receita] — vence/venceu em [data]

💊 **MEDICAMENTOS EM USO:**
   • [Nome] — [medicamento] — [dose]

📋 **CONDIÇÕES ATIVAS:**
   • [Nome] — [condição]

💡 Quer que eu detalhe algum desses pontos?
```

## Regras
- Se não houver nada vencido, escreva "Nada vencendo nos próximos 30 dias. ✅".
- Seja conciso — não repita o conteúdo inteiro da Ficha, só o essencial.
- Caminhos sempre relativos à raiz do workspace.
- Siga o `Frameworks/PROTOCOLO_CLINICO.md` ao mencionar qualquer condição ou exame.

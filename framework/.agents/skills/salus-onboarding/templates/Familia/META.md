# META — Índice do Salus

<!-- Este arquivo é a versão legível-por-humano do índice. A fonte estruturada que a
IA usa para cálculos (vínculo, alergias, medicamentos, vacinas, antiparasitários, exames pendentes)
é `Familia/_index.yaml`. PRECEDÊNCIA: o `_index.yaml` manda em datas, status e campos estruturados;
os arquivos de perfil mandam na narrativa e no detalhe. Divergência = falha de sincronia a corrigir
(com confirmação). As datas de onboarding/revisão abaixo são a referência oficial — o `AGENTS.md`
não as repete. -->

**Família:** [Sobrenome/identificação]
**Onboarding realizado em:** [AAAA-MM-DD]
**Última revisão:** [AAAA-MM-DD]
**Próxima revisão sugerida:** [data + 6 meses no formato AAAA-MM-DD]

## Membros da Família

| Nome | Tipo | Papel na família | Perfil |
|---|---|---|---|
| [Nome] | Humano | [ex: Pai, Mãe, Filho(a)] | `Perfis/[Nome]/` |
| [Nome do pet] | Cão | [ex: Pet de X] | `Perfis/[Nome do pet]/` |
| [Nome do pet] | Gato | [ex: Pet de X] | `Perfis/[Nome do pet]/` |

## Mapa de Arquivos

| Tópico | Arquivo |
|--------|---------|
| Índice estruturado (fonte de verdade para IA) | `Familia/_index.yaml` |
| O que vem pela frente (vacinas, antiparasitários, receitas, check-ups) | `Familia/Agenda.md` |
| Árvore da família | `Familia/Arvore.md` |
| Linha do tempo de toda a família | `Familia/Linha_do_Tempo_Geral.md` |
| Medicamentos em uso por todos (visão consolidada) | `Familia/Medicamentos_Ativos.md` |
| Condições hereditárias cruzadas (2+ membros biológicos) | `Familia/Genetica_Familiar.md` |
| Resumo de saúde de cada membro (1 página / emergência) | `Perfis/[Nome]/Ficha.md` |
| Medicamentos de cada membro | `Perfis/[Nome]/Medicamentos.md` |
| Histórico genético e predisposições de cada membro | `Perfis/[Nome]/Genetica.md` |
| Linha do tempo individual de cada membro | `Perfis/[Nome]/Historico.md` |
| Exames e sinais vitais de cada membro | `Perfis/[Nome]/Exames.md` |
| Análises e preparos de consulta salvos por perfil | `Perfis/[Nome]/Analises/` |
| Documentos originais (exames, laudos, receitas, vacinas, áudios) | `Perfis/[Nome]/Documentos/` |
| Regras de segurança clínica e glossário | `Frameworks/PROTOCOLO_CLINICO.md` |

<!-- O vínculo (biologico/adotivo/enteado) de cada membro fica exclusivamente no campo `vinculo`
de `Familia/_index.yaml` — não é mantido aqui por privacidade. -->

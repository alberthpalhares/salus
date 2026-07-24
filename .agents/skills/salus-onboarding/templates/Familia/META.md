# META — Indice do Salus

<!-- Este arquivo e a versao legivel-por-humano do indice. A fonte de verdade que a
IA usa para calculos (vinculo, medicamentos, vacinas, alertas) e `Familia/_index.yaml`.
Mantenha os dois em sincronia, mas em caso de duvida o `_index.yaml` manda. -->

**Familia:** [Sobrenome/identificacao]
**Onboarding realizado em:** [AAAA-MM-DD]
**Proxima revisao sugerida:** [data + 6 meses no formato AAAA-MM-DD]

## Membros da Familia

| Nome | Tipo | Papel na família | Perfil |
|---|---|---|---|
| [Nome] | Humano | [ex: Pai, Mae, Filho] | `Perfis/[Nome]/` |
| [Nome do pet] | Cao | [ex: Pet de X] | `Perfis/[Nome do pet]/` |
| [Nome do pet] | Gato | [ex: Pet de X] | `Perfis/[Nome do pet]/` |

## Mapa de Arquivos

| Topico | Arquivo |
|--------|---------|
| Resumo de saude de cada membro | `Perfis/[Nome]/Ficha.md` |
| Árvore da família | `Familia/Arvore.md` |
| Medicamentos de cada membro | `Perfis/[Nome]/Medicamentos.md` |
| Linha do tempo de cada membro | `Perfis/[Nome]/Historico.md` |
| Exames de cada membro | `Perfis/[Nome]/Exames.md` |
| Analises salvas por perfil | `Perfis/[Nome]/Analises/` |
| Linha do tempo de toda a familia | `Familia/Linha_do_Tempo_Geral.md` |
| Medicamentos em uso por todos (visao consolidada) | `Familia/Medicamentos_Ativos.md` |
| Condicoes hereditarias cruzadas | `Familia/Genetica_Familiar.md` |
| Regras de seguranca e glossario | `Frameworks/PROTOCOLO_CLINICO.md` |
| Indice estruturado (fonte de verdade para IA) | `Familia/_index.yaml` |
| O que vem pela frente (vacinas, receitas, check-ups) | `Familia/Agenda.md` |

<!-- O vinculo (Biologico/Adotivo/Enteado) de cada membro fica no campo `vinculo`
de `Familia/_index.yaml` — nao e mais mantido aqui como comentario oculto. -->

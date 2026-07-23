# Plano — Salus (Central de Inteligência de Saúde da Família)

> Documento de planejamento aprovado. Se a construção for interrompida, cole este arquivo em qualquer IA (Claude, Gemini, ChatGPT, Cursor...) junto com a instrução: **"Construa o Salus seguindo exatamente este plano, dentro desta pasta."**

## 1. O que é

O Salus é para saúde o que o [Córtex](https://github.com/alberthpalhares/cortex) é para negócios: um repositório local de arquivos `.md` + documentos brutos (exames, laudos, receitas, áudios) que qualquer IA com acesso a arquivos locais lê para dar ao usuário um histórico de saúde vivo — de pessoas e animais da família — cruzando exames de épocas diferentes, relacionando condições, medicamentos e sintomas, e dando uma visão ampla do quadro de saúde.

Mesma mecânica do Córtex: repositório com arquivos de inicialização que apontam para uma *skill de onboarding* → entrevista curta guiada pelos próprios documentos → geração automática da estrutura → operação por linguagem natural (não precisa decorar comandos) → skills de apoio para o dia a dia → ciclo de revisão periódica.

## 2. Princípio orientador

**Simplicidade para um usuário comum.** Este não é um projeto de TI. Toda decisão de design abaixo prioriza: zero instalação, poucos arquivos por pessoa, linguagem natural em vez de comandos decorados, e um entregável concreto (a Ficha) que qualquer pessoa entende sem explicação.

## 3. Decisões tomadas (com o porquê)

| Decisão | Escolha | Por quê |
|---|---|---|
| Ingestão de exames/PDFs/fotos/áudios | **Leitura nativa da IA**, sem scripts Python/OCR | Claude e Gemini já leem PDF, foto e áudio nativamente — inclusive receita manuscrita e foto torta, onde OCR tradicional falha. Zero instalação. |
| Arquivos por perfil (pessoa/animal) | **3 arquivos consolidados**: `Ficha.md`, `Historico.md`, `Exames.md` | Evita pasta assustadora com 9-10 arquivos por pessoa. Condições, alergias, medicamentos e vacinas viram *seções* dentro da Ficha. |
| Entrada de documentos | **Pasta única `_Caixa de Entrada/`** | O atrito real do usuário é "como coloco meus arquivos aí". Joga tudo numa pasta só, a IA classifica, renomeia e arquiva no perfil certo. |
| Entregável principal | **`Ficha.md` de uma página por perfil** | O que salva na hora do aperto (PS, consulta) é uma folha-resumo: tipo sanguíneo, alergias, remédios em uso, condições, contatos. Exportável para PDF/impressão. Para o pet, é a carteirinha. |
| Faixas de referência de exames | **Não fixar no sistema.** Sempre usar a faixa impressa no próprio laudo | Faixas variam por laboratório, idade, método, e por espécie (humano/canino/felino). Fixar cria falsa autoridade e envelhece mal. Mantém-se apenas um glossário educativo (o que cada exame *significa*, não valores "normais"). |
| Apps de IA suportados | **Todos** (Claude, Gemini, Codex, Agents genéricos, Cursor/Windsurf) | Gera os 5 arquivos de inicialização, como o Córtex, para compatibilidade total. |
| Onboarding | **Curto, guiado pelos documentos** | Quase toda info de saúde já está nos documentos existentes. A IA lê o que o usuário indicar e só pergunta o que falta (tipo sanguíneo, alergias, contatos de emergência). |
| Saúde animal | **Cão e gato como perfis de primeira classe**, com trilha própria na entrevista | Calendário de vacinas por espécie (V8/V10+antirrábica para cão; V4/V5+FeLV+antirrábica para gato), antiparasitário calculado por peso, predisposições raciais, castração/microchip. |
| Comandos | **Linguagem natural funciona sempre.** Palavras-gatilho são atalho, não obrigação | Perguntar "como está a saúde do Rex?" tem que funcionar sem o usuário saber que existe uma skill "raio-x". |
| Segurança clínica | **Organiza e cruza, nunca diagnostica ou prescreve.** Alerta calmo quando o laudo já sinaliza algo alterado | Sempre remete a médico/veterinário. Nunca interpreta um valor como o sistema "decidindo" que algo é grave. |

## 4. Estrutura de pastas final

```
Salus/
├── CLAUDE.md · GEMINI.md · CODEX.md · AGENTS.md · .cursorrules   ← arquivos de inicialização
│                                                                     (apontam para a skill de onboarding;
│                                                                      depois do onboarding, viram o "cérebro" operacional)
├── COMECE_AQUI.md            ← guia de uso em 1 página, linguagem simples, sem jargão
├── _Caixa de Entrada/        ← usuário joga qualquer arquivo aqui (PDF, foto, áudio)
├── .agents/skills/
│   ├── salus-onboarding/     ← entrevista inicial (cria os perfis)
│   │   ├── SKILL.md
│   │   ├── templates/
│   │   │   ├── Perfil_Humano/ (Ficha.md, Historico.md, Exames.md)
│   │   │   ├── Perfil_Cao/    (Ficha.md, Historico.md, Exames.md)
│   │   │   ├── Perfil_Gato/   (Ficha.md, Historico.md, Exames.md)
│   │   │   └── Familia/       (META.md, Linha_do_Tempo_Geral.md, Medicamentos_Ativos.md, Genetica_Familiar.md)
│   │   │   └── Frameworks/PROTOCOLO_CLINICO.md
│   │   └── resources/SALUS_TEMPLATE.md   ← template do system prompt final
│   ├── raio-x/                ← panorama rápido de saúde da família (condições ativas,
│   │                              remédios em uso, vacinas/exames vencidos)
│   ├── registrar/              ← grava consulta/sintoma/remédio/vacina rapidamente, sem burocracia
│   ├── salus-organiza/         ← lê a Caixa de Entrada, classifica e arquiva nos perfis certos
│   ├── cruzar/                 ← compara marcadores ao longo do tempo, relaciona condições/remédios
│   └── salus-revisao/          ← revisão periódica (check-ups, calendário de vacinas, receitas a renovar)
├── Perfis/
│   ├── [Nome da Pessoa]/
│   │   ├── Ficha.md            ← ⭐ resumo de 1 página (tipo sanguíneo, alergias, medicamentos,
│   │   │                            condições, vacinas, contatos de emergência)
│   │   ├── Historico.md        ← linha do tempo de eventos de saúde
│   │   ├── Exames.md           ← tabela de marcadores/valores ao longo do tempo
│   │   └── Documentos/         ← arquivos brutos organizados (Exames/ Laudos/ Receitas/ Requisicoes/ Audios/)
│   └── [Nome do Animal]/       ← mesma estrutura, com Ficha adaptada (espécie, raça, peso,
│                                    vacinas por espécie, antiparasitário por peso, castração, microchip)
├── Familia/
│   ├── META.md                 ← índice geral (quem é quem, humano ou animal) — a IA lê PRIMEIRO
│   ├── Linha_do_Tempo_Geral.md ← todos os eventos, todos os membros
│   ├── Medicamentos_Ativos.md  ← visão consolidada da família
│   └── Genetica_Familiar.md    ← condições hereditárias cruzadas entre membros
└── Frameworks/
    └── PROTOCOLO_CLINICO.md    ← regras de segurança + glossário educativo de exames
```

## 5. Fluxo de uso no dia a dia

1. **Onboarding** (uma vez): usuário diz "montar meu Salus". A IA pergunta quem são os membros da família (humanos e animais) e se há documentos existentes para ler. Gera os perfis.
2. **Uso contínuo**: usuário joga qualquer arquivo (PDF, foto, áudio) na `_Caixa de Entrada/` e diz algo como "organiza isso" ou "chegou um exame novo do Rex". A IA lê nativamente, classifica, renomeia (`AAAA-MM-DD_Tipo_Descrição.ext`) e arquiva no perfil certo, atualizando Ficha/Histórico/Exames.
3. **Perguntas livres**: "como está a saúde do Rex?", "o colesterol do Alberth melhorou desde o ano passado?", "que vacina está vencendo?" — tudo funciona em linguagem natural, sem precisar saber comandos.
4. **Revisão periódica**: a IA sugere proativamente quando check-ups, vacinas ou receitas estão perto do vencimento.

## 6. Fases de construção

1. Esqueleto do repositório (pastas, arquivos de inicialização, `COMECE_AQUI.md`).
2. As 6 skills em `.agents/skills/`.
3. Templates de perfil (Humano, Cão, Gato) + templates de Família.
4. `PROTOCOLO_CLINICO.md` (regras de segurança + glossário educativo, sem faixas fixas de valores).
5. `SALUS_TEMPLATE.md` (o system prompt gerado ao final do onboarding — equivalente ao "cérebro" do Córtex).
6. Verificação: conferir árvore de arquivos e consistência entre skills/templates.

## 7. Fora de escopo (por design)

- Scripts de OCR/transcrição em Python — leitura nativa da IA substitui.
- Faixas de referência fixas de exames — sempre usa a do próprio laudo.
- Diagnóstico ou prescrição — o sistema organiza e cruza informação; decisões clínicas são sempre do profissional de saúde/veterinário.
- Arquivo por tema (um `.md` para cada condição, alergia, vacina etc.) — consolidado em `Ficha.md` por seções.

---
name: registrar
description: "Registra rapidamente uma consulta, sintoma, medicamento novo (ou fim de uso), vacina, antiparasitário, alergia ou evento de saúde direto no perfil certo. Acione com frases como: 'registra que...', 'anota que...', 'o [nome] tomou...', 'a [nome] teve...', 'terminei o remédio...'."
---

# Skill: Registrar

Agiliza a entrada de informações de saúde no dia a dia. Quando o usuário disser algo como *"registra que o Rex tomou a vacina antirrábica hoje"*, *"o Mao tomou Simparic hoje"*, *"anota que tive dor de cabeça essa semana"* ou *"terminei de tomar o antibiótico"*, processe a informação e peça confirmação antes de gravar.

## 🔒 PREMISSA BÁSICA: CONFIRMAÇÃO OBRIGATÓRIA

> **O Salus NUNCA grava informações nos arquivos sem perguntar antes.**
> Sempre mostre ao usuário O QUE será gravado e ONDE (incluindo `Familia/_index.yaml` e views derivadas), e aguarde um "sim", "pode salvar", "manda" ou equivalente antes de escrever nos arquivos.

## 1. Identificar o membro e o tipo de registro

Leia primeiro `Familia/_index.yaml` para localizar rapidamente o membro (`id`, `tipo`, `alergias`, `medicamentos_em_uso`). Classifique o tipo de informação:

- **Evento pontual (consulta, sintoma, cirurgia, intercorrência)**
  - Adicionar em `Perfis/[Nome]/Historico.md` e em `Familia/Linha_do_Tempo_Geral.md`.
  - Se houver retorno ou check-up futuro agendado, adicionar em `proximos_checkups` no `Familia/_index.yaml` e atualizar `Familia/Agenda.md`.

- **Medicamento novo ou alteração de dose**
  - Cheque primeiro `alergias` e `medicamentos_em_uso` do membro no `Familia/_index.yaml` (siga o `Frameworks/PROTOCOLO_CLINICO.md` caso haja alerta calmo de alergia ou interação).
  - Pergunte ao usuário: *"Você já comprou / está tomando este medicamento, ou é apenas a prescrição por enquanto?"*
  - **Se já está tomando (`Em uso`):**
    - Identifique se é de **uso contínuo** (`renova_em`) ou **tratamento com fim programado** (`termino_em`, ex: por 5 ou 7 dias).
    - Registra em `Perfis/[Nome]/Medicamentos.md` (seção `Em uso`), atualiza `Perfis/[Nome]/Ficha.md`, adiciona em `medicamentos_em_uso` de `Familia/_index.yaml`, e sincroniza `Familia/Medicamentos_Ativos.md` e `Familia/Agenda.md`.
  - **Se é apenas prescrição (`Prescrito`):**
    - Registra em `Perfis/[Nome]/Medicamentos.md` (seção `Prescritos`), em `medicamentos_prescritos` de `Familia/_index.yaml` e na seção de acompanhamento da `Familia/Agenda.md`.

- **Encerramento / Descontinuação de medicamento** (ex: *"terminei o antibiótico"*, *"o médico suspendeu o remédio X"*)
  - Move o medicamento da seção `Em uso` para `Descontinuados / Histórico` em `Perfis/[Nome]/Medicamentos.md` (registrando período e motivo).
  - Remove de `Perfis/[Nome]/Ficha.md`, de `medicamentos_em_uso` em `Familia/_index.yaml`, de `Familia/Medicamentos_Ativos.md` e de `Familia/Agenda.md`.
  - Registra o evento em `Perfis/[Nome]/Historico.md` e `Familia/Linha_do_Tempo_Geral.md`.

- **Vacina aplicada**
  - Atualiza a seção "Vacinas" de `Perfis/[Nome]/Ficha.md`, a lista `vacinas` (com `aplicada_em` e `proxima_em`) do membro em `Familia/_index.yaml`, o `Historico.md`, a `Linha_do_Tempo_Geral.md` e a `Familia/Agenda.md`.

- **Antiparasitário aplicado (cão / gato — vermífugo, antipulgas/carrapatos)**
  - Atualiza a seção "Antiparasitários" de `Perfis/[Nome]/Ficha.md`, a lista `antiparasitarios` (com `aplicado_em` e `proximo_em`) do pet em `Familia/_index.yaml`, o `Historico.md`, a `Linha_do_Tempo_Geral.md` e a `Familia/Agenda.md`.

- **Alergia ou condição nova**
  - Atualiza `Perfis/[Nome]/Ficha.md`, os campos `alergias` ou `condicoes_ativas` em `Familia/_index.yaml`, `Perfis/[Nome]/Historico.md` e `Familia/Linha_do_Tempo_Geral.md`.

- **Novo valor de exame ou sinal vital (peso, pressão, glicemia) mencionado em texto**
  - Adiciona em `Perfis/[Nome]/Exames.md` (perguntando faixa/flag do laudo se for exame laboratorial e não tiver sido informada).
  - Se for peso de pet ou marcador acompanhado em `marcadores_chave` no `Familia/_index.yaml`, atualiza lá também (e `Peso atual` na `Ficha.md` se for peso).

## 2. Formato de escrita

- **Histórico individual:** `- **[AAAA-MM-DD]** [Descrição clara e objetiva]`
- **Linha do Tempo Geral:** `- **[AAAA-MM-DD]** **[Nome]** — [Descrição]`
- **Medicamentos:** linha na tabela com `Medicamento | Dose | Frequência | Desde | Prescrito por | Renovação / Término | Status`

## 3. Fluxo de ação

1. Leia `Familia/_index.yaml` e o(s) arquivo(s) de destino do perfil.
2. Monte a alteração exata que será feita (perfil + `Familia/_index.yaml` + views derivadas).
3. Mostre ao usuário:
   ```text
   📝 Posso registrar as seguintes informações?
   • Perfil: Perfis/[Nome]/[Arquivo].md → [Resumo do conteúdo]
   • Índice: Familia/_index.yaml → [Campo atualizado]
   • Views da Família: [Linha_do_Tempo_Geral.md / Agenda.md / Medicamentos_Ativos.md]

   Quer que eu salve isso?
   ```
4. **Só grave após confirmação explícita.**
5. Após gravar todos os arquivos em sincronia, confirme com um ✅.

# ADR-0005: Consentimento em duas etapas

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D1 e D12 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): o consentimento (regra 4 do núcleo inviolável) existe só como texto de prompt, que ninguém consegue verificar, e a IA edita arquivos na mão guiada por cinco arquivos de instrução. CLI, MCP e tela precisam do mesmo motor, e dois escritores é o caso normal (ADR-0006).

## Decisão

Nenhum comando grava diretamente: `propose` devolve um ChangeSet (comando + hashes-base + diff derivado) e `commit(id)` grava; hash divergente re-executa o comando e devolve 409 com nova proposta; TTL 15 min; tudo vai para `audit.jsonl` em app-data.

## Consequências

- Positivo: nenhuma porta grava sem passar pela proposta, e o consentimento deixa de depender só do prompt.
- Positivo: hash divergente nunca sobrescreve em silêncio; vira 409 com proposta nova.
- Custo: toda escrita tem duas etapas (a tela faz propose e commit num só request, e só ações destrutivas têm tela "Revisar"), e o risco residual (uma IA chamar `propose` e `commit` em sequência) depende do cliente: elicitation, permissão por tool e a flag de auditoria "confirmação < 2 s" o mitigam (desenho, seção 3.4).
- Custo: ChangeSets pendentes e `audit.jsonl` ficam em app-data, por máquina, e a proposta expira em 15 min.

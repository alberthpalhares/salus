# ADR-0003: Splice, não reserializa

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D6 e D8 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): os formatos de hoje são hostis à máquina e nada garante que uma gravação preserve o que a pessoa escreveu, com risco real de perda de dados de saúde. O cofre também é editado por Obsidian, VS Code e agentes sem MCP, então o Salus não pode reformatar o que não é dele.

## Decisão

O núcleo grava por splice das regiões gerenciadas (heading canônico + primeira tabela/lista) e copia o resto do arquivo byte a byte; linhas não reconhecidas dentro de uma região são preservadas como opacas. `remark` só localiza offsets; nunca se re-serializa o documento.

## Consequências

- Positivo: gravar sem mudar nada deixa o arquivo byte-idêntico (teste de ouro) e nenhuma linha some (invariante).
- Positivo: o texto livre e o EOL dominante do usuário sobrevivem a qualquer gravação.
- Custo: parser de linhas de tabela/lista e emissor próprios, em vez de um serializador pronto como o `remark-stringify`.
- Custo: linhas opacas ficam fora das views e do estado; só o `doctor` as lista.

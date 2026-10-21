# ADR-0007: Histórico são eventos, tabelas são estado

- **Data:** 2026-10-21
- **Status:** aceita

## Contexto

Diagnóstico D2 e D6 do [desenho do v2](../superpowers/specs/2026-10-21-salus-v2-design.md): o estado de um medicamento ou de uma vacina hoje se espalha por arquivos e por texto livre (checkboxes de vacina, dose misturada com frequência), o que impede derivá-lo com segurança. Separar o que aconteceu (evento) do que vale agora (estado) evita que uma view dependa de interpretar prosa.

## Decisão

`Historico.md` é um log de eventos imutáveis; as tabelas (`Medicamentos.md`, `Vacinas.md`, `Pendencias.md`) são o estado atual; nenhuma view deriva estado do Histórico.

## Consequências

- Positivo: o estado atual vem de tabelas com colunas fixas, sem interpretar texto livre.
- Positivo: `Historico.md` aceita itens fora da gramática (preservados como opacos) sem afetar nenhuma view, e funde por união de linhas por ser append-only.
- Custo: o mesmo acontecimento (ex.: descontinuar um medicamento) passa a ter duas representações, o estado na tabela e o evento no Histórico.
- Custo: editar só um dos lados à mão não atualiza o outro, e nenhuma view reconcilia os dois.

# Bem-vindo ao Salus 🩺

O Salus é a central de saúde da sua família — pessoas e animais. Ele guarda seus exames, receitas, laudos e orientações médicas em um só lugar, e você pode conversar com a IA sobre tudo isso.

## Como usar (não precisa saber nada técnico)

**1. Para começar:** abra esta pasta no seu app de IA (Claude, Cowork, Gemini, etc.) e diga:

> "Quero montar meu Salus"

A IA vai fazer algumas perguntas simples sobre quem são as pessoas e animais da família, e se você já tem exames ou documentos para ela ler.

**2. Para adicionar um documento novo** (exame, receita, laudo, foto, áudio de orientação do médico):

- Arraste o arquivo para a pasta `_Caixa de Entrada`
- Diga para a IA: "organiza a caixa de entrada" (ou "chegou um exame novo do [nome]")

A IA lê o arquivo, entende do que se trata, e arquiva no lugar certo — sem você precisar fazer nada manualmente.

**3. Para consultar informações**, é só perguntar naturalmente, como se estivesse falando com alguém que conhece o histórico:

> "Como está a saúde do Rex?"
> "O colesterol do Alberth melhorou desde o ano passado?"
> "Alguma vacina está vencendo?"
> "Resume a ficha da minha mãe"

Não existem comandos obrigatórios para decorar — mas alguns atalhos ajudam:

| Diga isso | Para... |
|---|---|
| "raio-x" ou "como estamos?" | Ver o panorama de saúde de toda a família |
| "registra que..." | Anotar rapidamente uma consulta, sintoma ou remédio novo |
| "organiza a caixa de entrada" | Processar os documentos novos |
| "cruza os exames de..." | Comparar e relacionar exames ao longo do tempo |
| "revisar salus" | Checar o que está vencendo (vacinas, check-ups, receitas) |

## O que você vai encontrar em cada perfil

Cada pessoa ou animal tem uma pasta em `Perfis/` com só 3 arquivos:

- **`Ficha.md`** — o resumo de uma página: tipo sanguíneo, alergias, remédios em uso, condições, vacinas, contatos de emergência. É o que você mostra num pronto-socorro ou leva para uma consulta.
- **`Historico.md`** — a linha do tempo de tudo que aconteceu.
- **`Exames.md`** — os valores de exames de laboratório organizados ao longo do tempo, para comparar.

E a pasta `Documentos/` guarda os arquivos originais (PDFs, fotos, áudios).

## Importante

O Salus **organiza e cruza informação — ele não diagnostica nem substitui médico ou veterinário.** Sempre que algo parecer alterado, ele vai sugerir que você mostre para um profissional.

Tudo fica **salvo localmente nesta pasta**, no seu computador. Para não perder nada, recomendamos manter esta pasta sincronizada com algum serviço de nuvem (Google Drive, OneDrive, iCloud) como backup.

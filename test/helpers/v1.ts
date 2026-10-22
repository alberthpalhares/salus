import * as fs from 'node:fs';
import * as path from 'node:path';
import { memoryIo } from '../../src/cli/io.js';
import { init } from '../../src/core/framework/init.js';
import { makeTempRoot, removeTempRoot, simulateFamily } from './vault.js';

/**
 * Cofre v1 (formato 0.3/0.4) com valores realistas e fictícios, montado numa pasta temporária:
 * `init` + `simulateFamily` e, por cima, a família Tavares (Ofélia e Caetano). Nada disto é
 * commitado: cada teste cria o seu no `beforeAll` e apaga no `afterAll`.
 */
export type CofreV1 = { dir: string; limpar: () => Promise<void> };

/** Partes de nome (≥3 letras) de membros e da família que nunca podem sobrar numa cópia anonimizada. */
export const NOMES_V1 = ['Ofélia', 'Caetano', 'Tavares'] as const;
/**
 * Nomes de terceiros (profissionais e parentes sem perfil): em células, no índice (inclusive em
 * comentário), em texto livre e na árvore Mermaid, na citação e no bloco de código do Arvore.md.
 */
export const TERCEIROS_V1 = ['Rubens', 'Aguiar', 'Lívia', 'Barros', 'Iolanda', 'Gertrudes', 'Ramalho'] as const;
/** Telefones e e-mails do cofre v1. */
export const TELEFONES_V1 = ['(21) 98765-4321', '98765-4321', '(21) 3222-1100', '3222-1100'] as const;
export const EMAILS_V1 = ['caetano.t@provedor.com.br', 'rubens.aguiar@clinica.com.br'] as const;
/** Data no formato dia/mês/ano que o cofre v1 tem numa célula de tabela. */
export const DATA_BR_V1 = '12/04/2026';

const INDEX_YAML = `# _index.yaml — Fonte estruturada do Salus
# Família Tavares: Ofélia e Caetano.

schema_versao: 1
familia: "Tavares"
atualizado_em: "2026-04-02"

membros:
  - id: "ofelia"
    nome: "Ofélia Tavares"
    tipo: "pessoa"
    perfil: "Perfis/Ofélia/"
    nascimento: "1979-05-14"
    vinculo: "biologico"
    alergias: ["Penicilina"]
    condicoes_ativas: ["Hipotireoidismo"]
    medicamentos_em_uso:
      - nome: "Levotiroxina"
        dose: "50mcg 1x/dia"
        desde: "2024-02-01"
        prescrito_por: "Dr. Rubens Aguiar"
        renova_em: "2026-08-01"
        termino_em: ""
    medicamentos_prescritos: []
      # - nome: "[Medicamento]"
      #   prescrito_por: "Dra. Iolanda Barros"
      #   validade_receita: "2026-05-30"
    vacinas:
      - nome: "Influenza"
        aplicada_em: "2026-04-15"
        proxima_em: "2027-04-15"
    antiparasitarios: []
    exames_pendentes:
      - tipo: "TSH"
        solicitado_em: "2026-03-10"
        solicitado_por: "Dr. Rubens Aguiar"
        realizar_ate: "2026-09-10"
    proximos_checkups: []
    ultimo_exame_em: "2026-03-10"
    marcadores_chave:
      - marcador: "TSH"
        valor: 2.4
        unidade: "mUI/L"
        data: "2026-03-10"
        flag: "normal"
  - id: "caetano"
    nome: "Caetano Tavares"
    tipo: "pessoa"
    perfil: "Perfis/Caetano/"
    nascimento: "1976-11-02"
    vinculo: "biologico"
    alergias: []
    condicoes_ativas: []
    medicamentos_em_uso: []
    medicamentos_prescritos: []
    vacinas: []
    antiparasitarios: []
    exames_pendentes: []
    proximos_checkups: []
    ultimo_exame_em: ""
    marcadores_chave: []
`;

const META_MD = `# META — Índice do Salus

**Família:** Tavares
**Onboarding realizado em:** 2025-01-20
**Última revisão:** 2026-04-02
**Próxima revisão sugerida:** 2026-10-02

## Membros da Família

| Nome | Tipo | Papel na família | Perfil |
|---|---|---|---|
| Ofélia Tavares | Humano | Mãe | \`Perfis/Ofélia/\` |
| Caetano Tavares | Humano | Pai | \`Perfis/Caetano/\` |
`;

/** Historico.md da Ofélia com 3 datas e fim de linha CRLF (para conferir o `eol`). */
const HISTORICO_OFELIA = [
  '# Histórico de Saúde — Ofélia Tavares',
  '',
  '<!-- Formato: - **[AAAA-MM-DD]** [Descrição do evento] -->',
  '',
  '- **2025-11-28** Perfil criado no Salus por Caetano.',
  '- **2026-03-10** Hemograma e TSH colhidos no laboratório da Iolanda Barros.',
  '- **2026-04-02** Retorno com Dr. Rubens Aguiar; dose mantida.',
  '',
].join('\r\n');

const FICHA_OFELIA = `# Ficha de Saúde — Ofélia Tavares

**Nascimento:** 1979-05-14
**Tipo sanguíneo:** A+
**Plano de saúde:** Plano Fictício

## Contato de emergência
- Caetano Tavares — marido — (21) 98765-4321 — caetano.t@provedor.com.br

## Alergias e intolerâncias
- [x] Penicilina (urticária em 2019-07-03)

## Especialistas / médicos de referência

| Nome | Especialidade | Contato |
|---|---|---|
| Dr. Rubens Aguiar | Endocrinologia | (21) 3222-1100 · rubens.aguiar@clinica.com.br |

Ofélia prefere consultas à tarde e mora perto da clínica do Dr. Rubens.

---
*Última atualização: 2026-04-02*
`;

const EXAMES_OFELIA = `# Exames — Ofélia Tavares

## Acompanhamento de peso

| Data | Peso (kg) | Observação |
|---|---|---|
| 2026-03-10 | 61,5 | Depois da dieta com a nutricionista Lívia Barros |
| ${DATA_BR_V1} | 60,8 | |

## TSH

| Data | Marcador | Valor | Unidade | Faixa de referência (do laudo) | Flag (do laudo) | Observação |
|---|---|---|---|---|---|---|
| 2026-03-10 | TSH | 2,4 | mUI/L | 0,4 a 4,0 | normal | |
`;

const MEDICAMENTOS_OFELIA = `# Medicamentos — Ofélia Tavares

## Em uso

| Medicamento | Dose | Frequência | Desde | Prescrito por | Renovação / Término | Status |
|---|---|---|---|---|---|---|
| Levotiroxina | 50 mcg | 1x ao dia | 2024-02-01 | Dr. Rubens Aguiar | 2026-08-01 | Em uso |
`;

/** Árvore com Mermaid (membros e um terceiro), callout com nome e bloco de código com nome. */
const ARVORE_MD = [
  '# Árvore da família Tavares',
  '',
  '```mermaid',
  'graph TD',
  '  Gertrudes[Gertrudes Ramalho - avó] --> Ofelia[Ofélia Tavares]',
  '  Ofelia --- Caetano[Caetano Tavares]',
  '```',
  '',
  '> [!note] Caetano cuida da agenda da Ofélia',
  '> Ligar para a Gertrudes Ramalho aos domingos.',
  '',
  '```',
  'Remédio da Ofélia: comprar com a vizinha Gertrudes',
  '```',
  '',
].join('\n');

/** Os 5 arquivos v1 de um perfil a partir do template `Perfil_Humano`, com o nome preenchido. */
function perfilDoTemplate(vault: string, pasta: string, nome: string): void {
  const templates = path.join(vault, '.agents', 'skills', 'salus-onboarding', 'templates', 'Perfil_Humano');
  const destino = path.join(vault, 'Perfis', pasta);
  fs.mkdirSync(destino, { recursive: true });
  for (const arquivo of fs.readdirSync(templates)) {
    const texto = fs.readFileSync(path.join(templates, arquivo), 'utf8');
    fs.writeFileSync(path.join(destino, arquivo), texto.replaceAll('[Nome]', nome));
  }
}

/** Cria o cofre v1 da família Tavares numa pasta temporária nova. */
export async function criarCofreV1(): Promise<CofreV1> {
  const raiz = await makeTempRoot();
  const io = memoryIo();
  const codigo = await init({ cwd: raiz, targetDirName: 'Cofre', force: false, io });
  if (codigo !== 0) throw new Error(`init falhou: ${io.stderr.join('\n')}`);
  const dir = path.join(raiz, 'Cofre');
  simulateFamily(dir);

  // O perfil "Teste" e o AGENTS.md da simulação dão lugar à família Tavares.
  fs.rmSync(path.join(dir, 'Perfis', 'Teste'), { recursive: true, force: true });
  fs.writeFileSync(
    path.join(dir, 'AGENTS.md'),
    '# Cérebro da família Tavares\n\nOfélia e Caetano usam o Salus desde 2025-01-20.\n',
  );
  fs.writeFileSync(path.join(dir, 'Familia', '_index.yaml'), INDEX_YAML);
  fs.writeFileSync(path.join(dir, 'Familia', 'META.md'), META_MD);
  fs.writeFileSync(path.join(dir, 'Familia', 'Arvore.md'), ARVORE_MD);

  perfilDoTemplate(dir, 'Ofélia', 'Ofélia Tavares');
  perfilDoTemplate(dir, 'Caetano', 'Caetano Tavares');
  const ofelia = path.join(dir, 'Perfis', 'Ofélia');
  fs.writeFileSync(path.join(ofelia, 'Historico.md'), HISTORICO_OFELIA);
  fs.writeFileSync(path.join(ofelia, 'Ficha.md'), FICHA_OFELIA);
  fs.writeFileSync(path.join(ofelia, 'Exames.md'), EXAMES_OFELIA);
  fs.writeFileSync(path.join(ofelia, 'Medicamentos.md'), MEDICAMENTOS_OFELIA);
  fs.mkdirSync(path.join(ofelia, 'Documentos', 'Exames'), { recursive: true });
  fs.writeFileSync(path.join(ofelia, 'Documentos', 'Exames', '2026-03-10_Hemograma.pdf'), '');

  return { dir, limpar: () => removeTempRoot(raiz) };
}

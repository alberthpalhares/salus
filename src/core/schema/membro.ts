import { z } from 'zod';
import {
  DataOuVazia,
  Id,
  ListaOpcional,
  TextoObrigatorio,
  TextoOpcional,
  TipoMembro,
} from './comuns.js';
import { Dose } from './dose.js';
import { Evento } from './evento.js';
import { Glicemia, Marcador, Peso, Pressao } from './exame.js';
import {
  MedicamentoDescontinuado,
  MedicamentoEmUso,
  MedicamentoPrescrito,
} from './medicamento.js';
import { Consulta, ExameSolicitado } from './pendencia.js';
import { Antiparasitario, Vacina } from './vacina.js';

/**
 * Frontmatter da Ficha.md: só texto e listas de texto. Só `id`, `nome` e `tipo` são obrigatórios;
 * texto ausente ou vazio vale `''` e lista ausente ou vazia vale `[]`. `alergias` tem três estados:
 * `null` (ainda não perguntado, e também o valor da chave ausente ou vazia), `[]` (confirmado sem
 * alergia conhecida) ou a lista. Chaves desconhecidas não entram aqui; o codec as preserva no YAML.
 */
export const FichaFrontmatter = z.object({
  id: Id,
  nome: TextoObrigatorio,
  tipo: TipoMembro,
  nascimento: DataOuVazia.default(''),
  sexo: TextoOpcional,
  tipo_sanguineo: TextoOpcional,
  plano: TextoOpcional,
  papel: TextoOpcional,
  raca: TextoOpcional,
  castrado: TextoOpcional,
  microchip: TextoOpcional,
  alergias: z.union([z.null(), z.array(z.string())]).default(null),
  condicoes_ativas: ListaOpcional,
  marcadores_chave: ListaOpcional,
  pais_biologicos: ListaOpcional,
  responsaveis: ListaOpcional,
  tutores: ListaOpcional,
  conjuges: ListaOpcional,
});
export type FichaFrontmatter = z.infer<typeof FichaFrontmatter>;

/** Linha de `## Contatos de emergência`. */
export const Contato = z.object({
  nome: TextoObrigatorio,
  relacao: TextoOpcional,
  telefone: TextoOpcional,
});
export type Contato = z.infer<typeof Contato>;

/** Linha de `## Profissionais de referência`. */
export const Profissional = z.object({
  nome: TextoObrigatorio,
  especialidade: TextoOpcional,
  contato: TextoOpcional,
  acompanha: TextoOpcional,
});
export type Profissional = z.infer<typeof Profissional>;

/** Tudo que o Salus sabe de um membro, montado pelo `vault/` a partir dos oito arquivos de verdade. */
export const Membro = z.object({
  id: Id,
  /** Nome da pasta em `Perfis/` (nome humano, renomeável; o `id` é o que não muda). */
  pasta: TextoObrigatorio,
  ficha: z.object({
    frontmatter: FichaFrontmatter,
    contatos: z.array(Contato),
    profissionais: z.array(Profissional),
  }),
  medicamentos: z.object({
    emUso: z.array(MedicamentoEmUso),
    prescritos: z.array(MedicamentoPrescrito),
    descontinuados: z.array(MedicamentoDescontinuado),
  }),
  vacinas: z.array(Vacina),
  antiparasitarios: z.array(Antiparasitario),
  exames: z.object({
    pesos: z.array(Peso),
    pressoes: z.array(Pressao),
    glicemias: z.array(Glicemia),
    marcadores: z.array(Marcador),
  }),
  historico: z.array(Evento),
  pendencias: z.object({
    examesSolicitados: z.array(ExameSolicitado),
    consultas: z.array(Consulta),
  }),
  doses: z.array(Dose),
  genetica: z.object({ condicoes_hereditarias: z.array(z.string()) }),
});
export type Membro = z.infer<typeof Membro>;

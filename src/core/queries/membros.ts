import type { DataOuVazia, TipoMembro } from '../schema/comuns.js';
import type { Membro } from '../schema/membro.js';
import type { Vault } from '../vault/Vault.js';
import { compararTexto } from './normalizar.js';

/** O que identifica um membro numa lista: o que a tela de família e o `membros --json` mostram. */
export type ResumoMembro = {
  id: string;
  nome: string;
  tipo: TipoMembro;
  /** Nome da pasta em `Perfis/`. */
  pasta: string;
  nascimento: DataOuVazia;
  /** `null`: ainda não perguntado; `[]`: confirmado sem alergia conhecida. */
  alergias: string[] | null;
  condicoes_ativas: string[];
  papel: string;
};

function resumir(membro: Membro): ResumoMembro {
  const { frontmatter } = membro.ficha;
  return {
    id: membro.id,
    nome: frontmatter.nome,
    tipo: frontmatter.tipo,
    pasta: membro.pasta,
    nascimento: frontmatter.nascimento,
    alergias: frontmatter.alergias,
    condicoes_ativas: frontmatter.condicoes_ativas,
    papel: frontmatter.papel,
  };
}

/** Os membros do cofre, ordenados pelo nome (não pela pasta). */
export function listarMembros(vault: Vault): ResumoMembro[] {
  return vault.membros.map(resumir).sort((a, b) => compararTexto(a.nome, b.nome) || compararTexto(a.id, b.id));
}

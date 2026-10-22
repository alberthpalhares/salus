/**
 * Codec do `salus.yaml`, o manifesto do cofre: YAML puro, lido com `parseDocument` (esquema `core`).
 * É o único arquivo que o Salus re-serializa ao gravar, e só quando uma chave muda: o arquivo é do
 * Salus, e o `YAML.Document` preserva comentários, ordem e o estilo das demais chaves.
 */
import { type Document, parseDocument } from 'yaml';
import { SalusYaml } from '../../schema/manifesto.js';
import type { Problema } from '../problema.js';
import { detectarEol, removerBom } from '../texto.js';
import { definirChave, validar } from './escrita.js';
import type { ContextoLeitura, RegistroLido, ResultadoLeitura } from './estado.js';
import { linhaDaChave, linhaDoOffset, MENSAGEM_BOM } from './leitura.js';
import { descreverIssue, ehObjeto, iguais, valorEm } from './validacao.js';

/** Estado do manifesto: o `YAML.Document` inteiro (não há regiões nem *splice*). */
export type EstadoManifesto = {
  arquivo: string;
  /** Texto sem o BOM. */
  fonte: string;
  tinhaBom: boolean;
  eol: '\n' | '\r\n';
  documento: Document;
  /** O manifesto devolvido por `ler` (cópia); ausente se ele não passou no schema. */
  lido?: RegistroLido;
};

/**
 * `dados` é `undefined` quando o manifesto não é legível ou não passa no schema (problemas
 * `manifesto_invalido`, com a linha); o `vault/` segue sem manifesto.
 */
export function ler(
  fonte: string,
  contexto: ContextoLeitura,
): ResultadoLeitura<SalusYaml | undefined, EstadoManifesto> {
  const { arquivo } = contexto;
  const { texto, tinhaBom } = removerBom(fonte);
  const problemas: Problema[] = [];
  const problema = (mensagem: string, linha: number): void => {
    problemas.push({ arquivo, linha, codigo: 'manifesto_invalido', mensagem });
  };
  if (tinhaBom) problemas.push({ arquivo, linha: 1, codigo: 'bom', mensagem: MENSAGEM_BOM });
  const documento = parseDocument(texto, { prettyErrors: false, schema: 'core' });
  const estado: EstadoManifesto = {
    arquivo,
    fonte: texto,
    tinhaBom,
    eol: detectarEol(texto) === 'CRLF' ? '\r\n' : '\n',
    documento,
  };
  const resultado = (dados: SalusYaml | undefined) => ({ dados, problemas, opacas: [], estado });

  const erro = documento.errors.at(0);
  if (erro !== undefined) {
    const linha = linhaDoOffset(texto, erro.pos[0]);
    problema(`o salus.yaml tem YAML inválido na linha ${linha}; corrija à mão`, linha);
    return resultado(undefined);
  }
  const valor: unknown = documento.toJS();
  if (!ehObjeto(valor)) {
    problema('o salus.yaml deve ser um mapa de chaves (chave: valor)', 1);
    return resultado(undefined);
  }
  const r = SalusYaml.safeParse(valor);
  if (!r.success) {
    for (const issue of r.error.issues) {
      const chave = String(issue.path[0] ?? '');
      problema(
        `campo '${chave}' do salus.yaml: ${descreverIssue(issue, valorEm(valor, issue.path))}`,
        linhaDaChave(documento, texto, 0, chave) ?? 1,
      );
    }
    return resultado(undefined);
  }
  estado.lido = structuredClone({ ...r.data });
  return resultado(r.data);
}

/**
 * Sem chave mudada → a fonte (sem BOM) como está, sem re-serializar. Com mudança → as chaves
 * mudadas trocadas num clone do documento e `toString`, no fim de linha da fonte. Lança se o
 * manifesto não foi lido ou se `dados` não passa no schema.
 */
export function escrever(estado: EstadoManifesto, dados: SalusYaml): string {
  const lido = estado.lido;
  if (lido === undefined) {
    throw new Error('o salus.yaml não foi lido (veja os problemas da leitura): corrija-o à mão antes de gravar');
  }
  const atual: Readonly<Record<string, unknown>> = dados;
  const mudadas = Object.keys(lido).filter((chave) => !iguais(lido[chave], atual[chave]));
  if (mudadas.length === 0) return estado.fonte;
  const valido: Readonly<Record<string, unknown>> = validar(SalusYaml, dados, 'o salus.yaml');
  const documento = estado.documento.clone();
  for (const chave of mudadas) definirChave(documento, chave, valido[chave]);
  const texto = documento.toString({ flowCollectionPadding: false, lineWidth: 0 });
  return estado.eol === '\r\n' ? texto.replace(/\r?\n/g, '\r\n') : texto;
}

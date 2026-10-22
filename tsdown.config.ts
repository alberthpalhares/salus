import { defineConfig } from 'tsdown';

// Gera o binário publicado: um único dist/cli.js (ESM, com o shebang de src/cli/bin.ts).
export default defineConfig({
  entry: { cli: 'src/cli/bin.ts' },
  format: 'esm',
  platform: 'node',
  target: 'node22',
  // Com platform 'node' o tsdown usaria .mjs; o pacote é "type": "module", então .js basta.
  fixedExtension: false,
  outDir: 'dist',
  clean: true,
  dts: false,
  // ADR-0008: as seis bibliotecas de runtime ficam em `devDependencies` e são inlinadas no bundle
  // (o tsdown só externaliza o que está em `dependencies`). `alwaysBundle` é redundante com isso,
  // mas documenta a intenção e protege se uma delas voltar a `dependencies`. `onlyImport: []` é o
  // guard: a build falha se a saída importar qualquer pacote do npm (só `node:*` é permitido).
  deps: {
    alwaysBundle: ['zod', 'yaml', 'unified', 'remark-parse', 'remark-gfm', 'remark-frontmatter'],
    onlyImport: [],
  },
});

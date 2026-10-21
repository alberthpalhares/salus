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
  // ADR-0008: o tsdown externaliza o que está em `dependencies`; aqui as seis dependências de
  // runtime entram no bundle e a build falha se o resultado importar qualquer pacote do npm.
  deps: {
    alwaysBundle: ['zod', 'yaml', 'unified', 'remark-parse', 'remark-gfm', 'remark-frontmatter'],
    onlyImport: [],
  },
});

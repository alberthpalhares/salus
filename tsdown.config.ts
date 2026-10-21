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
});

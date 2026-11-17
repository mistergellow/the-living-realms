// Bundles a Node app (server/worker) into a single ESM file with esbuild.
// Everything is bundled (including @realms/* TypeScript sources) except native
// or runtime-resolved modules, which must stay in node_modules.
import { build } from 'esbuild';

const [entry, outfile] = process.argv.slice(2);

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  external: ['@node-rs/argon2', 'pino-pretty', 'bufferutil', 'utf-8-validate'],
  banner: {
    js: [
      "import { createRequire as __cr } from 'node:module';",
      "import { fileURLToPath as __fu } from 'node:url';",
      "import { dirname as __dn } from 'node:path';",
      'const require = __cr(import.meta.url);',
      'const __filename = __fu(import.meta.url);',
      'const __dirname = __dn(__filename);',
    ].join('\n'),
  },
  logLevel: 'info',
});

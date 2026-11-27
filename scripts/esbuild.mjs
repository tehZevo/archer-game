import * as esbuild from 'esbuild';
import { pngGlob } from './pngglob.mjs';

/* esbuild with the PNG glob plugin (plugins need the JS API, not the CLI):
     node scripts/esbuild.mjs <entry> <outfile> [--node] [--minify] [--watch]
   --node bundles for Node (tests, bake), otherwise an IIFE for the browser.
   PNGs are inlined as data URLs. */

const [entry, outfile, ...flags] = process.argv.slice(2);
const node = flags.includes('--node');
const options = {
  entryPoints: [entry],
  outfile,
  bundle: true,
  loader: { '.png': 'dataurl' },
  plugins: [pngGlob],
  logLevel: 'warning',
  minify: flags.includes('--minify'),
  ...(node ? { platform: 'node', target: 'node18' } : { format: 'iife', target: 'es2020' }),
};

if (flags.includes('--watch')) await (await esbuild.context(options)).watch();
else await esbuild.build(options);

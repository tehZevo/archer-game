import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* The `sprite-urls` module: every PNG under assets/, as a map from its path
   relative to assets/ ("fx/hit.png") to its URL. assets/sprites.json names
   its sheets by those paths, and src/baked.ts joins the two. JSON can't pull
   in images on its own, so this generates a module that imports each PNG
   (through the bundler's own .png loader) and exports the map. One source,
   used by the esbuild plugin below and by vitest.config.ts. */

export const MODULE = 'sprite-urls';
export const ASSETS = resolve(dirname(fileURLToPath(import.meta.url)), '../assets');

/** Every directory under (and including) dir. */
function dirsUnder(dir) {
  const subs = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
  return [dir, ...subs.flatMap((e) => dirsUnder(join(dir, e.name)))];
}

/** Every .png under assets/, as absolute paths. */
function pngs() {
  return dirsUnder(ASSETS).flatMap((d) => readdirSync(d).filter((f) => f.endsWith('.png')).map((f) => join(d, f)));
}

/** The module's source: an import per PNG, and the map of them. */
export function moduleSource() {
  const files = pngs();
  const imports = files.map((f, i) => `import u${i} from ${JSON.stringify(f)};`);
  const entries = files.map((f, i) => `  ${JSON.stringify(relative(ASSETS, f).split('\\').join('/'))}: u${i},`);
  return `${imports.join('\n')}\nexport default {\n${entries.join('\n')}\n};\n`;
}

/** esbuild plugin: resolves `import urls from 'sprite-urls'` to that module. */
export const pngGlob = {
  name: 'png-glob',
  setup(build) {
    build.onResolve({ filter: /^sprite-urls$/ }, () => ({ path: MODULE, namespace: 'png-glob' }));
    build.onLoad({ filter: /.*/, namespace: 'png-glob' }, () => ({
      contents: moduleSource(), resolveDir: ASSETS, loader: 'js', watchDirs: dirsUnder(ASSETS),
    }));
  },
};

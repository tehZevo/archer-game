import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
// @ts-expect-error: a plain .mjs script, shared with the esbuild build (no types)
import { MODULE, moduleSource } from './scripts/pngglob.mjs';

// The game is bundled with esbuild's `--loader:.png=dataurl`: importing a .png
// gives you its contents as a data URL string. This does the same in tests.
const pngAsDataUrl = {
  name: 'png-as-data-url',
  enforce: 'pre' as const,
  load(id: string): string | null {
    if (!id.endsWith('.png')) return null;
    const url = 'data:image/png;base64,' + readFileSync(id).toString('base64');
    return `export default ${JSON.stringify(url)};`;
  },
};

// `import urls from 'sprite-urls'`: every PNG under assets/ by path (see scripts/pngglob.mjs).
const pngGlob = {
  name: 'png-glob',
  resolveId: (id: string): string | null => (id === MODULE ? '\0' + MODULE : null),
  load: (id: string): string | null => (id === '\0' + MODULE ? moduleSource() : null),
};

export default defineConfig({
  plugins: [pngAsDataUrl, pngGlob],
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});

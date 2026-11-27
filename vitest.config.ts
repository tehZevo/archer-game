import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

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

export default defineConfig({
  plugins: [pngAsDataUrl],
  test: {
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});

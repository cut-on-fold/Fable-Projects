import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained index.html: it can be served by GitHub Pages, saved to a
// Mac or phone and opened offline, or pasted anywhere that takes an HTML page.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022', cssMinify: true },
  test: { include: ['tests/**/*.test.ts'] },
});

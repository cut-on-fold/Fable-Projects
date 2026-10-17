import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained index.html, like Thimble.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022', cssMinify: true },
  test: { include: ['tests/**/*.test.ts'] },
});

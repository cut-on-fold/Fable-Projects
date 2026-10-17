import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

/** Writes dist/sw.js from sw.template.js with this build's version as the cache name. */
function serviceWorker(): Plugin {
  return {
    name: 'thimble-service-worker',
    apply: 'build',
    closeBundle() {
      const src = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8');
      writeFileSync(new URL('./dist/sw.js', import.meta.url), src.replace('__VERSION__', version));
    },
  };
}

// One self-contained index.html: it can be served by GitHub Pages, saved to a
// Mac or phone and opened offline, or pasted anywhere that takes an HTML page.
// The manifest, icons and service worker beside it make it installable.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile(), serviceWorker()],
  define: { __THIMBLE_VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', cssMinify: true },
  test: { include: ['tests/**/*.test.ts'] },
});

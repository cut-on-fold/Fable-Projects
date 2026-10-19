import { readFileSync, writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

/** Writes dist/sw.js from sw.template.js with this build's version as the cache name. */
function serviceWorker(): Plugin {
  return {
    name: 'lantern-service-worker',
    apply: 'build',
    closeBundle() {
      const src = readFileSync(new URL('./sw.template.js', import.meta.url), 'utf8');
      writeFileSync(new URL('./dist/sw.js', import.meta.url), src.replace('__VERSION__', version));
    },
  };
}

// One self-contained index.html like Thimble's, with pdf.js and its worker
// bundled in, so the page can be saved and opened from a Mac with no server.
export default defineConfig({
  base: './',
  // The calibration card drawing is shared with calibration/make.mjs, one folder up.
  server: { fs: { allow: ['..'] } },
  plugins: [viteSingleFile(), serviceWorker()],
  define: { __LANTERN_VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', cssMinify: true, chunkSizeWarningLimit: 3000 },
  test: { include: ['tests/**/*.test.ts'] },
});

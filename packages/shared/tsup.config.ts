import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // The watcher starts after `build` has already produced dist (see turbo.json),
  // and the apps load dist while it runs, so only a one-off build cleans it.
  clean: !options.watch,
  sourcemap: true,
  target: 'es2022',
}));

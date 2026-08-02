import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/home-tab/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    modules: {
      // CSS is authored as kebab-case BEM (see docs/BEM.md); this converts
      // e.g. `.button--size-xs` to the JS property `buttonSizeXs`, matching
      // tcm's `-c`/`--camelCase` flag (see package.json's css:types script)
      // so the generated .d.ts and Vite's runtime keys stay identical.
      localsConvention: 'camelCaseOnly',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/support/setup.ts',
    globals: true,
  },
})

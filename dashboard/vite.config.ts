import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// VITE_PREVIEW swaps the Supabase client for an in-memory stand-in so the real
// screens can be rendered and reviewed without a live project. Production
// builds never set it, so the stand-in stays out of the shipped bundle.
const preview = process.env.VITE_PREVIEW === '1'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: preview
      ? {
          './supabase': fileURLToPath(new URL('./supabase/test/preview-client.ts', import.meta.url)),
          '../lib/supabase': fileURLToPath(new URL('./supabase/test/preview-client.ts', import.meta.url)),
        }
      : {},
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})

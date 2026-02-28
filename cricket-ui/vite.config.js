import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableSourcemap = String(env.VITE_SOURCEMAP || '').toLowerCase() === 'true'

  return {
    plugins: [react()],
    base: '/', // Use '/' for root domain or '/cricket-ui/' for subdirectory
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: enableSourcemap,
      minify: 'esbuild'
    }
  }
})


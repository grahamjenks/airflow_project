import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/**
 * SINGLE_FILE=1 emits one JS chunk, for packaging the app as a self-contained
 * HTML page. Split chunks import each other by URL, which cannot be inlined.
 */
const singleFile = process.env.SINGLE_FILE === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // Charting is the bulk of the bundle and changes far less often than
        // the app, so splitting it lets a returning visitor reuse the cached
        // copy instead of refetching everything.
        codeSplitting: singleFile
          ? false
          : {
              groups: [
                { name: 'charts', test: /node_modules[\\/](recharts|d3-|victory|decimal)/ },
                { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
              ],
            },
      },
    },
  },
})

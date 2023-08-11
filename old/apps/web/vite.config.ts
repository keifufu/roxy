import { defineConfig, loadEnv } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [solidPlugin()],
    base: env.VITE_BASE,
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0'
    },
    build: {
      target: 'esnext'
    }
  }
})
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // In API mode the app calls /api on its own origin; forward that to the Spring Boot server.
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:8080', changeOrigin: true },
  }
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})

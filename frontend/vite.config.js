import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // Proxy all backend API routes to FastAPI during development.
      // This makes API calls same-origin, fixing GitHub Codespaces sync issues.
      '/products': 'http://localhost:8000',
      '/cart': 'http://localhost:8000',
      '/checkout': 'http://localhost:8000',
      '/orders': 'http://localhost:8000',
      '/categories': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/docs': 'http://localhost:8000',
      '/openapi.json': 'http://localhost:8000',
      '/redoc': 'http://localhost:8000',
    },
  },
})

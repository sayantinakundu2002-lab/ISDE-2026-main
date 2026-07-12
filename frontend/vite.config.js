import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
const htmlBypass = (req) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return '/index.html';
  }
};

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
      '/cart': {
        target: 'http://localhost:8000',
        bypass: htmlBypass
      },
      '/checkout': {
        target: 'http://localhost:8000',
        bypass: htmlBypass
      },
      '/orders': {
        target: 'http://localhost:8000',
        bypass: htmlBypass
      },
      '/categories': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/auth': 'http://localhost:8000',
      '/admin': {
        target: 'http://localhost:8000',
        bypass: htmlBypass
      },
      '/docs': 'http://localhost:8000',
      '/openapi.json': 'http://localhost:8000',
      '/redoc': 'http://localhost:8000',
    },
  },
})

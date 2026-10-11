import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import representativesHandler from './api/representatives.ts'
import siconfiHandler from './api/siconfi.ts'

function serverlessMiddleware(handler) {
  return (request, response, next) => {
    const serverlessResponse = {
      setHeader(name, value) {
        response.setHeader(name, value)
      },
      status(code) {
        response.statusCode = code
        return this
      },
      json(body) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.end(JSON.stringify(body))
      },
    }

    void handler(request, serverlessResponse).catch(next)
  }
}

function localApiRoutes() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use('/api/representatives', serverlessMiddleware(representativesHandler))
      server.middlewares.use('/api/siconfi', serverlessMiddleware(siconfiHandler))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/representatives', serverlessMiddleware(representativesHandler))
      server.middlewares.use('/api/siconfi', serverlessMiddleware(siconfiHandler))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localApiRoutes()],
})

import type { ErrorRequestHandler, RequestHandler } from 'express'

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.', requestId: req.requestId })
}

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const message = error instanceof Error ? error.message : 'Erro interno.'
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: unknown }).status) || 500 : 500
  console.error(JSON.stringify({ level: 'error', requestId: req.requestId, message, status }))
  res.status(status).json({ error: status >= 500 ? 'Erro interno do servidor.' : message, requestId: req.requestId })
}

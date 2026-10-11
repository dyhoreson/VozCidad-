import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now()
  req.requestId = randomUUID()
  res.setHeader('x-request-id', req.requestId)
  res.on('finish', () => console.info(JSON.stringify({ level: 'info', requestId: req.requestId, method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - startedAt })))
  next()
}

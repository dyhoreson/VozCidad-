import { timingSafeEqual } from 'node:crypto'
import type { RequestHandler } from 'express'
import { env } from '../config/env.js'

export const transactionAuth: RequestHandler = (req, res, next) => {
  const provided = req.get('x-transaction-password')
  if (!provided) { res.status(403).json({ error: 'Senha de transação obrigatória.' }); return }
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(env.ADMIN_TRANSACTION_PASSWORD)
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    res.status(403).json({ error: 'Senha de transação inválida.' }); return
  }
  next()
}

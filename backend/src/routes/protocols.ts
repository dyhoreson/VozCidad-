import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

export const protocolsRouter = Router()
protocolsRouter.post('/', requireAuth, async (req, res) => {
  const input = z.object({ recipientId: z.string().uuid(), type: z.enum(['reclamacao', 'elogio', 'solicitacao']), subject: z.string().trim().min(3).max(160), message: z.string().trim().min(5).max(5000) }).safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: 'Dados do protocolo inválidos.', details: input.error.flatten() }); return }
  if (input.data.recipientId === req.auth!.userId) { res.status(400).json({ error: 'O destinatário deve ser outro perfil.' }); return }
  const { data: recipient, error: recipientError } = await supabaseAdmin.from('profiles').select('id,role').eq('id', input.data.recipientId).maybeSingle()
  if (recipientError) throw recipientError
  if (!recipient || !['politico', 'empresa'].includes(recipient.role)) { res.status(400).json({ error: 'Destinatário institucional inválido.' }); return }
  const { data, error } = await supabaseAdmin.from('protocols').insert({ user_id: req.auth!.userId, recipient_id: input.data.recipientId, type: input.data.type, subject: input.data.subject, message: input.data.message }).select('id,protocol_number,user_id,recipient_id,type,subject,message,status,created_at').single()
  if (error) throw Object.assign(new Error(error.message), { status: 400 })
  res.status(201).json({ protocol: data })
})

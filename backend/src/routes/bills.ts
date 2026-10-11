import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

export const billsRouter = Router()
billsRouter.post('/vote', requireAuth, async (req, res) => {
  const input = z.object({ billId: z.string().uuid(), vote: z.enum(['favoravel', 'desfavoravel', 'nulo']) }).safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: 'Projeto ou voto inválido.', details: input.error.flatten() }); return }
  const { data, error } = await supabaseAdmin.from('bill_votes')
    .upsert({ bill_id: input.data.billId, user_id: req.auth!.userId, vote_type: input.data.vote }, { onConflict: 'bill_id,user_id' })
    .select().single()
  if (error) throw Object.assign(new Error(error.message), { status: error.code === '23503' ? 404 : 400 })
  res.json({ vote: data })
})

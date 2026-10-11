import { Router } from 'express'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'
import { requireAuth, requireInstitutionalRole } from '../middleware/auth.js'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

export const incidentsRouter = Router()
const statuses = ['Aguardando Resposta', 'Em Reparo', 'Reparo Realizado', 'Improcedente'] as const
const createSchema = z.object({
  category: z.string().trim().min(1).max(80), title: z.string().trim().min(3).max(120).optional(), description: z.string().trim().min(5).max(3000),
  latitude: z.number().finite().min(4.8).max(7.1), longitude: z.number().finite().min(-38.6).max(-34.8),
  municipality: z.string().trim().min(2).max(100), neighborhood: z.string().trim().max(120).default(''), image_url: z.string().url().max(2000).optional(),
})

incidentsRouter.post('/', requireAuth, async (req, res) => {
  const input = createSchema.safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: 'Dados inválidos ou coordenadas fora da área aproximada do RN.', details: input.error.flatten() }); return }
  const { data, error } = await supabaseAdmin.from('incidents').insert({ ...input.data, title: input.data.title ?? input.data.description.slice(0, 120), user_id: req.auth!.userId }).select().single()
  if (error) throw Object.assign(new Error(error.message), { status: 400 })
  res.status(201).json({ incident: data })
})

incidentsRouter.patch('/:id/status', requireAuth, requireInstitutionalRole, async (req, res) => {
  const input = z.object({ status: z.enum(statuses), response: z.string().trim().min(1).max(3000) }).safeParse(req.body)
  if (!input.success) { res.status(400).json({ error: 'Status ou resposta inválidos.', details: input.error.flatten() }); return }
  // The caller JWT supplies auth.uid() to the SQL function; the service key remains server-side.
  const callerClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${req.auth!.accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await callerClient.rpc('update_incident_status', { p_incident_id: req.params.id, p_status: input.data.status, p_response: input.data.response })
  if (error) throw Object.assign(new Error(error.message), { status: /not found|not assigned/i.test(error.message) ? 404 : 400 })
  res.json({ incident: data })
})

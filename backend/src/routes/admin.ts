import { timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { env } from '../config/env.js'
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js'
import { transactionAuth } from '../middleware/transactionAuth.js'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

export const adminRouter = Router()
adminRouter.use(requireAuth, requireSuperAdmin)

function transactionPasswordValid(value: unknown) {
  if (typeof value !== 'string') return false
  const supplied = Buffer.from(value)
  const expected = Buffer.from(env.ADMIN_TRANSACTION_PASSWORD)
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}
const requireTransactionPassword = (value: unknown, res: Parameters<Parameters<typeof adminRouter.post>[1]>[1]) => {
  if (transactionPasswordValid(value)) return true
  res.status(403).json({ error: 'Senha de transação inválida.' })
  return false
}
const managedRole = z.enum(['cidadao', 'politico', 'empresa', 'admin'])

adminRouter.get('/users', async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('profiles').select('id,full_name,role,municipio,sector,points,created_at').order('created_at', { ascending: false }).limit(500)
  if (error) throw error
  res.json({ users: data })
})

adminRouter.post('/users', transactionAuth, async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8), fullName: z.string().trim().min(2).max(120), role: managedRole, municipality: z.string().trim().max(100).optional(), sector: z.string().trim().max(120).optional() }).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Dados do usuário inválidos.', details: parsed.error.flatten() }); return }
  const { email, password, fullName, role, municipality, sector } = parsed.data
  const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, municipio: municipality ?? null } })
  if (error || !data.user) throw Object.assign(new Error(error?.message ?? 'Falha ao criar usuário.'), { status: 400 })
  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').update({ full_name: fullName, role, municipio: municipality ?? null, sector: sector ?? null }).eq('id', data.user.id).select().single()
  if (profileError) throw profileError
  res.status(201).json({ user: profile })
})

adminRouter.patch('/users/:id', transactionAuth, async (req, res) => {
  const parsed = z.object({ fullName: z.string().trim().min(2).max(120).optional(), role: managedRole.optional(), municipality: z.string().trim().max(100).nullable().optional(), sector: z.string().trim().max(120).nullable().optional() }).refine(value => Object.keys(value).length > 0).safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: 'Nenhuma alteração válida foi informada.', details: parsed.error.flatten() }); return }
  const update: Record<string, unknown> = {}
  if (parsed.data.fullName !== undefined) update.full_name = parsed.data.fullName
  if (parsed.data.role !== undefined) update.role = parsed.data.role
  if (parsed.data.municipality !== undefined) update.municipio = parsed.data.municipality
  if (parsed.data.sector !== undefined) update.sector = parsed.data.sector
  const { data, error } = await supabaseAdmin.from('profiles').update(update).eq('id', req.params.id).select().maybeSingle()
  if (error) throw error
  if (!data) { res.status(404).json({ error: 'Perfil não encontrado.' }); return }
  res.json({ user: data })
})

adminRouter.delete('/users/:id', transactionAuth, async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id)
  if (!parsedId.success) { res.status(400).json({ error: 'Identificador de usuário inválido.' }); return }
  const userId = parsedId.data
  if (userId === req.auth!.userId) { res.status(400).json({ error: 'Não é permitido excluir a própria conta de super administrador.' }); return }
  const [incidentRefs, protocolRefs] = await Promise.all([
    supabaseAdmin.from('incidents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin.from('protocols').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  if (incidentRefs.error || protocolRefs.error) throw new Error('Não foi possível verificar os vínculos cívicos deste perfil.')
  if ((incidentRefs.count ?? 0) > 0 || (protocolRefs.count ?? 0) > 0) {
    res.status(409).json({ error: 'Este perfil possui ocorrências ou protocolos vinculados. Arquive ou anonimize esses registros antes de excluir a conta.' }); return
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) throw Object.assign(new Error(error.message), { status: 400 })
  res.status(204).end()
})

adminRouter.post('/users/:id/recover', transactionAuth, async (req, res) => {
  const parsedId = z.string().uuid().safeParse(req.params.id)
  if (!parsedId.success) { res.status(400).json({ error: 'Identificador de usuário inválido.' }); return }
  const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(parsedId.data)
  if (targetError || !target.user?.email) throw Object.assign(new Error('Não foi possível localizar o e-mail da conta.'), { status: 404 })
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: target.user.email })
  if (error) throw Object.assign(new Error(error.message), { status: 400 })
  res.json({ recoveryLink: data.properties?.action_link })
})

import type { RequestHandler } from 'express'
import { supabaseAdmin } from '../services/supabaseAdmin.js'

export const requireAuth: RequestHandler = async (req, res, next) => {
  const header = req.get('authorization')
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) { res.status(401).json({ error: 'Autenticação necessária.' }); return }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) { res.status(401).json({ error: 'Token inválido ou expirado.' }); return }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  if (profileError || !profile) { res.status(403).json({ error: 'Perfil não encontrado.' }); return }
  req.auth = { userId: data.user.id, role: profile.role, email: data.user.email ?? '', accessToken: token }
  next()
}

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (req.auth?.email.toLowerCase() !== 'dyhoreson.daniel@gmail.com' || req.auth.role !== 'super_admin') {
    res.status(403).json({ error: 'Acesso restrito ao super administrador.' }); return
  }
  next()
}

export const requireInstitutionalRole: RequestHandler = (req, res, next) => {
  if (!req.auth || !['empresa', 'politico', 'admin'].includes(req.auth.role)) {
    res.status(403).json({ error: 'Acesso restrito a perfis institucionais.' }); return
  }
  next()
}

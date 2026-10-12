import 'dotenv/config'
import { z } from 'zod'

function isServiceRoleKey(value: string) {
  if (value.startsWith('sb_secret_')) return true
  const segments = value.split('.')
  if (!value.startsWith('eyJ') || segments.length !== 3) return false
  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString()) as { role?: string }
    return payload.role === 'service_role'
  } catch {
    return false
  }
}

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).refine(isServiceRoleKey, 'Use uma chave secreta Supabase (sb_secret_) ou JWT com role service_role.'),
  ADMIN_TRANSACTION_PASSWORD: z.string().min(8),
  NEWSDATA_API_KEY: z.string().min(1).optional(),
  PORTAL_TRANSPARENCIA_API_KEY: z.string().trim().min(1).optional(),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error(JSON.stringify({ level: 'fatal', message: 'Invalid environment configuration', issues: parsed.error.flatten().fieldErrors }))
  process.exit(1)
}
export const env = parsed.data

import { supabase } from '../../lib/supabase'

export type ManagedUser = { id: string; full_name: string; role: string; municipio: string | null; sector: string | null; points: number; created_at: string }
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?? (import.meta.env.VITE_API_URL as string | undefined)
  ?? 'http://localhost:5000'

async function request<T>(path: string, accessToken: string, body?: Record<string, unknown>, transactionPassword?: string): Promise<T> {
  const response = await fetch(`${apiBase}/api/admin${path}`, {
    method: !body && !transactionPassword ? 'GET' : path === '/users' || path.endsWith('/recover') ? 'POST' : 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(transactionPassword ? { 'x-transaction-password': transactionPassword } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? 'Não foi possível concluir a operação.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function getToken() {
  const token = supabase?.auth.getSession()
  if (!token) throw new Error('Entre na plataforma para continuar.')
  return token
}

export async function listManagedUsers() {
  const { data } = await (await getToken())
  if (!data.session) throw new Error('Sessão expirada. Entre novamente.')
  return (await request<{ users: ManagedUser[] }>('/users', data.session.access_token)).users
}
export async function createManagedUser(input: { email: string; password: string; fullName: string; role: string; municipality?: string; transactionPassword: string }) {
  const { data } = await (await getToken())
  if (!data.session) throw new Error('Sessão expirada. Entre novamente.')
  const { transactionPassword, ...payload } = input
  return request('/users', data.session.access_token, payload, transactionPassword)
}
export async function updateManagedUser(id: string, input: { role: string; municipality: string; transactionPassword: string }) {
  const { data } = await (await getToken())
  if (!data.session) throw new Error('Sessão expirada. Entre novamente.')
  const { transactionPassword, ...payload } = input
  return request(`/users/${id}`, data.session.access_token, payload, transactionPassword)
}
export async function deleteManagedUser(id: string, transactionPassword: string) {
  const { data } = await (await getToken())
  if (!data.session) throw new Error('Sessão expirada. Entre novamente.')
  const response = await fetch(`${apiBase}/api/admin/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${data.session.access_token}`, 'x-transaction-password': transactionPassword } })
  if (!response.ok) { const result = await response.json().catch(() => ({})) as { error?: string }; throw new Error(result.error ?? 'Não foi possível remover o perfil.') }
}
export async function recoverManagedUser(id: string, transactionPassword: string) {
  const { data } = await (await getToken())
  if (!data.session) throw new Error('Sessão expirada. Entre novamente.')
  return request<{ recoveryLink?: string }>(`/users/${id}/recover`, data.session.access_token, undefined, transactionPassword)
}

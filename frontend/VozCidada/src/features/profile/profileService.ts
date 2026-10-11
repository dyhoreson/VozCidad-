import { supabase } from '../../lib/supabase'

function client() {
  if (!supabase) throw new Error('Configure o Supabase para editar seu perfil.')
  return supabase
}

export async function saveProfile(input: { userId: string; fullName: string; age: number; address: string; cep: string; municipality: string; state: string; avatarUrl: string; image?: File }) {
  const db = client()
  let avatarUrl = input.avatarUrl.trim() || null
  if (input.image) {
    if (!input.image.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.')
    if (input.image.size > 5 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 5 MB.')
    const extension = input.image.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
    const path = `${input.userId}/${crypto.randomUUID()}.${extension}`
    const { error: uploadError } = await db.storage.from('profile-avatars').upload(path, input.image, { contentType: input.image.type, upsert: false })
    if (uploadError) throw new Error(uploadError.message)
    avatarUrl = db.storage.from('profile-avatars').getPublicUrl(path).data.publicUrl
  }
  const privateUpdates = { age: input.age, address: input.address.trim(), cep: input.cep.replace(/\D/g, ''), updated_at: new Date().toISOString() }
  const { error: privateError } = await db.from('profile_private').upsert({ id: input.userId, ...privateUpdates })
  if (privateError) throw new Error(privateError.message)
  const updates = { full_name: input.fullName.trim(), municipio: input.municipality.trim(), uf: input.state, avatar_url: avatarUrl }
  const { error } = await db.from('profiles').update(updates).eq('id', input.userId)
  if (error) throw new Error(error.message)
  const { error: authError } = await db.auth.updateUser({ data: { full_name: updates.full_name, age: privateUpdates.age, address: privateUpdates.address, cep: privateUpdates.cep, municipio: updates.municipio, uf: updates.uf, avatar_url: avatarUrl } })
  if (authError) throw new Error(authError.message)
  return avatarUrl
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const db = client()
  const { data: { user }, error: userError } = await db.auth.getUser()
  if (userError || !user?.email) throw new Error('Entre novamente para alterar sua senha.')
  const { error: reauthError } = await db.auth.signInWithPassword({ email: user.email, password: currentPassword })
  if (reauthError) throw new Error('A senha atual está incorreta.')
  const { error } = await db.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

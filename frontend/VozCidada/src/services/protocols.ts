import { supabase } from '../lib/supabase'
import type { DirectRequest, DirectRequestCategory, DirectRequestStatus } from '../types'
import type { ProtocolDbType } from '../types/database'

type ProtocolRow = { id: string; protocol_number: string; user_id: string; user_name?: string; recipient_id: string; recipient_name?: string; type: string; subject: string; message: string; attachment_urls?: string[]; status: string; response: string | null; responded_at: string | null; created_at: string }
const client = () => { if (!supabase) throw new Error('Supabase ainda não está configurado.'); return supabase }
const categoryToDb: Record<DirectRequestCategory, ProtocolDbType> = { Reclamação: 'reclamacao', Elogio: 'elogio', Solicitação: 'solicitacao' }
const categoryFromDb: Record<string, DirectRequestCategory> = { reclamacao: 'Reclamação', elogio: 'Elogio', solicitacao: 'Solicitação' }
const statusFromDb: Record<string, DirectRequestStatus> = { enviado: 'Enviado', lido: 'Lido', respondido: 'Respondido', arquivado: 'Arquivado' }
function mapProtocol(row: ProtocolRow): DirectRequest { return { id: row.id, protocolNumber: row.protocol_number, userId: row.user_id, userName: row.user_name ?? 'Cidadão', recipientId: row.recipient_id, recipientName: row.recipient_name ?? 'Destinatário institucional', category: categoryFromDb[row.type] ?? 'Solicitação', subject: row.subject, message: row.message, attachmentNames: row.attachment_urls ?? [], status: statusFromDb[row.status] ?? 'Enviado', sentAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.created_at)), response: row.response ?? undefined, respondedAt: row.responded_at ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(row.responded_at)) : undefined } }

export async function listProtocolRecipients() {
  const { data, error } = await client().from('profiles').select('id,full_name,role,municipio').in('role', ['politico', 'empresa']).order('full_name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(item => ({ id: item.id, name: item.full_name || 'Perfil institucional', role: item.role, municipality: item.municipio }))
}

export async function sendProtocol(input: { userId: string; recipientId: string; category: DirectRequestCategory; subject: string; message: string; files: File[] }) {
  const db = client()
  const { data: inserted, error } = await db.from('protocols').insert({ user_id: input.userId, recipient_id: input.recipientId, type: categoryToDb[input.category], subject: input.subject, message: input.message }).select('id,protocol_number').single()
  if (error) throw new Error(error.message)
  const uploaded: string[] = []
  for (const file of input.files) {
    const path = `${inserted.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`
    const { error: uploadError } = await db.storage.from('protocol-attachments').upload(path, file, { contentType: file.type })
    if (uploadError) throw new Error(uploadError.message)
    uploaded.push(path)
  }
  if (uploaded.length) { const { error: updateError } = await db.rpc('set_protocol_attachments', { p_protocol_id: inserted.id, p_paths: uploaded }); if (updateError) throw new Error(updateError.message) }
  return inserted.protocol_number as string
}

export async function listProtocols(scope: 'mine' | 'recipient', profileId: string): Promise<DirectRequest[]> {
  const db = client(); const column = scope === 'mine' ? 'user_id' : 'recipient_id'
  const { data, error } = await db.from('protocols').select('*, user:profiles!protocols_user_id_fkey(full_name), recipient:profiles!protocols_recipient_id_fkey(full_name)').eq(column, profileId).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => mapProtocol({ ...row, user_name: row.user?.full_name, recipient_name: row.recipient?.full_name }))
}

export async function updateProtocol(protocolId: string, status: DirectRequestStatus, response?: string) {
  const statusDb: Record<DirectRequestStatus, string> = { Enviado: 'enviado', Lido: 'lido', Respondido: 'respondido', Arquivado: 'arquivado' }
  const { error } = await client().rpc('update_protocol', { p_protocol_id: protocolId, p_status: statusDb[status], p_response: response ?? null })
  if (error) throw new Error(error.message)
}

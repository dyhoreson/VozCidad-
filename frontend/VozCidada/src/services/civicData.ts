import { supabase } from '../lib/supabase'
import type { Bill, Occurrence, OccurrenceStatus, PopularVoteChoice, WorkflowHistoryEntry } from '../types'

type Row = Record<string, any>
const client = () => {
  if (!supabase) throw new Error('Supabase ainda não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  return supabase
}
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message) }
const fromDbStatus = (status: string): OccurrenceStatus => status === 'Improcedente' ? 'Solicitação Improcedente' : status as OccurrenceStatus
const toDbStatus = (status: OccurrenceStatus) => status === 'Solicitação Improcedente' ? 'Improcedente' : status

function mapIncident(row: Row, history: Row[] = []): Occurrence {
  const workflowHistory: WorkflowHistoryEntry[] = history.map(h => ({ status: fromDbStatus(h.status), changedBy: h.profiles?.full_name ?? 'Representante institucional', organization: '', changedAt: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(h.created_at)), response: h.response }))
  const rejected = row.status === 'Improcedente'
  return { id: row.id, title: row.title, description: row.description, category: row.category, municipality: row.municipality, neighborhood: row.neighborhood ?? '', status: fromDbStatus(row.status), date: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(row.created_at)), support: row.confirmations_count ?? 0, confirmations: row.confirmations_count ?? 0, photoUrl: row.image_url ?? '', coordinates: [row.latitude, row.longitude], assignedTo: row.assigned_to ?? undefined, officialResponse: row.official_response ?? undefined, workflowHistory, officialVerification: row.status === 'Em Reparo' || row.status === 'Reparo Realizado' || rejected ? { status: rejected ? 'improcedente' : 'procedente', organization: 'Órgão responsável', reviewer: 'Representante institucional', reviewedAt: workflowHistory.at(-1)?.changedAt ?? '', note: row.official_response } : undefined }
}

export async function listIncidents(): Promise<Occurrence[]> {
  const db = client()
  const { data, error } = await db.from('incidents').select('*').order('created_at', { ascending: false }); fail(error)
  const rows = data ?? []; if (!rows.length) return []
  const ids = rows.map(row => row.id)
  const { data: histories, error: historyError } = await db.from('incident_status_history').select('*, profiles(full_name)').in('incident_id', ids).order('created_at', { ascending: true }); fail(historyError)
  const grouped = new Map<string, Row[]>()
  for (const h of histories ?? []) grouped.set(h.incident_id, [...(grouped.get(h.incident_id) ?? []), h])
  return rows.map(row => mapIncident(row, grouped.get(row.id)))
}

export async function createIncident(input: Occurrence, userId: string, image?: File): Promise<Occurrence> {
  const db = client(); let imageUrl: string | null = null
  const { data: assignments, error: assignmentError } = await db.from('profiles').select('id').eq('role', 'empresa').eq('sector', input.category).or(`municipio.eq.${input.municipality},municipio.is.null`).limit(1)
  fail(assignmentError)
  if (image) {
    const path = `${userId}/${crypto.randomUUID()}-${image.name.replace(/[^\w.-]/g, '_')}`
    const { error } = await db.storage.from('incident-images').upload(path, image, { contentType: image.type, upsert: false }); fail(error)
    imageUrl = db.storage.from('incident-images').getPublicUrl(path).data.publicUrl
  }
  const { data, error } = await db.from('incidents').insert({ user_id: userId, assigned_to: assignments?.[0]?.id ?? null, category: input.category, title: input.title, description: input.description, latitude: input.coordinates[0], longitude: input.coordinates[1], municipality: input.municipality, neighborhood: input.neighborhood, image_url: imageUrl }).select().single(); fail(error)
  if (!data) throw new Error('O Supabase não retornou a denúncia criada.')
  return mapIncident(data)
}

export async function confirmIncident(incidentId: string): Promise<number> {
  const { data, error } = await client().rpc('confirm_incident', { p_incident_id: incidentId }); fail(error); return Number(data)
}

export async function listMyIncidentConfirmations(userId: string): Promise<Set<string>> {
  const { data, error } = await client().from('incident_confirmations').select('incident_id').eq('user_id', userId); fail(error)
  return new Set((data ?? []).map(row => row.incident_id))
}

export async function listInstitutionProfiles(): Promise<Array<{ id: string; name: string; role: string; municipality: string | null }>> {
  const { data, error } = await client().from('profiles').select('id,full_name,role,municipio').in('role', ['politico', 'empresa']); fail(error)
  return (data ?? []).map(row => ({ id: row.id, name: row.full_name || 'Perfil institucional', role: row.role, municipality: row.municipio }))
}

export async function updateIncidentStatus(incidentId: string, status: OccurrenceStatus, response: string): Promise<void> {
  const { error } = await client().rpc('update_incident_status', { p_incident_id: incidentId, p_status: toDbStatus(status), p_response: response }); fail(error)
}

const voteMap: Record<string, PopularVoteChoice> = { favoravel: 'favor', desfavoravel: 'against', nulo: 'null' }
const voteToDb: Record<PopularVoteChoice, import('../types/database').BillVoteDbType> = { favor: 'favoravel', against: 'desfavoravel', null: 'nulo' }
export async function listBills(userId?: string): Promise<{ bills: Bill[]; myVotes: Record<string, PopularVoteChoice> }> {
  const db = client(); const [{ data, error }, { data: totals, error: totalsError }, { data: votes, error: voteError }] = await Promise.all([
    db.from('bills').select('*').order('created_at', { ascending: false }),
    db.from('bill_vote_totals').select('bill_id,favor,against,nulo'),
    userId ? db.from('bill_votes').select('bill_id,vote_type').eq('user_id', userId) : Promise.resolve({ data: [], error: null }),
  ]); fail(error); fail(totalsError); fail(voteError)
  const counts = new Map<string, { favor: number; against: number; null: number }>((totals ?? []).map((item: Row) => [item.bill_id, { favor: item.favor, against: item.against, null: item.nulo }]))
  const myVotes: Record<string, PopularVoteChoice> = {}
  for (const vote of votes ?? []) myVotes[vote.bill_id] = voteMap[vote.vote_type]
  const bills: Bill[] = (data ?? []).map((row: Row) => ({ id: row.id, title: row.title, author: row.author, authorProfileId: row.author_id ?? undefined, summary: row.description, status: row.status, deadline: row.status === 'Votado' ? 'Consulta encerrada' : 'Em consulta', votes: { favor: counts.get(row.id)?.favor ?? 0, against: counts.get(row.id)?.against ?? 0, abstain: counts.get(row.id)?.null ?? 0 }, voteCounts: counts.get(row.id) ?? { favor: 0, against: 0, null: 0 }, pdfUrl: row.document_url ?? undefined, updatedAt: row.created_at }))
  return { bills, myVotes }
}

export async function castBillVote(billId: string, userId: string, choice: PopularVoteChoice): Promise<void> {
  const { error } = await client().from('bill_votes').upsert({ bill_id: billId, user_id: userId, vote_type: voteToDb[choice], updated_at: new Date().toISOString() }, { onConflict: 'bill_id,user_id' }); fail(error)
}

export async function createBill(input: { title: string; description: string; author: string; authorId: string; file: File }): Promise<void> {
  const db = client(); const path = `${input.authorId}/${crypto.randomUUID()}-${input.file.name.replace(/[^\w.-]/g, '_')}`
  const { error: uploadError } = await db.storage.from('bill-documents').upload(path, input.file, { contentType: 'application/pdf' }); fail(uploadError)
  const documentUrl = db.storage.from('bill-documents').getPublicUrl(path).data.publicUrl
  const { error } = await db.from('bills').insert({ title: input.title, description: input.description, author: input.author, author_id: input.authorId, document_url: documentUrl, status: 'Em tramitação' }); fail(error)
}

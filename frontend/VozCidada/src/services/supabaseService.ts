import { supabase } from '../lib/supabase'
import type { Bill, DirectRequestCategory, DirectRequestStatus, Occurrence, OccurrenceStatus, PopularVoteChoice } from '../types'
import { castBillVote, confirmIncident, createBill, createIncident, getPoliticianCivicData, listBills, listIncidents, listInstitutionProfiles, listMyIncidentConfirmations, listMyIncidents, updateIncidentStatus } from './civicData'
import { listProtocolRecipients, listProtocols, sendProtocol, updateProtocol } from './protocols'

function requireClient() {
  if (!supabase) throw new Error('Supabase ainda não está configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
  return supabase
}

/** Denúncias: leitura pública, criação autenticada e corroboração única por usuário. */
export const getIncidents = (): Promise<Occurrence[]> => listIncidents()
export { listIncidents }
export { createIncident, confirmIncident, updateIncidentStatus, listMyIncidentConfirmations }
export { listMyIncidents }
export { listBills, castBillVote, listInstitutionProfiles }
export { getPoliticianCivicData }
export { listProtocols, listProtocolRecipients, sendProtocol }

/** Projetos e resultados agregados; consulta também devolve a posição atual do usuário. */
export async function getBills(): Promise<Bill[]> { return (await listBills()).bills }
export const getBillsWithVotes = (userId?: string) => listBills(userId)
export async function voteBill(billId: string, voteType: PopularVoteChoice): Promise<void> {
  const db = requireClient(); const { data: { user }, error } = await db.auth.getUser()
  if (error) throw new Error(error.message)
  if (!user) throw new Error('Entre na plataforma para votar.')
  await castBillVote(billId, user.id, voteType)
}
export { createBill }

/** Protocolos do cidadão e caixa institucional. */
export const getProtocols = (userId: string) => listProtocols('mine', userId)
export const getRecipientProtocols = (recipientId: string) => listProtocols('recipient', recipientId)
export const getProtocolRecipients = () => listProtocolRecipients()
export async function createProtocol(input: { userId: string; recipientId: string; category: DirectRequestCategory; subject: string; message: string; files?: File[] }): Promise<string> {
  return sendProtocol({ ...input, files: input.files ?? [] })
}
export { updateProtocol }

export type ServiceProtocolStatus = DirectRequestStatus
export type ServiceIncidentStatus = OccurrenceStatus
export type ServiceVoteType = PopularVoteChoice

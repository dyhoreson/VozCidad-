export type OccurrenceCategory = 'Infraestrutura' | 'Iluminação' | 'Água e saneamento' | 'Segurança'
export type OccurrenceStatus = 'Aguardando Resposta' | 'Em Reparo' | 'Reparo Realizado' | 'Solicitação Improcedente'
export type OfficialReviewStatus = 'procedente' | 'improcedente'
export interface OfficialVerification { status: OfficialReviewStatus; organization: string; reviewer: string; reviewedAt: string; note?: string }
export interface WorkflowHistoryEntry { status: OccurrenceStatus; changedBy: string; organization: string; changedAt: string; response: string }
export type DirectRequestCategory = 'Reclamação' | 'Elogio' | 'Solicitação'
export type DirectRequestStatus = 'Enviado' | 'Lido' | 'Respondido' | 'Arquivado'
export interface DirectRequest {
  id: string; protocolNumber: string; userId: string; userName: string; recipientId: string; recipientName: string
  category: DirectRequestCategory; subject: string; message: string; attachmentNames: string[]
  status: DirectRequestStatus; sentAt: string; response?: string; respondedAt?: string
}
export interface Occurrence {
  id: string; title: string; description: string; category: OccurrenceCategory; municipality: string; neighborhood: string
  status: OccurrenceStatus; date: string; support: number; confirmations: number; photoUrl: string
  coordinates: [number, number]; officialVerification?: OfficialVerification; corroboratedBy?: string[]; assignedTo?: string
  officialResponse?: string; workflowHistory?: WorkflowHistoryEntry[]
}
export type CommunityTrust = 'new' | 'recognized' | 'official-confirmed' | 'official-rejected'
export function getCommunityTrust(occurrence: Occurrence): CommunityTrust {
  if (occurrence.officialVerification?.status === 'procedente') return 'official-confirmed'
  if (occurrence.officialVerification?.status === 'improcedente') return 'official-rejected'
  return occurrence.confirmations >= 10 ? 'recognized' : 'new'
}
export interface Politician { id: string; name: string; role: string; party: string; municipality: string; initials: string; color: string; projects: number }
export type CivicProfileKind = 'politico' | 'orgao'
export interface CivicMetrics { reportsReceived: number; resolutionRate: number; billsPresented: number; answeredReports: number }
export interface CivicProfile {
  id: string; kind: CivicProfileKind; name: string; role: string; acronym: string; party?: string; municipality: string
  initials: string; color: string; photoUrl?: string; biography: string; metrics: CivicMetrics; activity: string[]; billIds: string[]
}
export type BillStatus = 'Em votação' | 'Em tramitação' | 'Votado'
export type PopularVoteChoice = 'favor' | 'against' | 'null'
export interface Bill {
  id: string; title: string; author: string; authorProfileId?: string; summary: string; status: BillStatus; deadline: string
  votes: { favor: number; against: number; abstain: number }; voteCounts?: { favor: number; against: number; null: number }
  pdfUrl?: string; category?: string; updatedAt?: string
}

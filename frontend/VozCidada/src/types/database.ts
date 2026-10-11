export type DatabaseRole = 'cidadao' | 'politico' | 'empresa' | 'admin' | 'super_admin'
export type IncidentDbStatus = 'Aguardando Resposta' | 'Em Reparo' | 'Reparo Realizado' | 'Improcedente'
export type BillDbStatus = 'Em tramitação' | 'Em votação' | 'Votado'
export type BillVoteDbType = 'favoravel' | 'desfavoravel' | 'nulo'
export type ProtocolDbType = 'reclamacao' | 'elogio' | 'solicitacao' | 'questionamento'
export type ProtocolDbStatus = 'enviado' | 'lido' | 'respondido' | 'arquivado'

type Table<Row, Insert, Update = Partial<Insert>, Relationships extends unknown[] = []> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Relationships
}
type ProfileRow = { id: string; full_name: string; role: DatabaseRole; municipio: string | null; uf: string; sector: string | null; points: number; avatar_url: string | null; created_at: string; updated_at: string }
type IncidentRow = { id: string; user_id: string; assigned_to: string | null; category: string; title: string; description: string; latitude: number; longitude: number; municipality: string; neighborhood: string; status: IncidentDbStatus; image_url: string | null; confirmations_count: number; official_response: string | null; created_at: string; updated_at: string }
type ConfirmationRow = { incident_id: string; user_id: string; created_at: string }
type HistoryRow = { id: string; incident_id: string; actor_id: string | null; status: IncidentDbStatus; response: string; created_at: string }
type BillRow = { id: string; title: string; description: string; author: string; author_id: string | null; document_url: string | null; status: BillDbStatus; created_at: string }
type BillVoteRow = { id: string; bill_id: string; user_id: string; vote_type: BillVoteDbType; created_at: string; updated_at: string }
type LegislativeProposalVoteRow = { proposal_id: number; user_id: string; vote_type: BillVoteDbType; created_at: string; updated_at: string }
type ProtocolRow = { id: string; protocol_number: string; user_id: string; recipient_id: string; type: ProtocolDbType; subject: string; message: string; attachment_urls: string[]; status: ProtocolDbStatus; response: string | null; responded_at: string | null; created_at: string; due_at: string; updated_at: string }

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, { id: string; full_name?: string; role?: DatabaseRole; municipio?: string | null; uf?: string; sector?: string | null; points?: number; avatar_url?: string | null; created_at?: string; updated_at?: string }, { full_name?: string; role?: DatabaseRole; municipio?: string | null; uf?: string; sector?: string | null; points?: number; avatar_url?: string | null; updated_at?: string }, [{ foreignKeyName: 'profiles_id_fkey'; columns: ['id']; isOneToOne: true; referencedRelation: 'users'; referencedColumns: ['id'] }]>
      profile_private: Table<{ id: string; age: number | null; address: string | null; cep: string | null; updated_at: string }, { id: string; age?: number | null; address?: string | null; cep?: string | null; updated_at?: string }, { age?: number | null; address?: string | null; cep?: string | null; updated_at?: string }>
      politician_details: Table<{ profile_id: string; party: string | null; party_color: string | null; current_office: string | null; current_term_start: string | null; current_term_end: string | null; previous_offices: Array<{ office: string; start: string; end: string }>; last_election_votes: number | null; biography: string | null; photo_url: string | null; updated_at: string }, { profile_id: string; party?: string | null; party_color?: string | null; current_office?: string | null; current_term_start?: string | null; current_term_end?: string | null; previous_offices?: Array<{ office: string; start: string; end: string }>; last_election_votes?: number | null; biography?: string | null; photo_url?: string | null }, Partial<{ party: string | null; party_color: string | null; current_office: string | null; current_term_start: string | null; current_term_end: string | null; previous_offices: Array<{ office: string; start: string; end: string }>; last_election_votes: number | null; biography: string | null; photo_url: string | null }>>
      approved_projects: Table<{ id: string; politician_id: string; title: string; summary: string | null; approved_at: string; created_at: string }, { id?: string; politician_id: string; title: string; summary?: string | null; approved_at: string; created_at?: string }>
      parliamentary_amendments: Table<{ id: string; politician_id: string; period: string; amount: number; destination: string; municipality: string | null; category: string | null; event_name: string | null; created_at: string }, { id?: string; politician_id: string; period: string; amount: number; destination: string; municipality?: string | null; category?: string | null; event_name?: string | null; created_at?: string }>
      incidents: Table<IncidentRow, { id?: string; user_id: string; assigned_to?: string | null; category: string; title: string; description: string; latitude: number; longitude: number; municipality: string; neighborhood?: string; status?: IncidentDbStatus; image_url?: string | null; confirmations_count?: number; official_response?: string | null; created_at?: string; updated_at?: string }, { assigned_to?: string | null; category?: string; title?: string; description?: string; latitude?: number; longitude?: number; municipality?: string; neighborhood?: string; status?: IncidentDbStatus; image_url?: string | null; confirmations_count?: number; official_response?: string | null; updated_at?: string }, [
        { foreignKeyName: 'incidents_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        { foreignKeyName: 'incidents_assigned_to_fkey'; columns: ['assigned_to']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
      incident_confirmations: Table<ConfirmationRow, { incident_id: string; user_id: string; created_at?: string }, never, [
        { foreignKeyName: 'incident_confirmations_incident_id_fkey'; columns: ['incident_id']; isOneToOne: false; referencedRelation: 'incidents'; referencedColumns: ['id'] },
        { foreignKeyName: 'incident_confirmations_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
      incident_status_history: Table<HistoryRow, { id?: string; incident_id: string; actor_id?: string | null; status: IncidentDbStatus; response: string; created_at?: string }, never, [
        { foreignKeyName: 'incident_status_history_incident_id_fkey'; columns: ['incident_id']; isOneToOne: false; referencedRelation: 'incidents'; referencedColumns: ['id'] },
        { foreignKeyName: 'incident_status_history_actor_id_fkey'; columns: ['actor_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
      bills: Table<BillRow, { id?: string; title: string; description: string; author: string; author_id?: string | null; document_url?: string | null; status?: BillDbStatus; created_at?: string }, { title?: string; description?: string; author?: string; author_id?: string | null; document_url?: string | null; status?: BillDbStatus }, [
        { foreignKeyName: 'bills_author_id_fkey'; columns: ['author_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
      bill_votes: Table<BillVoteRow, { id?: string; bill_id: string; user_id: string; vote_type: BillVoteDbType; created_at?: string; updated_at?: string }, { vote_type?: BillVoteDbType; updated_at?: string }, [
        { foreignKeyName: 'bill_votes_bill_id_fkey'; columns: ['bill_id']; isOneToOne: false; referencedRelation: 'bills'; referencedColumns: ['id'] },
        { foreignKeyName: 'bill_votes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
      legislative_proposal_votes: Table<LegislativeProposalVoteRow, { proposal_id: number; user_id: string; vote_type: BillVoteDbType; created_at?: string; updated_at?: string }, { vote_type?: BillVoteDbType; updated_at?: string }, [
        { foreignKeyName: 'legislative_proposal_votes_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
      protocols: Table<ProtocolRow, { id?: string; protocol_number?: string; user_id: string; recipient_id: string; type: ProtocolDbType; subject: string; message: string; attachment_urls?: string[]; status?: ProtocolDbStatus; response?: string | null; responded_at?: string | null; created_at?: string; due_at?: string; updated_at?: string }, { status?: ProtocolDbStatus; response?: string | null; responded_at?: string | null; attachment_urls?: string[]; updated_at?: string }, [
        { foreignKeyName: 'protocols_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        { foreignKeyName: 'protocols_recipient_id_fkey'; columns: ['recipient_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] },
      ]>
    }
    Views: {
      bill_vote_totals: { Row: { bill_id: string; favor: number | null; against: number | null; nulo: number | null }; Relationships: [] }
      legislative_proposal_vote_totals: { Row: { proposal_id: number; favor: number | null; against: number | null; nulo: number | null }; Relationships: [] }
    }
    Functions: {
      confirm_incident: { Args: { p_incident_id: string }; Returns: number }
      update_incident_status: { Args: { p_incident_id: string; p_status: string; p_response: string }; Returns: IncidentRow }
      update_protocol: { Args: { p_protocol_id: string; p_status: string; p_response?: string | null }; Returns: ProtocolRow }
      set_protocol_attachments: { Args: { p_protocol_id: string; p_paths: string[] }; Returns: undefined }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

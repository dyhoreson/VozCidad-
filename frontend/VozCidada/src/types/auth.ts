import type { Session, User } from '@supabase/supabase-js'

export type UserRole = 'cidadao' | 'politico' | 'empresa' | 'admin'
export interface UserProfile {
  id: string
  email: string
  fullName: string
  role: UserRole
  municipality?: string
  avatarUrl?: string
  civicProfileId?: string
  isDemo?: boolean
}
export interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  isDemo: boolean
}
export type OAuthProvider = 'google' | 'apple' | 'azure'

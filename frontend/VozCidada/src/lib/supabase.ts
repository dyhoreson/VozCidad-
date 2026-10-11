import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && publishableKey)

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(url!, publishableKey!, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null

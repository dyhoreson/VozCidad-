// Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY when the backend is ready.
export interface SupabaseConfig { url: string; anonKey: string }
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && anonKey ? { url, anonKey } : null
}

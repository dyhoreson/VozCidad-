import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { AuthState, OAuthProvider, UserProfile, UserRole } from '../../types/auth'

const DEMO_STORAGE_KEY = 'voz-cidada-demo-user'
interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>
  signInAsDemoRole: (role: 'cidadao' | 'politico' | 'empresa') => void
  signOut: () => Promise<void>
  openAuthModal: () => void
  closeAuthModal: () => void
  authModalOpen: boolean
}
const AuthContext = createContext<AuthContextValue | null>(null)

function profileFromUser(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split('@')[0] ?? 'Cidadão',
    role: (user.app_metadata.provider === 'demo' ? user.user_metadata.role : user.app_metadata.role) as UserRole | undefined ?? 'cidadao',
    municipality: user.user_metadata.municipality,
    avatarUrl: user.user_metadata.avatar_url,
    civicProfileId: user.app_metadata.provider === 'demo' ? user.user_metadata.civic_profile_id : user.app_metadata.civic_profile_id,
  }
}

function loadDemoUser(): User | null {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!saved) return null
    return JSON.parse(saved) as User
  } catch { return null }
}

function createDemoUser(email: string, fullName: string, role: 'cidadao' | 'politico' | 'empresa' = 'cidadao'): User {
  const user = {
    id: `demo-${crypto.randomUUID()}`, aud: 'authenticated', role: 'authenticated', email,
    app_metadata: { provider: 'demo', providers: ['demo'] }, user_metadata: { full_name: fullName, role, civic_profile_id: role === 'empresa' ? 'caern' : role === 'politico' ? 'marina-albuquerque' : undefined },
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as User
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user))
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [databaseProfile, setDatabaseProfile] = useState<{ full_name: string; role: UserRole; municipio: string | null } | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setUser(loadDemoUser())
      setLoading(false)
      return
    }
    let mounted = true
    const hydrateProfile = async (nextUser: User | null) => {
      if (!nextUser) { setDatabaseProfile(null); return }
      const { data } = await supabase!.from('profiles').select('full_name,role,municipio').eq('id', nextUser.id).maybeSingle()
      if (mounted) setDatabaseProfile(data as { full_name: string; role: UserRole; municipio: string | null } | null)
    }
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      await hydrateProfile(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setDatabaseProfile(null)
      if (nextSession?.user) void Promise.resolve().then(() => hydrateProfile(nextSession.user))
      setLoading(false)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } else {
      if (password.length < 6) throw new Error('Use uma senha com pelo menos 6 caracteres.')
      setUser(createDemoUser(email, email.split('@')[0]))
    }
    setAuthModalOpen(false)
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role: 'cidadao' } } })
      if (error) throw error
      if (data.user && data.session) { setUser(data.user); setSession(data.session); setAuthModalOpen(false) }
      else throw new Error('Cadastro iniciado. Verifique seu e-mail para confirmar a conta.')
    } else {
      if (password.length < 6) throw new Error('Use uma senha com pelo menos 6 caracteres.')
      setUser(createDemoUser(email, fullName))
      setAuthModalOpen(false)
    }
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (supabase) {
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } })
      if (error) throw error
      return
    }
    const names: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple', azure: 'Microsoft' }
    setUser(createDemoUser(`visitante.${provider}@demo.vozcidada.rn`, `Visitante ${names[provider]}`))
    setAuthModalOpen(false)
  }, [])

  const signInAsDemoRole = useCallback((role: 'cidadao' | 'politico' | 'empresa') => {
    if (isSupabaseConfigured) return
    const identities = {
      cidadao: ['cidadao@demo.vozcidada.rn', 'Cidadão de demonstração'],
      politico: ['gabinete@demo.vozcidada.rn', 'Representante de demonstração'],
      empresa: ['orgao@demo.vozcidada.rn', 'Representante de órgão'],
    } as const
    const [email, name] = identities[role]
    setUser(createDemoUser(email, name, role))
    setAuthModalOpen(false)
  }, [])

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setSession(null)
    } else {
      localStorage.removeItem(DEMO_STORAGE_KEY)
    }
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user, profile: user ? { ...profileFromUser(user), ...(databaseProfile ? { fullName: databaseProfile.full_name || profileFromUser(user).fullName, role: databaseProfile.role, municipality: databaseProfile.municipio ?? undefined } : {}), isDemo: !isSupabaseConfigured } : null,
    session, loading, isDemo: !isSupabaseConfigured, signIn, signUp, signInWithOAuth, signInAsDemoRole, signOut,
    authModalOpen, openAuthModal: () => setAuthModalOpen(true), closeAuthModal: () => setAuthModalOpen(false),
  }), [user, databaseProfile, session, loading, signIn, signUp, signInWithOAuth, signInAsDemoRole, signOut, authModalOpen])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}

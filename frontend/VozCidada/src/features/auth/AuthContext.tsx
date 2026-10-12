import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { AuthState, OAuthProvider, UserProfile, UserRole } from '../../types/auth'
import { isMissingProfileUfColumn } from '../../services/profileSchema'

const DEMO_STORAGE_KEY = 'voz-cidada-demo-user'
interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, details?: { age: number; address: string; cep: string; municipality: string }) => Promise<boolean>
  resendSignupConfirmation: (email: string) => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
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
    municipality: user.user_metadata.municipio ?? user.user_metadata.municipality,
    avatarUrl: user.user_metadata.avatar_url,
    age: typeof user.user_metadata.age === 'number' ? user.user_metadata.age : undefined,
    address: user.user_metadata.address,
    cep: user.user_metadata.cep,
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

function createDemoUser(email: string, fullName: string, role: 'cidadao' | 'politico' | 'empresa' = 'cidadao', details?: { age: number; address: string; cep: string; municipality: string }): User {
  const user = {
    id: `demo-${crypto.randomUUID()}`, aud: 'authenticated', role: 'authenticated', email,
    app_metadata: { provider: 'demo', providers: ['demo'] }, user_metadata: { full_name: fullName, role, age: details?.age, address: details?.address, cep: details?.cep, municipio: details?.municipality, civic_profile_id: role === 'empresa' ? 'caern' : role === 'politico' ? 'marina-albuquerque' : undefined },
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  } as User
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(user))
  return user
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [databaseProfile, setDatabaseProfile] = useState<{ full_name: string; role: UserRole; municipio: string | null; uf: string; points: number; age: number | null; address: string | null; cep: string | null; avatar_url: string | null } | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const openAuthModal = useCallback(() => setAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), [])

  useEffect(() => {
    if (!supabase) {
      setUser(loadDemoUser())
      setLoading(false)
      return
    }
    let mounted = true
    const hydrateProfile = async (nextUser: User | null) => {
      if (!nextUser) { setDatabaseProfile(null); return }
      const [profileResult, privateResult] = await Promise.all([
        supabase!.from('profiles').select('full_name,role,municipio,uf,points,avatar_url').eq('id', nextUser.id).maybeSingle(),
        supabase!.from('profile_private').select('age,address,cep').eq('id', nextUser.id).maybeSingle(),
      ])
      let profileData = profileResult.data
      if (isMissingProfileUfColumn(profileResult.error)) {
        const fallback = await supabase!.from('profiles').select('full_name,role,municipio,points,avatar_url').eq('id', nextUser.id).maybeSingle()
        if (fallback.error) console.error('Não foi possível carregar o perfil do usuário:', fallback.error.message)
        else {
          const state = typeof nextUser.user_metadata.uf === 'string' ? nextUser.user_metadata.uf : 'RN'
          profileData = fallback.data ? { ...fallback.data, uf: state } : null
        }
      } else if (profileResult.error) {
        console.error('Não foi possível carregar o perfil do usuário:', profileResult.error.message)
      }
      if (privateResult.error) console.error('Não foi possível carregar os dados privados do perfil:', privateResult.error.message)
      if (mounted) setDatabaseProfile(profileData ? { ...profileData, age: privateResult.data?.age ?? null, address: privateResult.data?.address ?? null, cep: privateResult.data?.cep ?? null } as { full_name: string; role: UserRole; municipio: string | null; uf: string; points: number; age: number | null; address: string | null; cep: string | null; avatar_url: string | null } : null)
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
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    } else {
      if (password.length < 6) throw new Error('Use uma senha com pelo menos 6 caracteres.')
      setUser(createDemoUser(email, email.split('@')[0]))
    }
    setAuthModalOpen(false)
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string, details?: { age: number; address: string; cep: string; municipality: string }) => {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin, data: { full_name: fullName, role: 'cidadao', age: details?.age, address: details?.address, cep: details?.cep, municipio: details?.municipality, uf: 'RN' } } })
      if (error) throw error
      if (data.user && data.session) { setUser(data.user); setSession(data.session); setAuthModalOpen(false); return true }
      if (data.user) return false
      throw new Error('O Supabase não retornou a conta criada. Verifique a configuração de autenticação e tente novamente.')
    } else {
      if (password.length < 6) throw new Error('Use uma senha com pelo menos 6 caracteres.')
      setUser(createDemoUser(email, fullName, 'cidadao', details))
      setAuthModalOpen(false)
      return true
    }
  }, [])

  const resendSignupConfirmation = useCallback(async (email: string) => {
    if (!supabase) throw new Error('O reenvio do e-mail de confirmação exige a conexão com o Supabase.')
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() })
    if (error) throw error
  }, [])

  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!supabase) throw new Error('A recuperação de senha exige uma conta conectada ao Supabase.')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('A redefinição de senha exige uma conta conectada ao Supabase.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  }, [])

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    if (supabase) {
      sessionStorage.setItem('voz-cidada-redirect-profile', '1')
      const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin, ...(provider === 'azure' ? { scopes: 'email' } : {}) } })
      if (error) {
        sessionStorage.removeItem('voz-cidada-redirect-profile')
        const details = error.message.toLocaleLowerCase('pt-BR')
        if (error.code === 'validation_failed' || details.includes('unsupported provider') || details.includes('provider is not enabled')) {
          const providerName = provider === 'azure' ? 'Microsoft' : provider === 'apple' ? 'Apple/iCloud' : 'Google'
          throw new Error(`O login ${providerName} ainda não está habilitado no Supabase. Ative o provedor e configure as credenciais OAuth e as URLs de retorno no painel do Supabase.`)
        }
        throw error
      }
      return
    }
    const names: Record<OAuthProvider, string> = { google: 'Google', apple: 'Apple', azure: 'Microsoft' }
    setUser(createDemoUser(`visitante.${provider}@demo.vozcidada.rn`, `Visitante ${names[provider]}`))
    setAuthModalOpen(false)
  }, [])

  const signInAsDemoRole = useCallback((role: 'cidadao' | 'politico' | 'empresa') => {
    if (isSupabaseConfigured) return
    sessionStorage.setItem('voz-cidada-redirect-profile', '1')
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
    user, profile: user ? { ...profileFromUser(user), ...(databaseProfile ? { fullName: databaseProfile.full_name || profileFromUser(user).fullName, role: databaseProfile.role, municipality: databaseProfile.municipio ?? undefined, state: databaseProfile.uf, points: databaseProfile.points, age: databaseProfile.age ?? undefined, address: databaseProfile.address ?? undefined, cep: databaseProfile.cep ?? undefined, avatarUrl: databaseProfile.avatar_url ?? undefined } : {}), isDemo: !isSupabaseConfigured } : null,
    session, loading, isDemo: !isSupabaseConfigured, signIn, signUp, resendSignupConfirmation, resetPasswordForEmail, updatePassword, signInWithOAuth, signInAsDemoRole, signOut,
    authModalOpen, openAuthModal, closeAuthModal,
  }), [user, databaseProfile, session, loading, signIn, signUp, resendSignupConfirmation, resetPasswordForEmail, updatePassword, signInWithOAuth, signInAsDemoRole, signOut, authModalOpen, openAuthModal, closeAuthModal])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  return context
}

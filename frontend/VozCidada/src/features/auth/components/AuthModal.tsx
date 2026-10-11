import { useState, type FormEvent } from 'react'
import { Apple, Chrome, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { municipalities } from '../../../data/mock'
import { isSupabaseConfigured } from '../../../lib/supabase'
import { useAuth } from '../AuthContext'

const socialOptions = [
  { provider: 'google' as const, label: 'Continuar com Google', Icon: Chrome },
  { provider: 'apple' as const, label: 'Continuar com Apple', Icon: Apple },
  { provider: 'azure' as const, label: 'Continuar com Microsoft', Icon: null },
]

function requestedPathFrom(state: unknown) {
  if (!state || typeof state !== 'object' || !('authRequired' in state) || !('from' in state)) return null
  const { authRequired, from } = state as { authRequired?: unknown; from?: unknown }
  return authRequired === true && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null
}

export function AuthModal() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authModalOpen, closeAuthModal, signIn, signUp, resendSignupConfirmation, signInWithOAuth, signInAsDemoRole, isDemo } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [address, setAddress] = useState('')
  const [cep, setCep] = useState('')
  const [municipality, setMunicipality] = useState('Natal')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const enabledProviderNames = (import.meta.env.VITE_SUPABASE_AUTH_PROVIDERS ?? '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  const availableProviders = isDemo || isSupabaseConfigured
    ? socialOptions.filter(({ provider }) => enabledProviderNames.length === 0 || enabledProviderNames.includes(provider))
    : []
  const requestedPath = requestedPathFrom(location.state)

  if (!authModalOpen) return null

  const finishSignIn = () => {
    if (requestedPath) navigate(requestedPath, { replace: true, state: null })
  }
  const run = async (callback: () => Promise<void | boolean>) => {
    setBusy(true)
    setError('')
    try {
      const shouldFinish = await callback()
      if (shouldFinish !== false) finishSignIn()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível autenticar. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void run(async () => {
      if (mode === 'signin') {
        await signIn(email, password)
        setSuccess('')
      } else {
        const createdWithSession = await signUp(email, password, fullName, { age: Number(age), address, cep, municipality })
        setSuccess(createdWithSession ? '' : 'Cadastro criado. Enviamos um link de confirmação para seu e-mail. Confira também as pastas de spam e promoções antes de entrar.')
        return createdWithSession
      }
    })
  }

  return <div className="auth-overlay" onMouseDown={event => { if (event.target === event.currentTarget) closeAuthModal() }}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" onClick={closeAuthModal} aria-label="Fechar"><X size={19} /></button>
      <div className="auth-brand"><img className="auth-brand-logo" src="/voz-cidada-logo.png" alt="Voz Cidadã — Cuidar da cidade começa com você" /></div>
      <div className="auth-heading">
        <div className="auth-shield"><ShieldCheck size={21} /></div>
        <h2 id="auth-title">{mode === 'signin' ? 'Entre na plataforma' : 'Crie sua conta'}</h2>
        <p>{mode === 'signin' ? 'A navegação é livre. Entre quando quiser participar.' : 'Crie sua conta para participar das decisões do RN.'}</p>
      </div>

      {isDemo && <div className="demo-notice demo-notice-block">
        <div><span /> Modo demonstração ativo. Teste sem uma conta real.</div>
        <button onClick={() => { signInAsDemoRole('cidadao'); finishSignIn() }}>Entrar como cidadão</button>
        <button onClick={() => { signInAsDemoRole('empresa'); finishSignIn() }}>Testar validação oficial</button>
      </div>}

      {availableProviders.length > 0 ? <div className="social-buttons">
        {availableProviders.map(({ provider, label, Icon }) => <button type="button" disabled={busy} key={provider} onClick={() => void run(() => signInWithOAuth(provider))}>
          {Icon ? <Icon size={17} /> : <span className="microsoft-mark"><i /><i /><i /><i /></span>}{label}
        </button>)}
        {!isDemo && <p className="auth-terms">Google, Microsoft e Apple/iCloud precisam estar habilitados com credenciais e URLs de retorno no painel do Supabase.</p>}
      </div> : <p className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-center text-xs leading-5 text-blue-800">Login social indisponível no momento. Você pode entrar ou criar uma conta com e-mail.</p>}

      <div className="auth-divider"><span /> ou use seu e-mail <span /></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'signup' && <label>Nome completo<input required autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} placeholder="Como podemos chamar você?" /> </label>}
        {mode === 'signup' && <>
          <label>Idade<input type="number" required min={16} max={120} value={age} onChange={event => setAge(event.target.value)} placeholder="Sua idade" /></label>
          <label>Endereço<input required autoComplete="street-address" value={address} onChange={event => setAddress(event.target.value)} placeholder="Rua, número e bairro" /></label>
          <label>CEP<input required inputMode="numeric" autoComplete="postal-code" maxLength={9} pattern="[0-9]{5}-?[0-9]{3}" value={cep} onChange={event => setCep(event.target.value)} placeholder="59000-000" /></label>
          <label>Município<select required value={municipality} onChange={event => setMunicipality(event.target.value)}>{municipalities.map(city => <option key={city}>{city}</option>)}</select></label>
        </>}
        <label>E-mail<div className="auth-input-wrap"><Mail size={16} /><input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="voce@exemplo.com" /></div></label>
        <label>Senha<div className="auth-input-wrap">
          <input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 6 caracteres" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
        </div></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {success && <div className="auth-success" role="status"><p>{success}</p><button type="button" disabled={busy} onClick={() => void run(async () => { await resendSignupConfirmation(email); setSuccess('Link de confirmação reenviado. Confira sua caixa de entrada.') ; return false })}>Reenviar confirmação</button></div>}
        <button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{mode === 'signin' ? 'Entrar com e-mail' : 'Criar conta'}</button>
      </form>
      <p className="auth-switch">{mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'} <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess('') }}>{mode === 'signin' ? 'Cadastre-se' : 'Entrar'}</button></p>
      <p className="auth-terms">Só é necessário entrar para votar, publicar uma ocorrência ou enviar uma solicitação. Ao continuar, você concorda com nossos <a href="#termos">Termos de uso</a> e <a href="#privacidade">Política de privacidade</a>.</p>
    </section>
  </div>
}

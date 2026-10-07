import { useState, type FormEvent } from 'react'
import { Activity, Apple, Chrome, Eye, EyeOff, LoaderCircle, Mail, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../AuthContext'

export function AuthModal() {
  const { authModalOpen, closeAuthModal, signIn, signUp, signInWithOAuth, signInAsDemoRole, isDemo } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  if (!authModalOpen) return null
  const run = async (callback: () => Promise<void>) => { setBusy(true); setError(''); try { await callback() } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível autenticar.') } finally { setBusy(false) } }
  const submit = (event: FormEvent) => { event.preventDefault(); void run(() => mode === 'signin' ? signIn(email, password) : signUp(email, password, fullName)) }
  return <div className="auth-overlay" onMouseDown={e => { if (e.target === e.currentTarget) closeAuthModal() }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
    <button className="auth-close" onClick={closeAuthModal} aria-label="Fechar"><X size={19} /></button><div className="auth-brand"><span><Activity size={20} /></span><strong>voz<span>cidadã</span></strong></div>
    <div className="auth-heading"><div className="auth-shield"><ShieldCheck size={21} /></div><h2 id="auth-title">{mode === 'signin' ? 'Entre na plataforma' : 'Crie sua conta'}</h2><p>{mode === 'signin' ? 'Participe das decisões que transformam o RN.' : 'Junte-se a quem está construindo um RN melhor.'}</p></div>
    {isDemo && <div className="demo-notice demo-notice-block"><div><span /> Modo demonstração ativo. Teste sem uma conta real.</div><button onClick={() => signInAsDemoRole('cidadao')}>Entrar como cidadão</button><button onClick={() => signInAsDemoRole('empresa')}>Testar validação oficial</button></div>}
    <div className="social-buttons"><button disabled={busy} onClick={() => void run(() => signInWithOAuth('google'))}><Chrome size={17} /> Continuar com Google</button><button disabled={busy} onClick={() => void run(() => signInWithOAuth('apple'))}><Apple size={18} /> Continuar com Apple</button><button disabled={busy} onClick={() => void run(() => signInWithOAuth('azure'))}><span className="microsoft-mark"><i /><i /><i /><i /></span> Continuar com Microsoft</button></div>
    <div className="auth-divider"><span /> ou use seu e-mail <span /></div><form className="auth-form" onSubmit={submit}>
      {mode === 'signup' && <label>Nome completo<input required autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Como podemos chamar você?" /></label>}
      <label>E-mail<div className="auth-input-wrap"><Mail size={16} /><input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></div></label>
      <label>Senha<div className="auth-input-wrap"><input type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 6 caracteres" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
      {error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={17} /> : null}{mode === 'signin' ? 'Entrar com e-mail' : 'Criar conta'}</button>
    </form><p className="auth-switch">{mode === 'signin' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'} <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }}>{mode === 'signin' ? 'Cadastre-se' : 'Entrar'}</button></p>
    <p className="auth-terms">Ao continuar, você concorda com nossos <a href="#termos">Termos de uso</a> e <a href="#privacidade">Política de privacidade</a>.</p>
  </section></div>
}

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../AuthContext'

export function ResetPasswordPage() {
  const { user, loading, updatePassword, openAuthModal } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      setSuccess(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar sua senha. Solicite um novo link.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="reset-password-page">
    <section className="reset-password-card" aria-labelledby="reset-password-title">
      <div className="auth-shield"><KeyRound size={21} /></div>
      <h1 id="reset-password-title">{success ? 'Senha atualizada' : 'Redefinir senha'}</h1>
      {success ? <>
        <p role="status">Sua senha foi alterada com segurança. Você já pode continuar usando a plataforma.</p>
        <Link className="auth-submit reset-password-link" to="/">Ir para a plataforma</Link>
      </> : loading ? <p role="status">Validando o link de recuperação…</p> : user ? <>
        <p>Escolha uma nova senha para sua conta.</p>
        <form className="auth-form" onSubmit={event => void submit(event)}>
          <label>Nova senha
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
          </label>
          <label>Confirme a nova senha
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              placeholder="Digite a senha novamente"
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}
            Salvar nova senha
          </button>
        </form>
      </> : <>
        <p role="alert">Este link de recuperação é inválido ou expirou. Solicite um novo link para redefinir sua senha.</p>
        <button className="auth-submit reset-password-link" onClick={openAuthModal}>Voltar para entrar</button>
      </>}
    </section>
  </div>
}

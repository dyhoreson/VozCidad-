import { useEffect, useState, type FormEvent } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

type Props = { open: boolean; submitting?: boolean; error?: string; onCancel: () => void; onConfirm: (password: string) => void | Promise<void> }

export function TransactionPasswordModal({ open, submitting = false, error, onCancel, onConfirm }: Props) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  useEffect(() => { if (open) { setPassword(''); setVisible(false) } }, [open])
  if (!open) return null
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (password) void onConfirm(password) }
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-slate-950/55 p-3 sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget && !submitting) onCancel() }}>
    <form role="dialog" aria-modal="true" aria-labelledby="transaction-password-title" onSubmit={submit} className="max-h-[calc(100vh-1.5rem)] max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800"><KeyRound size={21} /></div>
      <h2 id="transaction-password-title" className="text-xl font-bold text-slate-900">Confirme sua identidade</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">Informe a senha de transação para autorizar esta ação administrativa.</p>
      <label className="mt-5 block text-sm font-medium text-slate-700" htmlFor="transaction-password">Senha de transação</label>
      <div className="mt-1 flex rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-indigo-500">
        <input id="transaction-password" autoFocus required autoComplete="current-password" type={visible ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} className="min-w-0 flex-1 rounded-l-lg px-3 py-2 outline-none" />
        <button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)} className="px-3 text-slate-500 hover:text-slate-800">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={submitting} onClick={onCancel} className="secondary-action rounded-lg px-4 py-2 disabled:opacity-50">Cancelar</button><button type="submit" disabled={!password || submitting} className="primary-button rounded-lg px-4 py-2 disabled:opacity-50">{submitting ? 'Validando…' : 'Confirmar'}</button></div>
    </form>
  </div>
}

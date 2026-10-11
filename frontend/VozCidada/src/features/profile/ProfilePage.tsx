import { useEffect, useState, type FormEvent } from 'react'
import { Camera, FileText, LockKeyhole, MapPin, Save, ShieldCheck } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BadgeCard } from '../gamification/BadgeCard'
import { listMyIncidents } from '../../services/supabaseService'
import type { Occurrence } from '../../types'
import type { DirectRequest } from '../../types'
import { changePassword, saveProfile } from './profileService'
import { listProtocols } from '../../services/supabaseService'

const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export function ProfilePage() {
  const { user, profile, loading, isDemo } = useAuth()
  const [form, setForm] = useState({ fullName: '', age: '', address: '', cep: '', municipality: '', state: 'RN', avatarUrl: '' })
  const [image, setImage] = useState<File>()
  const [preview, setPreview] = useState('')
  const [reports, setReports] = useState<Occurrence[]>([])
  const [protocols, setProtocols] = useState<DirectRequest[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({ fullName: profile?.fullName ?? '', age: profile?.age ? String(profile.age) : '', address: profile?.address ?? '', cep: profile?.cep ?? '', municipality: profile?.municipality ?? '', state: profile?.state ?? 'RN', avatarUrl: profile?.avatarUrl ?? '' })
    if (isDemo) return
    void listMyIncidents(user.id).then(setReports).catch(cause => setError(cause instanceof Error ? cause.message : 'Não foi possível buscar suas ocorrências.'))
    void listProtocols('mine', user.id).then(setProtocols).catch(cause => setError(cause instanceof Error ? cause.message : 'Não foi possível buscar suas solicitações.'))
  }, [user?.id, profile?.fullName, profile?.age, profile?.address, profile?.cep, profile?.municipality, profile?.state, profile?.avatarUrl, isDemo])

  if (loading) return <div className="p-8 text-slate-600">Carregando perfil…</div>
  if (!user) return <Navigate to="/" replace />

  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      const avatarUrl = await saveProfile({ userId: user.id, fullName: form.fullName, age: Number(form.age), address: form.address, cep: form.cep, municipality: form.municipality, state: form.state, avatarUrl: form.avatarUrl, image })
      setImage(undefined); setPreview(''); setForm(current => ({ ...current, avatarUrl: avatarUrl ?? '' })); setMessage('Perfil atualizado.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o perfil.') }
    finally { setBusy(false) }
  }
  const submitPassword = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('')
    if (newPassword !== confirmPassword) { setError('A nova senha e a confirmação são diferentes.'); return }
    setBusy(true)
    try { await changePassword(currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('Senha alterada com sucesso.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a senha.') }
    finally { setBusy(false) }
  }

  const resolved = reports.filter(report => report.status === 'Reparo Realizado').length
  const avatar = preview || form.avatarUrl
  return <div className="mx-auto max-w-5xl px-5 py-9 md:px-8">
    <header className="mb-7"><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Minha conta</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Meu perfil</h1><p className="mt-2 text-slate-600">Atualize seus dados e acompanhe sua participação cidadã.</p></header>
    {(error || message) && <p role={error ? 'alert' : 'status'} className={`mb-5 rounded-xl p-3 text-sm ${error ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>{error || message}</p>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="text-lg font-semibold text-slate-900">Dados pessoais</h2><form onSubmit={save} className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center gap-4"><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-slate-100 text-xl font-bold text-slate-600">{avatar ? <img src={avatar} alt="Foto de perfil" className="h-full w-full object-cover" /> : form.fullName.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><label className="block text-sm font-medium text-slate-700">URL da foto</label><input type="url" value={form.avatarUrl} onChange={e => setForm({ ...form, avatarUrl: e.target.value })} placeholder="https://…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /><label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-blue-700"><Camera size={16} />Enviar imagem (máx. 5 MB)<input type="file" accept="image/*" className="sr-only" onChange={e => { const file = e.target.files?.[0]; if (file) { setImage(file); setPreview(URL.createObjectURL(file)) } }} /></label></div></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Nome<input required autoComplete="name" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Idade<input required type="number" min={16} max={120} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">E-mail<input disabled value={user.email ?? ''} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500" /></label><label className="text-sm font-medium text-slate-700">Município<input required value={form.municipality} onChange={e => setForm({ ...form, municipality: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Estado (UF)<select required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">{states.map(state => <option key={state} value={state}>{state}</option>)}</select></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Endereço<input required autoComplete="street-address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">CEP<input required inputMode="numeric" autoComplete="postal-code" maxLength={9} pattern="[0-9]{5}-?[0-9]{3}" value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} placeholder="59000-000" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label></div>
          <button disabled={busy} className="primary-button inline-flex items-center gap-2 rounded-lg px-4 py-2.5 disabled:opacity-50"><Save size={16} />Salvar perfil</button>
        </form></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><LockKeyhole size={19} />Alterar senha de acesso</h2><form onSubmit={submitPassword} className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700 sm:col-span-2">Senha atual<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Nova senha<input required type="password" minLength={8} autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Confirmar nova senha<input required type="password" minLength={8} autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button disabled={busy} className="primary-button inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 disabled:opacity-50"><ShieldCheck size={16} />Atualizar senha</button></form></section>
      </div>
      <aside className="space-y-5"><BadgeCard points={profile?.points ?? 0} userId={user.id} /><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold"><FileText size={18} className="text-blue-700" />Minhas solicitações</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-2xl text-slate-900">{protocols.length}</strong><span className="text-xs text-slate-500">protocolos</span></div><div className="rounded-xl bg-red-50 p-3"><strong className="block text-2xl text-red-800">{protocols.filter(item => item.overdueDays > 0).length}</strong><span className="text-xs text-red-700">em atraso</span></div></div><ul className="mt-4 space-y-3">{protocols.slice(0, 4).map(item => <li key={item.id} className="border-t border-slate-100 pt-3"><div className="flex items-start justify-between gap-2"><strong className="text-sm text-slate-800">{item.subject}</strong>{item.overdueDays > 0 && <span className="shrink-0 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">{item.overdueDays} d em atraso</span>}</div><span className="mt-1 block text-xs text-slate-500">{item.category} · {item.recipientName} · {item.status}</span>{item.response && <span className="mt-1 block text-xs text-green-700">Resposta recebida</span>}</li>)}{protocols.length === 0 && <li className="border-t border-slate-100 pt-3 text-sm text-slate-500">Suas solicitações aparecerão aqui após o envio.</li>}</ul><Link to="/meus-protocolos" className="mt-4 inline-flex text-sm font-semibold text-blue-700">Ver todos os protocolos →</Link></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold"><MapPin size={18} className="text-blue-700" />Minhas denúncias</div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-2xl text-slate-900">{reports.length}</strong><span className="text-xs text-slate-500">registradas</span></div><div className="rounded-xl bg-green-50 p-3"><strong className="block text-2xl text-green-800">{resolved}</strong><span className="text-xs text-slate-500">resolvidas</span></div></div><ul className="mt-4 space-y-3">{reports.slice(0, 5).map(report => <li key={report.id} className="border-t border-slate-100 pt-3"><strong className="block text-sm text-slate-800">{report.title}</strong><span className="text-xs text-slate-500">{report.municipality} · {report.status}</span></li>)}{reports.length === 0 && <li className="border-t border-slate-100 pt-3 text-sm text-slate-500">Suas ocorrências aparecerão aqui.</li>}</ul></section></aside>
    </div>
  </div>
}

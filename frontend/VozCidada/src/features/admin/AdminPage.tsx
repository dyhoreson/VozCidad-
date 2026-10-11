import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, RefreshCw, ShieldAlert, Trash2, Users, MailCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { createManagedUser, deleteManagedUser, listManagedUsers, recoverManagedUser, updateManagedUser, type ManagedUser } from './adminApi'
import { TransactionPasswordModal } from '../../components/admin/TransactionPasswordModal'

const roleOptions = ['cidadao', 'politico', 'empresa', 'admin']
export function AdminPage() {
  const { user, profile, loading } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [recoveryLink, setRecoveryLink] = useState('')
  const [txAction, setTxAction] = useState<null | ((password: string) => Promise<unknown>)>(null)
  const [newUser, setNewUser] = useState({ email: '', password: '', fullName: '', role: 'empresa', municipality: '' })

  const refresh = useCallback(async () => { setBusy(true); setError(''); try { setUsers(await listManagedUsers()) } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao carregar usuários.') } finally { setBusy(false) } }, [])
  useEffect(() => { if (profile?.role === 'super_admin' && user?.email?.toLowerCase() === 'dyhoreson.daniel@gmail.com') void refresh() }, [profile?.role, user?.email, refresh])
  if (loading) return <div className="p-8 text-slate-600">Verificando acesso…</div>
  if (user?.email?.toLowerCase() !== 'dyhoreson.daniel@gmail.com' || profile?.role !== 'super_admin') return <Navigate to="/" replace />

  const withTransaction = (action: (password: string) => Promise<unknown>) => { setError(''); setNotice(''); setRecoveryLink(''); setTxAction(() => action) }
  const confirmTransaction = async (password: string) => {
    if (!txAction || !password) return
    setBusy(true); setError('')
    try { const result = await txAction(password) as { recoveryLink?: string } | undefined; setTxAction(null); setNotice('Ação concluída.'); if (result?.recoveryLink) setRecoveryLink(result.recoveryLink); await refresh() }
    catch (e) { setError(e instanceof Error ? e.message : 'A ação falhou.') }
    finally { setBusy(false) }
  }

  return <div className="mx-auto max-w-6xl px-5 py-9 md:px-8"><header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-semibold text-indigo-700"><ShieldAlert size={17} />ÁREA RESTRITA</div><h1 className="mt-2 text-3xl font-bold text-slate-900">Super administrador</h1><p className="mt-2 text-slate-600">Gestão de contas e perfis institucionais.</p></div><button onClick={() => void refresh()} className="secondary-action inline-flex items-center gap-2 rounded-lg px-4 py-2"><RefreshCw size={16} />Atualizar</button></header>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}{recoveryLink && <> <a className="underline" href={recoveryLink} target="_blank" rel="noreferrer">Abrir link de recuperação</a></>}</p>}
    <section className="mb-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-semibold"><Plus size={19} />Cadastrar usuário ou órgão</h2><form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={e => { e.preventDefault(); withTransaction(password => createManagedUser({ ...newUser, transactionPassword: password })) }}>
      <input required type="text" autoComplete="name" placeholder="Nome do perfil / órgão" value={newUser.fullName} onChange={e => setNewUser({ ...newUser, fullName: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input required type="email" autoComplete="email" placeholder="E-mail de acesso" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <input required type="password" autoComplete="new-password" minLength={8} placeholder="Senha inicial (mín. 8 caracteres)" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2">{roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</select>
      <input placeholder="Município" value={newUser.municipality} onChange={e => setNewUser({ ...newUser, municipality: e.target.value })} className="rounded-lg border border-slate-300 px-3 py-2" />
      <button className="primary-button rounded-lg px-4 py-2">Criar usuário</button>
    </form><p className="mt-3 text-xs text-slate-500">A senha inicial deve ser entregue ao responsável por canal seguro. Caern, Cosern e prefeituras são cadastradas como perfis do tipo empresa ou político.</p></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-2 border-b border-slate-200 p-5"><Users size={19} /><h2 className="text-lg font-semibold">Usuários e órgãos</h2><span className="ml-auto text-sm text-slate-500">{users.length} perfis</span></div>{busy && users.length === 0 ? <p className="p-6 text-slate-500">Carregando perfis…</p> : users.length === 0 ? <p className="p-6 text-slate-500">Nenhum perfil encontrado.</p> : <div className="divide-y divide-slate-100">{users.map(item => <UserRow key={item.id} user={item} onEdit={change => withTransaction(password => updateManagedUser(item.id, { ...change, transactionPassword: password }))} onRecover={() => withTransaction(password => recoverManagedUser(item.id, password))} onDelete={() => { if (window.confirm(`Excluir o perfil ${item.full_name}?`)) withTransaction(password => deleteManagedUser(item.id, password)) }} />)}</div>}</section>
    <TransactionPasswordModal open={Boolean(txAction)} submitting={busy} error={txAction ? error : undefined} onCancel={() => setTxAction(null)} onConfirm={confirmTransaction} />
  </div>
}

function UserRow({ user, onEdit, onRecover, onDelete }: { user: ManagedUser; onEdit: (input: { role: string; municipality: string }) => void; onRecover: () => void; onDelete: () => void }) {
  const [role, setRole] = useState(user.role)
  const [municipality, setMunicipality] = useState(user.municipio ?? '')
  return <div className="grid gap-3 p-4 md:grid-cols-[minmax(160px,1fr)_150px_180px_auto] md:items-center"><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{user.full_name || 'Perfil sem nome'}</p><p className="truncate text-xs text-slate-500">{user.id}</p><p className="text-xs text-amber-700">{user.points} pontos</p></div><select aria-label="Tipo de perfil" value={role} onChange={e => setRole(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2">{roleOptions.map(value => <option key={value}>{value}</option>)}</select><input aria-label="Município" placeholder="Município" value={municipality} onChange={e => setMunicipality(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2" /><div className="flex gap-2"><button onClick={() => onEdit({ role, municipality })} className="primary-button rounded-lg px-3 py-2 text-sm">Salvar</button><button aria-label={`Enviar recuperação para ${user.full_name}`} title="Gerar recuperação de acesso" onClick={onRecover} className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-800 hover:bg-blue-100"><MailCheck size={17} /></button><button aria-label={`Excluir ${user.full_name}`} onClick={onDelete} className="danger-button rounded-lg p-2"><Trash2 size={17} /></button></div></div>
}

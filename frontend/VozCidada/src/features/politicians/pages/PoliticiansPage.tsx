import { useEffect, useMemo, useState } from 'react'
import { Building2, Search, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import { useAuth } from '../../auth/AuthContext'
import { listInstitutionProfiles } from '../../../services/supabaseService'

type DirectoryFilter = 'todos' | 'politicos' | 'orgaos'
type DirectoryPerson = { id: string; name: string; role: string; municipality: string | null }
export function PoliticiansPage() {
  const [filter, setFilter] = useState<DirectoryFilter>('todos'); const [query, setQuery] = useState(''); const [people, setPeople] = useState<DirectoryPerson[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const { profile } = useAuth(); const canManage = profile?.role === 'politico' || profile?.role === 'empresa' || profile?.role === 'admin'
  useEffect(() => { let active = true; void listInstitutionProfiles().then(rows => { if (active) setPeople(rows) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar o diretório.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  const filtered = useMemo(() => people.filter(person => (filter === 'todos' || (filter === 'orgaos' ? person.role === 'empresa' : person.role === 'politico')) && `${person.name} ${person.role} ${person.municipality ?? ''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))), [people, filter, query])
  return <div className="page-wrap civic-directory"><div className="directory-tabs"><Link className="directory-tab active" to="/representantes"><UsersRound size={16} /> Diretório</Link>{canManage && <Link className="directory-tab" to="/gestao"><Building2 size={16} /> Painel de gestão</Link>}</div>
    <SectionTitle eyebrow="REPRESENTAÇÃO E SERVIÇOS" title="Quem atua pelo Rio Grande do Norte" description="Conheça as contas institucionais cadastradas, órgãos e representantes que utilizam a plataforma." />
    <label className="map-search civic-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome ou município" /></label>
    <div className="directory-filter-tabs" role="tablist" aria-label="Filtrar diretório">{([['todos', 'Todos'], ['politicos', 'Políticos'], ['orgaos', 'Órgãos e concessionárias']] as const).map(([key, label]) => <button role="tab" aria-selected={filter === key} key={key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
    <div className="directory-summary"><strong>{filter === 'orgaos' ? 'Órgãos e concessionárias' : filter === 'politicos' ? 'Representantes cadastrados' : 'Representantes e serviços'}</strong><span>{loading ? 'Carregando…' : `${filtered.length} perfis · cadastro Supabase`}</span></div>
    {error && <p role="alert" className="management-notice">{error}</p>}{loading ? <div className="empty-state">Carregando diretório…</div> : <div className="politician-grid civic-directory-grid">{filtered.map(person => <Link className="politician-card" key={person.id} to={`/representantes/${person.id}`}><div className="politician-card-avatar">{person.name.slice(0, 2).toUpperCase()}</div><span className="profile-kind-tag">{person.role === 'empresa' ? 'Órgão / concessionária' : 'Representante público'}</span><h3>{person.name}</h3><p>{person.role === 'empresa' ? 'Conta institucional' : 'Conta de representante'}{person.municipality ? ` · ${person.municipality}, RN` : ''}</p><span className="subtle-link">Ver perfil <Building2 size={14} /></span></Link>)}</div>}
    {!loading && filtered.length === 0 && <div className="empty-state">Nenhum perfil institucional cadastrado corresponde a esta busca.</div>}
  </div>
}

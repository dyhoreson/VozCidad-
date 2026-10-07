import { useEffect, useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import { OccurrenceList } from '../components/OccurrenceList'
import { IncidentMap } from '../components/IncidentMap'
import { IncidentDetailsModal } from '../components/IncidentDetailsModal'
import { NewIncidentModal, type NewIncidentDraft } from '../components/NewIncidentModal'
import { municipalities } from '../../../data/mock'
import { getCommunityTrust, type Occurrence, type OccurrenceCategory } from '../../../types'
import { useAuth } from '../../auth/AuthContext'
import { confirmIncident, createIncident, listIncidents, listMyIncidentConfirmations, updateIncidentStatus } from '../../../services/supabaseService'

const filters: Array<'Todas' | OccurrenceCategory> = ['Todas', 'Infraestrutura', 'Iluminação', 'Água e saneamento', 'Segurança']
export function MapPage() {
  const { user, profile, openAuthModal } = useAuth()
  const [items, setItems] = useState<Occurrence[]>([]); const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set()); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<(typeof filters)[number]>('Todas'); const [city, setCity] = useState('Todas as cidades'); const [query, setQuery] = useState(''); const [selected, setSelected] = useState<Occurrence | null>(null); const [newIncidentOpen, setNewIncidentOpen] = useState(false)
  const refresh = async () => { setLoading(true); setError(''); try { const [incidents, confirmations] = await Promise.all([listIncidents(), user ? listMyIncidentConfirmations(user.id) : Promise.resolve(new Set<string>())]); setItems(incidents); setConfirmedIds(confirmations) } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar as denúncias.') } finally { setLoading(false) } }
  useEffect(() => { void refresh() }, [user?.id])
  useEffect(() => { setSelected(current => current ? items.find(item => item.id === current.id) ?? null : null) }, [items])
  const filtered = useMemo(() => items.filter(item => (filter === 'Todas' || item.category === filter) && (city === 'Todas as cidades' || item.municipality === city) && (!query || `${item.title} ${item.description} ${item.neighborhood} ${item.municipality}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))), [items, filter, city, query])
  const requireCitizen = () => { if (!user) { openAuthModal(); return false } return true }
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); await refresh() } catch (e) { setError(e instanceof Error ? e.message : 'A operação não foi concluída.') } finally { setBusy(false) } }
  const corroborate = () => { if (selected && requireCitizen() && user) void run(async () => { await confirmIncident(selected.id) }) }
  const verify = (status: 'procedente' | 'improcedente') => {
    if (!selected || !profile || !['politico', 'empresa', 'admin'].includes(profile.role)) return
    const newStatus = status === 'procedente' ? 'Em Reparo' : 'Solicitação Improcedente'
    const response = status === 'procedente' ? 'Ocorrência confirmada. A equipe responsável foi acionada para atendimento.' : 'Após análise, a ocorrência não foi confirmada pelo órgão.'
    void run(() => updateIncidentStatus(selected.id, newStatus, response))
  }
  const submitIncident = (draft: NewIncidentDraft) => {
    if (!user) return
    void run(async () => { const created = await createIncident(draft, user.id, draft.imageFile); setNewIncidentOpen(false); setSelected(created) })
  }
  return <div className="page-wrap map-page"><SectionTitle eyebrow="MAPA DE OCORRÊNCIAS" title="O que está acontecendo perto de você?" description="Explore as demandas do RN, confira as confirmações da comunidade e as validações dos órgãos." action={<button className="primary-button map-fab" aria-label="Nova denúncia" onClick={() => requireCitizen() && setNewIncidentOpen(true)}><Plus size={19} /><span>Nova denúncia</span></button>} />
    <div className="map-toolbar"><label className="map-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar endereço ou município" /></label><select value={city} onChange={e => setCity(e.target.value)} aria-label="Filtrar por município"><option>Todas as cidades</option>{municipalities.map(m => <option key={m}>{m}</option>)}</select><button className="filter-button" onClick={() => { setFilter('Todas'); setCity('Todas as cidades'); setQuery('') }}><SlidersHorizontal size={16} /> Limpar filtros</button></div>
    <div className="filter-chips">{filters.map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? 'chip-selected' : ''}>{item}</button>)}</div>
    {error && <div className="management-notice" role="alert">{error} <button onClick={() => void refresh()}>Tentar novamente</button></div>}{busy && <p role="status">Salvando alteração…</p>}
    {loading ? <div className="empty-state" role="status">Carregando ocorrências do Supabase…</div> : <><IncidentMap occurrences={filtered} onSelect={setSelected} />
    <div className="results-heading"><div><h3>{filtered.length} ocorrências encontradas</h3><p>Selecione um marcador para confirmar a ocorrência ou consultar sua validação.</p></div><button className="sort-button"><ArrowDownWideNarrow size={16} /> Mais recentes</button></div>
    <OccurrenceList items={filtered} limit={filtered.length} onSelect={setSelected} /></>}
    <IncidentDetailsModal occurrence={selected} profile={profile} confirmed={Boolean(selected && confirmedIds.has(selected.id))} onClose={() => setSelected(null)} onConfirm={corroborate} onVerify={verify} />
    {newIncidentOpen && <NewIncidentModal onClose={() => setNewIncidentOpen(false)} onSubmit={submitIncident} />}
    <div className="trust-explainer">{filtered.filter(item => getCommunityTrust(item) === 'official-confirmed').length} validadas oficialmente · {filtered.filter(item => getCommunityTrust(item) === 'recognized').length} reconhecidas pela comunidade</div>
  </div>
}

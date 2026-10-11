import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, ExternalLink, Flag, Landmark, MessageCircleQuestion, Search, Send, UsersRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import { useAuth } from '../../auth/AuthContext'
import { listInstitutionProfiles } from '../../../services/supabaseService'
import { listOfficialRepresentatives, type OfficialRepresentative } from '../../../services/officialRepresentativesService'
import { listElectedOfficials, type ElectedOfficial } from '../../../services/electedOfficialsService'

type DirectoryFilter = 'todos' | 'politicos' | 'orgaos'
type DirectoryOffice = ElectedOfficial['office'] | 'Senador' | 'Deputado federal'
type OfficeFilter = 'todos' | 'presidente' | 'prefeito' | 'governador' | 'senador' | 'deputado-federal' | 'deputado-estadual' | 'deputado-distrital' | 'vereador'

type DirectoryPerson = {
  id: string
  name: string
  role: string
  municipality: string | null
  state: string
  avatarUrl?: string
  party?: string
  office?: string
  profileUrl?: string
  sourceUrl?: string
  electionYear?: number
  term?: string
  account: boolean
}

const officeTabs: Array<{ key: OfficeFilter; office: DirectoryOffice | null; label: string; Icon: typeof Flag }> = [
  { key: 'todos', office: null, label: 'Todos os cargos', Icon: UsersRound },
  { key: 'presidente', office: 'Presidente da República', label: 'Presidente', Icon: Flag },
  { key: 'prefeito', office: 'Prefeito', label: 'Prefeitos', Icon: Building2 },
  { key: 'governador', office: 'Governador', label: 'Governadores', Icon: Landmark },
  { key: 'senador', office: 'Senador', label: 'Senadores', Icon: UsersRound },
  { key: 'deputado-federal', office: 'Deputado federal', label: 'Deputados federais', Icon: Landmark },
  { key: 'deputado-estadual', office: 'Deputado estadual', label: 'Deputados estaduais', Icon: Landmark },
  { key: 'deputado-distrital', office: 'Deputado distrital', label: 'Deputados distritais', Icon: Landmark },
  { key: 'vereador', office: 'Vereador', label: 'Vereadores', Icon: UsersRound },
]

const officeOrder: Record<string, number> = {
  'Presidente da República': 0,
  Prefeito: 1,
  Governador: 2,
  Senador: 3,
  'Deputado federal': 4,
  'Deputado estadual': 5,
  'Deputado distrital': 6,
  Vereador: 7,
}

const presidentFallback: DirectoryPerson = {
  id: 'president-of-brazil',
  name: 'Luiz Inácio Lula da Silva',
  role: 'politico',
  municipality: 'Brasil',
  state: 'BR',
  office: 'Presidente da República',
  avatarUrl: '/data/official-photos/2022-280001607829.jpg',
  profileUrl: 'https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biografia-do-presidente',
  sourceUrl: 'https://dadosabertos.tse.jus.br/dataset/candidatos-2022',
  electionYear: 2022,
  term: '2023–2026',
  account: false,
}

const localOrganizations: Array<DirectoryPerson & { matchTerm: string }> = [
  {
    id: 'public-caern',
    name: 'CAERN',
    role: 'empresa',
    municipality: 'Rio Grande do Norte',
    state: 'RN',
    office: 'Concessionária de água e saneamento',
    profileUrl: 'https://www.caern.com.br/',
    account: false,
    matchTerm: 'caern',
  },
  {
    id: 'public-cosern',
    name: 'Neoenergia Cosern',
    role: 'empresa',
    municipality: 'Rio Grande do Norte',
    state: 'RN',
    office: 'Concessionária de energia elétrica',
    profileUrl: 'https://www.neoenergia.com/',
    account: false,
    matchTerm: 'cosern',
  },
]

function normalizeName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]/g, '')
}

function contactPath(person: DirectoryPerson, type: 'solicitacao' | 'questionamento') {
  const query = new URLSearchParams({ destinatario: person.id, tipo: type })
  return `/contato?${query.toString()}`
}

function mapElectedOfficial(person: ElectedOfficial): DirectoryPerson {
  return {
    id: person.id,
    name: person.name,
    role: 'politico',
    municipality: person.municipality ?? (person.office === 'Presidente da República' ? 'Brasil' : null),
    state: person.state,
    avatarUrl: person.photoUrl ?? undefined,
    party: person.party,
    office: person.office,
    profileUrl: person.profileUrl,
    sourceUrl: person.sourceUrl,
    electionYear: person.electionYear,
    term: person.term,
    account: false,
  }
}

function mapOfficialRepresentative(person: OfficialRepresentative): DirectoryPerson {
  return {
    id: person.id,
    name: person.name,
    role: 'politico',
    municipality: null,
    state: person.state,
    avatarUrl: person.photoUrl ?? undefined,
    party: person.party,
    office: person.office,
    profileUrl: person.profileUrl,
    sourceUrl: person.profileUrl,
    account: false,
  }
}

function DirectoryCard({ person }: { person: DirectoryPerson }) {
  const [imageFailed, setImageFailed] = useState(false)
  const isOrganization = person.role === 'empresa'
  const profilePath = person.account
    ? isOrganization ? `/representantes/${person.id}` : `/politicos/${person.id}`
    : person.profileUrl
  const initials = person.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const isExternalProfile = !person.account && Boolean(profilePath)

  return <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
    <div className="civic-directory-photo-frame grid aspect-[4/3] place-items-center overflow-hidden bg-slate-100 text-4xl font-bold text-blue-900">
      {person.avatarUrl && !imageFailed
        ? <img src={person.avatarUrl} alt={`Foto de ${person.name}`} className="h-full w-full object-contain" loading="lazy" onError={() => setImageFailed(true)} />
        : <span aria-hidden="true">{initials}</span>}
    </div>
    <div className="p-3">
      <h3 className="text-center font-semibold text-slate-900">{person.name}</h3>
      <p className="mt-1 text-center text-sm text-slate-500">{person.office ?? (isOrganization ? 'Órgão ou concessionária' : 'Representante público')}{person.party ? ` · ${person.party}` : ''}</p>
      <p className="mt-1 text-center text-xs text-slate-500">{person.municipality ?? person.state}{person.municipality && person.state && person.state !== 'BR' ? ` · ${person.state}` : ''}</p>
      {person.term && <p className="mt-1 text-center text-xs text-slate-500">Mandato {person.term} · eleito em {person.electionYear}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {profilePath && <a href={profilePath} className="secondary-action" target={isExternalProfile ? '_blank' : undefined} rel={isExternalProfile ? 'noreferrer' : undefined}>
          {person.sourceUrl?.includes('dadosabertos.tse.jus.br') ? 'Fonte eleitoral TSE' : person.account ? 'Ver perfil' : 'Perfil oficial'}{isExternalProfile && <ExternalLink size={13} />}
        </a>}
        {person.sourceUrl && person.sourceUrl !== profilePath && <a href={person.sourceUrl} className="secondary-action" target="_blank" rel="noreferrer">Dados da eleição <ExternalLink size={13} /></a>}
        {person.account && <><Link to={contactPath(person, 'solicitacao')} className="primary-button"><Send size={13} /> Solicitação</Link><Link to={contactPath(person, 'questionamento')} className="secondary-action"><MessageCircleQuestion size={13} /> Questionamento</Link></>}
      </div>
      {!person.account && isOrganization && <p className="mt-3 text-center text-xs text-slate-500">Para receber protocolos e responder aqui, a instituição precisa ter cadastro na plataforma.</p>}
    </div>
  </article>
}

export function PoliticiansPage() {
  const [filter, setFilter] = useState<DirectoryFilter>('todos')
  const [query, setQuery] = useState('')
  const [selectedState, setSelectedState] = useState('RN')
  const [people, setPeople] = useState<DirectoryPerson[]>([])
  const [officialWarnings, setOfficialWarnings] = useState<string[]>([])
  const [profileStateWarning, setProfileStateWarning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [searchParams, setSearchParams] = useSearchParams()
  const { profile } = useAuth()
  const canManage = profile?.role === 'politico' || profile?.role === 'empresa' || profile?.role === 'admin'
  const pageSize = 24
  const selectedOffice = officeTabs.find(tab => tab.key === searchParams.get('cargo'))?.key ?? 'todos'
  const selectedPanelTabId = filter === 'orgaos' ? 'directory-filter-orgaos' : `office-tab-${selectedOffice}`

  useEffect(() => {
    if (profile?.state) setSelectedState(profile.state.toUpperCase())
  }, [profile?.state])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void Promise.allSettled([listInstitutionProfiles(), listOfficialRepresentatives(), listElectedOfficials()]).then(([profilesResult, officialsResult, electedResult]) => {
      if (!active) return
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value : []
      const officialData = officialsResult.status === 'fulfilled' ? officialsResult.value : { representatives: [], warnings: [] }
      const electedData = electedResult.status === 'fulfilled' ? electedResult.value : { officials: [], warnings: [] }
      setProfileStateWarning(profiles.some(person => person.stateFallback))

      const accountByName = new Map(profiles.filter(person => person.role === 'politico').map(person => [normalizeName(person.name), person]))
      const officialPeople: DirectoryPerson[] = [
        ...electedData.officials.map(mapElectedOfficial),
        ...officialData.representatives.map(mapOfficialRepresentative),
      ].map(person => {
        const registered = accountByName.get(normalizeName(person.name))
        return registered ? {
          ...person,
          id: registered.id,
          municipality: person.municipality ?? registered.municipality,
          state: person.state || registered.state,
          avatarUrl: person.avatarUrl ?? registered.avatarUrl,
          account: true,
        } : person
      })

      const president = officialPeople.find(person => person.office === 'Presidente da República') ?? presidentFallback
      const otherOfficialPeople = officialPeople.filter(person => person.office !== 'Presidente da República')
      const matchedAccountIds = new Set(officialPeople.filter(person => person.account).map(person => person.id))
      const registeredProfiles: DirectoryPerson[] = profiles
        .filter(person => person.role === 'empresa' || !matchedAccountIds.has(person.id))
        .map(person => ({ ...person, state: person.state || 'RN', account: true }))
      const listedOrganizations = localOrganizations
        .filter(organization => !profiles.some(person => person.role === 'empresa' && person.name.toLocaleLowerCase('pt-BR').includes(organization.matchTerm)))
        .map(({ matchTerm: _matchTerm, ...organization }) => organization)
      const directory = [president, ...otherOfficialPeople, ...listedOrganizations, ...registeredProfiles]
      directory.sort((left, right) =>
        (officeOrder[left.office ?? ''] ?? 8) - (officeOrder[right.office ?? ''] ?? 8)
        || (left.state || '').localeCompare(right.state || '', 'pt-BR')
        || (left.municipality || '').localeCompare(right.municipality || '', 'pt-BR')
        || left.name.localeCompare(right.name, 'pt-BR'),
      )
      setPeople(directory)
      setOfficialWarnings([...officialData.warnings, ...electedData.warnings])
      if (profilesResult.status === 'rejected') {
        setError(profilesResult.reason instanceof Error ? profilesResult.reason.message : 'Não foi possível carregar os perfis institucionais cadastrados.')
      }
      if (officialsResult.status === 'rejected') {
        setOfficialWarnings(previous => [...previous, officialsResult.reason instanceof Error ? officialsResult.reason.message : 'Não foi possível carregar os representantes federais oficiais.'])
      }
      if (electedResult.status === 'rejected') {
        setOfficialWarnings(previous => [...previous, electedResult.reason instanceof Error ? electedResult.reason.message : 'Não foi possível carregar os eleitos do TSE.'])
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const availableStates = useMemo(
    () => [...new Set(people.map(person => person.state).filter(state => /^[A-Z]{2}$/.test(state) && state !== 'BR'))].sort(),
    [people],
  )
  const filtered = useMemo(() => people.filter(person => {
    const kindMatches = filter === 'todos' || (filter === 'orgaos' ? person.role === 'empresa' : person.role === 'politico')
    const stateMatches = person.office === 'Presidente da República' || !selectedState || person.state === selectedState
    const officeMatches = filter === 'orgaos' || selectedOffice === 'todos' || officeTabs.find(tab => tab.key === selectedOffice)?.office === person.office
    const matchesSearch = `${person.name} ${person.role} ${person.office ?? ''} ${person.party ?? ''} ${person.municipality ?? ''} ${person.state}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))
    return kindMatches && stateMatches && officeMatches && matchesSearch
  }), [people, filter, selectedState, selectedOffice, query])
  const visiblePeople = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pageCount = Math.ceil(filtered.length / pageSize)
  const selectedStateLabel = selectedState ? ` · ${selectedState}` : ' · todos os estados'

  useEffect(() => setPage(1), [filter, query, selectedState, selectedOffice])

  function selectOffice(office: OfficeFilter) {
    const next = new URLSearchParams(searchParams)
    if (office === 'todos') next.delete('cargo')
    else next.set('cargo', office)
    setSearchParams(next)
  }

  return <div className="page-wrap civic-directory">
    <div className="directory-tabs"><Link className="directory-tab active" to="/representantes"><UsersRound size={16} /> Diretório</Link>{canManage && <Link className="directory-tab" to="/gestao"><Building2 size={16} /> Painel de gestão</Link>}</div>
    <SectionTitle eyebrow="REPRESENTAÇÃO E SERVIÇOS" title="Representantes e concessionárias" description="Consulte os eleitos por cargo, estado e município. O Presidente aparece em qualquer estado selecionado." />
    <label className="map-search civic-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar nome, partido, município ou cargo" /></label>
    <div className="representative-directory-controls">
      <div className="directory-filter-tabs" role="tablist" aria-label="Filtrar diretório">{([['todos', 'Todos'], ['politicos', 'Políticos'], ['orgaos', 'Órgãos e concessionárias']] as const).map(([key, label]) => <button type="button" id={`directory-filter-${key}`} role="tab" aria-selected={filter === key} aria-controls="politician-results" key={key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <label className="representative-state-filter">Estado
        <select value={selectedState} onChange={event => setSelectedState(event.target.value)}>
          <option value="">Todos os estados</option>
          {availableStates.map(state => <option key={state} value={state}>{state}</option>)}
        </select>
      </label>
    </div>
    {filter !== 'orgaos' && <div className="civic-office-section">
      <div className="civic-office-heading"><strong>Cargos públicos</strong><span>Selecione um card para abrir a lista daquele cargo.</span></div>
      <div className="civic-office-grid" role="tablist" aria-label="Filtrar políticos por cargo">
        {officeTabs.map(({ key, office, label, Icon }) => {
          const count = office
            ? people.filter(person => person.office === office && (office === 'Presidente da República' || !selectedState || person.state === selectedState)).length
            : people.filter(person => person.role === 'politico' && (person.office === 'Presidente da República' || !selectedState || person.state === selectedState)).length
          return <button type="button" role="tab" id={`office-tab-${key}`} aria-selected={selectedOffice === key} aria-controls="politician-results" key={key} className={`civic-office-card${selectedOffice === key ? ' selected' : ''}`} onClick={() => selectOffice(key)}>
            <span className="civic-office-icon"><Icon size={19} /></span>
            <span className="civic-office-label">{label}</span>
            <strong>{loading ? '—' : count.toLocaleString('pt-BR')}</strong>
            <ArrowRight className="civic-office-arrow" size={15} aria-hidden="true" />
          </button>
        })}
      </div>
    </div>}
    <div className="directory-summary"><strong>{filter === 'orgaos' ? 'Órgãos e concessionárias' : selectedOffice === 'todos' ? 'Representantes eleitos e cadastrados' : officeTabs.find(tab => tab.key === selectedOffice)?.label}{selectedStateLabel}</strong><span>{loading ? 'Carregando…' : `${filtered.length.toLocaleString('pt-BR')} perfis encontrados`}</span></div>
    {error && <p role="alert" className="management-notice">{error}<button className="retry-action" onClick={() => window.location.reload()}>Tentar novamente</button></p>}
    {profileStateWarning && <p role="status" className="management-notice">A migration de UF ainda não está aplicada no Supabase. Os perfis institucionais estão temporariamente agrupados em RN; aplique as migrations pendentes para habilitar o filtro por estado correto.</p>}
    {officialWarnings.length > 0 && <p role="status" className="management-notice">Algumas fontes oficiais estão indisponíveis: {officialWarnings.join(' ')}</p>}
    {loading ? <div className="empty-state" role="status">Carregando políticos e perfis cadastrados…</div> : filtered.length
      ? <section id="politician-results" className="politician-grid civic-directory-grid" role="tabpanel" aria-labelledby={`office-tab-${selectedOffice}`}>
        {visiblePeople.map(person => <DirectoryCard key={person.id} person={person} />)}
      </section>
      : <div id="politician-results" className="empty-state" role="tabpanel" aria-labelledby={selectedPanelTabId}>Nenhum perfil corresponde ao cargo, estado e busca selecionados. Os órgãos e concessionárias aparecem quando completam o cadastro institucional.</div>}
    {pageCount > 1 && <nav className="directory-pagination" aria-label="Paginação de representantes">
      <button type="button" className="secondary-action" disabled={page === 1} onClick={() => setPage(value => value - 1)}><ArrowLeft size={14} /> Anterior</button>
      <span>Página {page.toLocaleString('pt-BR')} de {pageCount.toLocaleString('pt-BR')}</span>
      <button type="button" className="secondary-action" disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Próxima <ArrowRight size={14} /></button>
    </nav>}
    <p className="representative-contact-note"><BadgeCheck size={15} /> Os registros do TSE refletem o resultado oficial da eleição e podem não incluir afastamentos ou substituições posteriores. Os dados de 2022 cobrem mandatos até dezembro de 2026; os de 2024, até dezembro de 2028. Só perfis cadastrados na plataforma podem receber solicitações e questionamentos.</p>
  </div>
}

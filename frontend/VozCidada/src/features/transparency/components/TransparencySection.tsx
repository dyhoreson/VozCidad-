import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpRight, Building2, ExternalLink, FileCheck2, Landmark, LoaderCircle, RefreshCw, Wallet } from 'lucide-react'
import { fetchAllFederalDeputies, fetchDeputyExpenses, fetchRecentProposals, fetchSenators, type DeputyExpense, type FederalDeputy, type LegislativeProposal, type Senator } from '../../../services/legislativeService'
import { fetchLocalTransparencyRecords, getLocalTransparencySources, type LocalTransparencyRecord, type LocalTransparencySource, type LocalTransparencySourceId } from '../../../services/localTransparencyService'
import { fetchNatalBudgetReport, fetchPublicContracts, fetchPublicProcurements, fetchPublicTransfers, isPortalTransparencyConfigured, type PublicContract, type PublicProcurement, type PublicTransfer, type SiconfiBudgetReport } from '../../../services/transparencyService'
import { PresidentMandateCard } from './PresidentMandateCard'

type ResourceState<T> = { data: T; loading: boolean; error: string }
const initialState = <T,>(data: T): ResourceState<T> => ({ data, loading: true, error: '' })

async function loadResource<T>(
  request: () => Promise<T>,
  update: Dispatch<SetStateAction<ResourceState<T>>>,
  isActive: () => boolean,
) {
  update(previous => ({ ...previous, loading: true, error: '' }))
  try {
    const data = await request()
    if (isActive()) update({ data, loading: false, error: '' })
  } catch (cause) {
    if (isActive()) update(previous => ({
      ...previous,
      loading: false,
      error: cause instanceof Error ? cause.message : 'Não foi possível carregar os dados desta fonte.',
    }))
  }
}

function money(value: number | null): string {
  return value === null ? 'Valor não informado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function shortDate(value: string | null): string {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

function ExternalLinkButton({ href, children }: { href: string; children: string }) {
  return <a className="open-data-link" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13} /></a>
}

function SectionStatus<T>({ state, empty, onRetry }: { state: ResourceState<T[]>; empty: string; onRetry?: () => void }) {
  if (state.loading) return <p className="open-data-status" role="status"><LoaderCircle className="spin" size={15} /> Consultando fonte oficial…</p>
  if (state.error) return <div className="open-data-error" role="alert">
    <span>{state.error}{state.data.length > 0 && ' Os últimos dados carregados continuam visíveis e podem estar desatualizados.'}</span>
    {onRetry && <button type="button" className="open-data-text-action" onClick={onRetry}>Tentar novamente</button>}
  </div>
  if (state.data.length === 0) return <p className="open-data-empty">{empty}</p>
  return null
}

function latestPublishedPeriod(now: Date) {
  const month = now.getMonth()
  return month < 2
    ? { year: now.getFullYear() - 1, period: 6 }
    : { year: now.getFullYear(), period: Math.floor(month / 2) }
}

export function TransparencySection() {
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedState, setSelectedState] = useState('RN')
  const [deputyPage, setDeputyPage] = useState(1)
  const [senatorPage, setSenatorPage] = useState(1)
  const [deputies, setDeputies] = useState(() => initialState<FederalDeputy[]>([]))
  const [senators, setSenators] = useState(() => initialState<Senator[]>([]))
  const [proposals, setProposals] = useState(() => initialState<LegislativeProposal[]>([]))
  const [budget, setBudget] = useState<ResourceState<SiconfiBudgetReport | null>>({ data: null, loading: true, error: '' })
  const [expenses, setExpenses] = useState<Record<number, ResourceState<DeputyExpense[]>>>({})
  const [expandedExpenses, setExpandedExpenses] = useState<Record<number, boolean>>({})
  const [contracts, setContracts] = useState<ResourceState<PublicContract[]>>({ data: [], loading: false, error: '' })
  const [procurements, setProcurements] = useState<ResourceState<PublicProcurement[]>>({ data: [], loading: false, error: '' })
  const [transfers, setTransfers] = useState<ResourceState<PublicTransfer[]>>({ data: [], loading: false, error: '' })
  const [portalRequested, setPortalRequested] = useState(false)
  const [localData, setLocalData] = useState<Partial<Record<LocalTransparencySourceId, ResourceState<LocalTransparencyRecord[]>>>>({})
  const sources = getLocalTransparencySources()
  const pageSize = 12
  const filteredDeputies = useMemo(
    () => deputies.data.filter(deputy => !selectedState || deputy.state.toUpperCase() === selectedState),
    [deputies.data, selectedState],
  )
  const filteredSenators = useMemo(
    () => senators.data.filter(senator => !selectedState || senator.state.toUpperCase() === selectedState),
    [senators.data, selectedState],
  )
  const visibleDeputies = filteredDeputies.slice((deputyPage - 1) * pageSize, deputyPage * pageSize)
  const visibleSenators = filteredSenators.slice((senatorPage - 1) * pageSize, senatorPage * pageSize)
  const scopeLabel = selectedState || 'Brasil'

  useEffect(() => {
    let active = true
    const isActive = () => active
    const period = latestPublishedPeriod(new Date())
    void loadResource(fetchAllFederalDeputies, setDeputies, isActive)
    void loadResource(() => fetchSenators(), setSenators, isActive)
    void loadResource(() => fetchRecentProposals(8), setProposals, isActive)
    setBudget(previous => ({ ...previous, loading: true, error: '' }))
    void fetchNatalBudgetReport(period).then(data => {
      if (isActive()) setBudget({ data, loading: false, error: '' })
    }).catch(cause => {
      if (isActive()) setBudget(previous => ({
        ...previous,
        loading: false,
        error: cause instanceof Error ? cause.message : 'Não foi possível consultar o SICONFI.',
      }))
    })
    return () => { active = false }
  }, [reloadKey])

  const toggleExpenses = useCallback(async (deputyId: number) => {
    const current = expenses[deputyId]
    if (current?.loading) {
      setExpandedExpenses(previous => ({ ...previous, [deputyId]: !previous[deputyId] }))
      return
    }
    if (current && !current.error) {
      setExpandedExpenses(previous => ({ ...previous, [deputyId]: !previous[deputyId] }))
      return
    }

    setExpandedExpenses(previous => ({ ...previous, [deputyId]: true }))
    setExpenses(previous => ({ ...previous, [deputyId]: { data: [], loading: true, error: '' } }))
    try {
      const data = await fetchDeputyExpenses(deputyId, { limit: 5 })
      setExpenses(previous => ({ ...previous, [deputyId]: { data, loading: false, error: '' } }))
    } catch (cause) {
      setExpenses(previous => ({
        ...previous,
        [deputyId]: { data: [], loading: false, error: cause instanceof Error ? cause.message : 'Não foi possível consultar as despesas.' },
      }))
    }
  }, [expenses])

  const loadPortalRecords = useCallback(() => {
    if (!isPortalTransparencyConfigured()) return
    setPortalRequested(true)
    void loadResource(() => fetchPublicContracts({ page: 1 }), setContracts, () => true)
    void loadResource(() => fetchPublicProcurements({ page: 1 }), setProcurements, () => true)
    void loadResource(() => fetchPublicTransfers({ page: 1, municipalityCode: '2408102' }), setTransfers, () => true)
  }, [])

  const loadLocalSource = useCallback((source: LocalTransparencySource) => {
    setLocalData(previous => ({ ...previous, [source.id]: { data: previous[source.id]?.data ?? [], loading: true, error: '' } }))
    void fetchLocalTransparencyRecords(source.id).then(data => {
      setLocalData(previous => ({ ...previous, [source.id]: { data, loading: false, error: '' } }))
    }).catch(cause => {
      setLocalData(previous => {
        const current = previous[source.id]
        return {
          ...previous,
          [source.id]: {
            data: current?.data ?? [],
            loading: false,
            error: cause instanceof Error ? cause.message : 'Não foi possível consultar esta fonte. Tente novamente.',
          },
        }
      })
    })
  }, [])

  return <section className="transparency-panel open-data-section" aria-labelledby="open-data-title">
    <div className="transparency-panel-heading open-data-heading">
      <div>
        <span className="eyebrow">DADOS ABERTOS · FONTES OFICIAIS</span>
        <h2 id="open-data-title">Legislativo e gastos públicos</h2>
        <p>Consultas diretas à Câmara, Senado, Tesouro Nacional e portais de transparência.</p>
      </div>
      <button className="open-data-refresh" type="button" disabled={deputies.loading || senators.loading || proposals.loading || budget.loading} onClick={() => setReloadKey(value => value + 1)} aria-label="Atualizar dados legislativos">
        <RefreshCw size={15} /> Atualizar
      </button>
    </div>

    <div className="open-data-subheading"><Landmark size={16} /><div><h3>Representantes federais</h3><p>Presidência, Câmara e Senado · cadastros das fontes oficiais.</p></div>
      <label className="open-data-state-filter"><span>Filtrar por estado</span><select value={selectedState} onChange={event => {
        setSelectedState(event.target.value)
        setDeputyPage(1)
        setSenatorPage(1)
      }}><option value="RN">Rio Grande do Norte</option><option value="">Todos os estados</option></select></label>
    </div>
    <PresidentMandateCard />
    <div className="open-data-grid">
      <section className="open-data-card">
        <div className="open-data-card-title"><div><h4>Deputados federais · {scopeLabel}</h4><p>{filteredDeputies.length.toLocaleString('pt-BR')} representantes encontrados</p></div><ExternalLinkButton href="https://dadosabertos.camara.leg.br/">API Dados Abertos</ExternalLinkButton></div>
        <SectionStatus state={deputies} empty={`A Câmara não retornou deputados para ${scopeLabel}.`} onRetry={() => setReloadKey(value => value + 1)} />
        <div className="open-data-person-list">{visibleDeputies.map(deputy => {
          const expenseState = expenses[deputy.id]
          return <article className="open-data-person" key={deputy.id}>
            {deputy.photoUrl ? <img src={deputy.photoUrl} alt="" loading="lazy" /> : <span className="open-data-avatar">{deputy.name.slice(0, 1)}</span>}
            <div className="open-data-person-main"><strong>{deputy.name}</strong><span>{deputy.party} · {deputy.state}</span></div>
            <a className="open-data-icon-link" href={deputy.profileUrl} target="_blank" rel="noreferrer" aria-label={`Perfil de ${deputy.name}`}><ArrowUpRight size={15} /></a>
            <button className="open-data-expense-toggle" type="button" onClick={() => void toggleExpenses(deputy.id)} aria-expanded={Boolean(expandedExpenses[deputy.id])}>
              <Wallet size={13} /> {expenseState?.error ? 'Tentar despesas novamente' : 'Despesas'}
            </button>
            {expenseState && expandedExpenses[deputy.id] && <div className="open-data-expenses">
              {expenseState.loading && <span className="open-data-status"><LoaderCircle className="spin" size={13} /> Consultando despesas…</span>}
              {expenseState.error && <span className="open-data-error" role="alert">{expenseState.error}</span>}
              {expenseState.data.map(expense => <div className="open-data-expense" key={expense.id}>
                <span><strong>{expense.category}</strong><small>{expense.supplier} · {shortDate(expense.documentDate)}</small></span>
                <b>{money(expense.amount)}</b>
                {expense.documentUrl && <a href={expense.documentUrl} target="_blank" rel="noreferrer" aria-label="Abrir comprovante da despesa"><ExternalLink size={13} /></a>}
              </div>)}
              {!expenseState.loading && !expenseState.error && expenseState.data.length === 0 && <span className="open-data-empty">Nenhuma despesa encontrada para o ano atual.</span>}
            </div>}
          </article>
        })}</div>
        {filteredDeputies.length > pageSize && <div className="open-data-pagination"><button type="button" disabled={deputyPage === 1} onClick={() => setDeputyPage(page => page - 1)}>Anterior</button><span>Página {deputyPage} de {Math.ceil(filteredDeputies.length / pageSize)}</span><button type="button" disabled={deputyPage >= Math.ceil(filteredDeputies.length / pageSize)} onClick={() => setDeputyPage(page => page + 1)}>Próxima</button></div>}
      </section>

      <section className="open-data-card">
        <div className="open-data-card-title"><div><h4>Senadores · {scopeLabel}</h4><p>{filteredSenators.length.toLocaleString('pt-BR')} representantes encontrados</p></div><ExternalLinkButton href="https://www25.senado.leg.br/web/senadores">Senado Federal</ExternalLinkButton></div>
        <SectionStatus state={senators} empty={`O Senado não retornou parlamentares para ${scopeLabel}.`} onRetry={() => setReloadKey(value => value + 1)} />
        <div className="open-data-person-list">{visibleSenators.map(senator => <article className="open-data-person" key={senator.id}>
          {senator.photoUrl ? <img src={senator.photoUrl} alt="" loading="lazy" /> : <span className="open-data-avatar">{senator.name.slice(0, 1)}</span>}
          <div className="open-data-person-main"><strong>{senator.name}</strong><span>{senator.party} · {senator.state}</span></div>
          <a className="open-data-icon-link" href={senator.profileUrl} target="_blank" rel="noreferrer" aria-label={`Perfil de ${senator.name}`}><ArrowUpRight size={15} /></a>
        </article>)}</div>
        {filteredSenators.length > pageSize && <div className="open-data-pagination"><button type="button" disabled={senatorPage === 1} onClick={() => setSenatorPage(page => page - 1)}>Anterior</button><span>Página {senatorPage} de {Math.ceil(filteredSenators.length / pageSize)}</span><button type="button" disabled={senatorPage >= Math.ceil(filteredSenators.length / pageSize)} onClick={() => setSenatorPage(page => page + 1)}>Próxima</button></div>}
      </section>
    </div>

    <section className="open-data-card open-data-proposals">
      <div className="open-data-card-title"><div><h4>Proposições recentes</h4><p>Matérias legislativas federais ordenadas por data de apresentação.</p></div><FileCheck2 size={17} /></div>
      <SectionStatus state={proposals} empty="Não há proposições recentes disponíveis." onRetry={() => setReloadKey(value => value + 1)} />
      <div className="open-data-proposal-list">{proposals.data.map(proposal => <article className="open-data-proposal" key={proposal.id}>
        <span className="open-data-proposal-type">{proposal.kind} {proposal.number}/{proposal.year}</span>
        <p>{proposal.summary}</p>
        <small>{shortDate(proposal.presentedAt)}</small>
        <ExternalLinkButton href={proposal.url}>Ver na Câmara</ExternalLinkButton>
        <Link className="open-data-link" to={`/votacoes/camara-${proposal.id}`}>Votar nesta proposta</Link>
      </article>)}</div>
    </section>

    <section className="open-data-card open-data-budget">
      <div className="open-data-card-title"><div><h4>Receitas e execução orçamentária de Natal</h4><p>RREO · Prefeitura Municipal · exercício {budget.data?.year ?? latestPublishedPeriod(new Date()).year}, bimestre {budget.data?.period ?? latestPublishedPeriod(new Date()).period}.</p></div><Wallet size={17} /></div>
      {budget.loading && <p className="open-data-status" role="status"><LoaderCircle className="spin" size={15} /> Consultando SICONFI…</p>}
      {budget.error && <div className="open-data-error" role="alert">
        <span>{budget.error}{budget.data && ' Os últimos dados carregados continuam visíveis e podem estar desatualizados.'}</span>
        <button type="button" className="open-data-text-action" onClick={() => setReloadKey(value => value + 1)}>Tentar novamente</button>
      </div>}
      {budget.data && <><p className="open-data-data-source">{budget.data.entity} · valores em reais</p>
        {budget.data.revenues.length ? <div className="open-data-revenue-list">{budget.data.revenues.slice(0, 6).map(revenue => <article key={revenue.accountCode}>
          <span><strong>{revenue.account}</strong><small>Arrecadado até o bimestre · previsão atualizada {money(revenue.forecast)}</small></span>
          <b>{money(revenue.accumulated)}</b>
        </article>)}</div> : <p className="open-data-empty">O relatório não contém valores de receita para este período.</p>}
      </>}
      <ExternalLinkButton href="https://siconfi.tesouro.gov.br/">Consultar SICONFI</ExternalLinkButton>
    </section>

    <section className="open-data-card">
      <div className="open-data-card-title"><div><h4>Contratos, licitações e repasses</h4><p>Portal da Transparência do Governo Federal · beneficiário filtrado para Natal quando aplicável.</p></div><Building2 size={17} /></div>
      {!isPortalTransparencyConfigured() && <p className="open-data-configuration">A consulta da CGU precisa do backend do Voz Cidadã. Configure <code>VITE_API_BASE_URL</code> no frontend e a chave da API como segredo no servidor; ela não deve ser exposta no navegador.</p>}
      {isPortalTransparencyConfigured() && <button type="button" className="open-data-action" onClick={loadPortalRecords} disabled={contracts.loading || procurements.loading || transfers.loading}>
        {contracts.loading || procurements.loading || transfers.loading ? <LoaderCircle className="spin" size={15} /> : <ArrowDownToLine size={15} />}
        {portalRequested ? 'Atualizar consultas' : 'Carregar dados oficiais'}
      </button>}
      {isPortalTransparencyConfigured() && portalRequested && <div className="open-data-grid open-data-records">
        <PortalRecordList title="Contratos" records={contracts.data.map(record => ({ id: record.id, title: record.number, description: `${record.agency} · ${record.supplier}`, amount: record.amount, url: record.url }))} state={contracts} empty="Nenhum contrato retornado." />
        <PortalRecordList title="Licitações" records={procurements.data.map(record => ({ id: record.id, title: `${record.number} · ${record.modality}`, description: `${record.agency} · ${record.status}`, amount: record.estimatedAmount, url: record.url }))} state={procurements} empty="Nenhuma licitação retornada." />
        <PortalRecordList title="Repasses" records={transfers.data.map(record => ({ id: record.id, title: record.recipient, description: `${record.agency} · ${record.description}`, amount: record.amount, url: record.url }))} state={transfers} empty="Nenhum repasse retornado." />
      </div>}
      <ExternalLinkButton href="https://portaldatransparencia.gov.br/">Abrir Portal da Transparência</ExternalLinkButton>
    </section>

    <section className="open-data-card">
      <div className="open-data-card-title"><div><h4>Fontes locais do Rio Grande do Norte</h4><p>Consultas a fontes oficiais municipais, estaduais e legislativas.</p></div><Building2 size={17} /></div>
      <div className="open-data-local-list">{sources.map((source: LocalTransparencySource) => {
        const state = localData[source.id]
        return <article key={source.id} className="open-data-local-source">
          <div><strong>{source.name}</strong><p>{source.description}</p></div>
          {source.apiUrl ? <button type="button" className="open-data-text-action" onClick={() => loadLocalSource(source)} disabled={state?.loading}>
            {state?.loading ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />} {state?.error ? 'Tentar novamente' : 'Carregar API'}
          </button> : <span className="open-data-adapter-label">Adaptador não configurado</span>}
          <ExternalLinkButton href={source.portalUrl}>Portal oficial</ExternalLinkButton>
          {state?.error && <p className="open-data-error" role="alert">{state.error}{state.data.length > 0 && ' Os últimos dados carregados continuam visíveis e podem estar desatualizados.'}</p>}
          {state && !state.loading && state.data.length > 0 && <ul className="open-data-local-records">{state.data.slice(0, 3).map(record => <li key={record.id}>
            <strong>{record.title}</strong><span>{record.matchedQuery ? `Correspondência na busca por “${record.matchedQuery}” · ` : ''}{record.description} · {shortDate(record.date)}</span>
            {record.sourceUrl && <a href={record.sourceUrl} target="_blank" rel="noreferrer">Detalhes</a>}
          </li>)}</ul>}
        </article>
      })}</div>
      <p className="open-data-configuration">A Assembleia disponibiliza busca pública de documentos; os links abrem as fontes oficiais, pois consultas detalhadas de dados financeiros exigem acesso autorizado. Para Natal, o endpoint informado é de folha de pagamento e não retorna uma resposta JSON utilizável; o portal municipal segue disponível pelo link oficial.</p>
    </section>

    <p className="open-data-disclaimer">Os dados são fornecidos pelas APIs públicas de origem. Valores e cadastros podem ter atraso de publicação; em caso de divergência, consulte o portal oficial vinculado em cada seção.</p>
  </section>
}

type PortalDisplayRecord = { id: string; title: string; description: string; amount: number | null; url: string | null }

function PortalRecordList({
  title,
  records,
  state,
  empty,
}: {
  title: string
  records: PortalDisplayRecord[]
  state: { loading: boolean; error: string }
  empty: string
}) {
  return <section className="open-data-record-group">
    <h5>{title}</h5>
    {state.loading && <p className="open-data-status" role="status"><LoaderCircle className="spin" size={13} /> Consultando API…</p>}
    {state.error && <p className="open-data-error" role="alert">{state.error}</p>}
    {!state.loading && !state.error && records.length === 0 && <p className="open-data-empty">{empty}</p>}
    {records.map(record => <article className="open-data-record" key={record.id}>
      <div><strong>{record.title}</strong><span>{record.description}</span></div>
      <b>{money(record.amount)}</b>
      {record.url && <a href={record.url} target="_blank" rel="noreferrer" aria-label={`Detalhes de ${record.title}`}><ExternalLink size={13} /></a>}
    </article>)}
  </section>
}

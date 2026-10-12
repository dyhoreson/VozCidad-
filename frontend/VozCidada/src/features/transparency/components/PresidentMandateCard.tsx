import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight, BookOpen, ChevronDown, ChevronUp, ExternalLink, FileText, Landmark, LoaderCircle, Wallet } from 'lucide-react'
import { fetchExecutiveAnnualExpenses, fetchFederalAmendments, isPortalTransparencyConfigured, type ExecutiveAnnualExpense, type FederalAmendment } from '../../../services/transparencyService'

type DataState<T> = { data: T[]; loading: boolean; error: string }
const emptyState = <T,>(): DataState<T> => ({ data: [], loading: false, error: '' })

function currency(value: number | null): string {
  return value === null ? 'Não informado' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a className="open-data-link" href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13} /></a>
}

function MandateDataList<T>({
  state,
  empty,
  children,
}: {
  state: DataState<T>
  empty: string
  children: (item: T, index: number) => ReactNode
}) {
  if (state.loading) return <p className="open-data-status" role="status"><LoaderCircle className="spin" size={14} /> Consultando a fonte oficial…</p>
  if (state.error) return <p className="open-data-error" role="alert">{state.error}</p>
  if (!state.data.length) return <p className="open-data-empty">{empty}</p>
  return <div className="president-mandate-list">{state.data.slice(0, 6).map(children)}</div>
}

export function PresidentMandateCard() {
  const [expanded, setExpanded] = useState(false)
  const [expenses, setExpenses] = useState<DataState<ExecutiveAnnualExpense>>(emptyState)
  const [amendments, setAmendments] = useState<DataState<FederalAmendment>>(emptyState)
  const [requested, setRequested] = useState(false)
  const year = new Date().getFullYear()

  async function loadMandateData() {
    if (!isPortalTransparencyConfigured()) return
    setRequested(true)
    setExpenses(previous => ({ ...previous, loading: true, error: '' }))
    setAmendments(previous => ({ ...previous, loading: true, error: '' }))

    const [expenseResult, amendmentResult] = await Promise.allSettled([
      fetchExecutiveAnnualExpenses(year),
      fetchFederalAmendments(year),
    ])
    if (expenseResult.status === 'fulfilled') {
      setExpenses({ data: expenseResult.value, loading: false, error: '' })
    } else {
      setExpenses(previous => ({
        ...previous,
        loading: false,
        error: expenseResult.reason instanceof Error ? expenseResult.reason.message : 'Não foi possível consultar as despesas da Presidência.',
      }))
    }
    if (amendmentResult.status === 'fulfilled') {
      setAmendments({ data: amendmentResult.value, loading: false, error: '' })
    } else {
      setAmendments(previous => ({
        ...previous,
        loading: false,
        error: amendmentResult.reason instanceof Error ? amendmentResult.reason.message : 'Não foi possível consultar as emendas parlamentares.',
      }))
    }
  }

  function toggleMandate() {
    const opening = !expanded
    setExpanded(opening)
    if (opening && !requested) void loadMandateData()
  }

  return <section className="open-data-card open-data-president" aria-labelledby="president-title">
    <div className="open-data-card-title">
      <div><h4 id="president-title">Presidente da República</h4><p>Cargo nacional do Poder Executivo · mandato 2023–2027.</p></div>
      <Landmark size={17} />
    </div>
    <article className="open-data-person">
      <span className="open-data-avatar">BR</span>
      <div className="open-data-person-main"><strong>Luiz Inácio Lula da Silva</strong><span>Presidente da República Federativa do Brasil</span></div>
      <div className="president-actions">
        <SourceLink href="https://www.gov.br/planalto/pt-br/conheca-a-presidencia/biografia-do-presidente">Biografia oficial</SourceLink>
        <button className="open-data-link president-details-toggle" type="button" onClick={toggleMandate} aria-expanded={expanded} aria-controls="president-mandate-details">
          {expanded ? 'Ocultar mandato' : 'Dados do mandato'}{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
    </article>
    {expanded && <div className="president-mandate-details" id="president-mandate-details">
      {!isPortalTransparencyConfigured() && <p className="open-data-configuration">A consulta da CGU precisa do backend do Voz Cidadã. Configure <code>VITE_API_BASE_URL</code> no frontend e a chave da API como segredo no servidor; ela não deve ser exposta no navegador.</p>}
      {isPortalTransparencyConfigured() && <>
        <div className="president-mandate-refresh"><button type="button" className="open-data-action" disabled={expenses.loading || amendments.loading} onClick={() => void loadMandateData()}>
          {expenses.loading || amendments.loading ? <LoaderCircle className="spin" size={14} /> : <ArrowUpRight size={14} />}
          {requested ? 'Atualizar dados oficiais' : 'Carregar dados oficiais'}
        </button></div>
      </>}
      <div className="president-mandate-grid">
        <section className="president-mandate-panel">
          <div className="open-data-card-title"><div><h5><Wallet size={14} /> Execução das despesas da Presidência · {year}</h5><p>Valores anuais do órgão superior Presidência da República — não representam gastos pessoais do Presidente.</p></div></div>
          {isPortalTransparencyConfigured()
            ? <MandateDataList state={expenses} empty={`A API não retornou despesas para o órgão no exercício ${year}.`}>
              {(item, index) => <article className="president-expense-row" key={`${item.organizationCode}-${index}`}>
                <strong>{item.organization}</strong>
                <span>Empenhado <b>{currency(item.committed)}</b></span>
                <span>Liquidado <b>{currency(item.settled)}</b></span>
                <span>Pago <b>{currency(item.paid)}</b></span>
              </article>}
            </MandateDataList>
            : <p className="open-data-empty">Configure o acesso à API da CGU para carregar os valores aqui.</p>}
          <SourceLink href="https://portaldatransparencia.gov.br/despesas/consulta?ordenarPor=ano&direcao=desc">Consultar despesas na CGU</SourceLink>
        </section>
        <section className="president-mandate-panel">
          <div className="open-data-card-title"><div><h5><Landmark size={14} /> Emendas parlamentares · {year}</h5><p>Execução de emendas do orçamento federal: empenhado, liquidado e pago.</p></div></div>
          {isPortalTransparencyConfigured()
            ? <MandateDataList state={amendments} empty={`A API não retornou emendas para o exercício ${year}.`}>
              {(item, index) => <article className="president-amendment-row" key={`${item.id}-${index}`}>
                <strong>{item.number} · {item.kind}</strong>
                <span>{item.author} · {item.destination}</span>
                <small>Empenhado {currency(item.committed)} · liquidado {currency(item.settled)} · pago {currency(item.paid)}</small>
              </article>}
            </MandateDataList>
            : <p className="open-data-empty">Configure o acesso à API da CGU para carregar os valores aqui.</p>}
          <p className="president-data-note">Emendas são apresentadas por parlamentares. A execução orçamentária é acompanhada aqui como dado federal, não como verba de autoria pessoal do Presidente.</p>
          <SourceLink href="https://portaldatransparencia.gov.br/emendas/consulta">Consultar emendas na CGU</SourceLink>
        </section>
      </div>
      <section className="president-mandate-panel president-programs-panel">
        <div className="open-data-card-title"><div><h5><FileText size={14} /> Projetos, programas e atos do Executivo</h5><p>Fontes oficiais para acompanhar propostas de lei, ações e decisões da Presidência.</p></div></div>
        <div className="president-official-sources">
          <SourceLink href="https://www.gov.br/planalto/pt-br/acompanhe-o-planalto">Ações e notícias do Planalto</SourceLink>
          <SourceLink href="https://www.planalto.gov.br/ccivil_03/">Atos e legislação federal</SourceLink>
          <SourceLink href="https://www.camara.leg.br/busca-portal/proposicoes/pesquisa-simplificada">Projetos em tramitação na Câmara</SourceLink>
          <SourceLink href="https://www.gov.br/transferegov/pt-br">Convênios e transferências federais</SourceLink>
        </div>
        <p className="president-data-note"><BookOpen size={13} /> Projetos de lei, programas de governo e atos presidenciais têm naturezas e bases oficiais distintas; os links levam diretamente às fontes responsáveis, sem atribuir ao Presidente proposições de outros autores.</p>
      </section>
    </div>}
  </section>
}

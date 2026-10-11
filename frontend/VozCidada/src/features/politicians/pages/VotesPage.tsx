import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ArrowUpRight, CalendarDays, Check, Download, FileText, ThumbsDown, ThumbsUp } from 'lucide-react'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import { AccessibilityReader } from '../components/AccessibilityReader'
import type { Bill, PopularVoteChoice } from '../../../types'
import { useAuth } from '../../auth/AuthContext'
import { castBillVote, castOfficialProposalVote, listBills, listOfficialProposalVotes } from '../../../services/civicData'
import { fetchRecentProposals } from '../../../services/legislativeService'

function percentages(counts: { favor: number; against: number; null: number }) {
  const total = counts.favor + counts.against + counts.null
  if (!total) return { favor: 0, against: 0, null: 0, total }
  const favor = Math.round(counts.favor / total * 100)
  const against = Math.round(counts.against / total * 100)
  return { favor, against, null: 100 - favor - against, total }
}

function isGeneratedId(id: string) {
  return /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)
}

export function VotesPage() {
  const { billId } = useParams<{ billId: string }>()
  const navigate = useNavigate()
  const { user, openAuthModal } = useAuth()
  const [items, setItems] = useState<Bill[]>([])
  const [ballots, setBallots] = useState<Record<string, PopularVoteChoice>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [proposalError, setProposalError] = useState('')

  const refresh = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listBills(user?.id)
      setItems(result.bills)
      setBallots(result.myVotes)
      try {
        const proposals = await fetchRecentProposals(8)
        const proposalBills: Bill[] = proposals.map(proposal => {
          const id = `camara-${proposal.id}`
          return {
            id,
            externalProposalId: proposal.id,
            title: `${proposal.kind} ${proposal.number}/${proposal.year}`,
            author: 'Câmara dos Deputados',
            summary: proposal.summary,
            status: 'Em votação',
            deadline: 'Consulta popular aberta',
            votes: { favor: 0, against: 0, abstain: 0 },
            voteCounts: { favor: 0, against: 0, null: 0 },
            sourceUrl: proposal.url,
            category: 'Proposição legislativa oficial',
            updatedAt: proposal.presentedAt ?? undefined,
            voteUnavailable: true,
          }
        })
        try {
          const proposalVotes = await listOfficialProposalVotes(proposals.map(proposal => proposal.id), user?.id)
          const voteableProposals = proposalBills.map(bill => {
            const proposalId = bill.externalProposalId
            if (proposalId === undefined) return bill
            const voteCounts = proposalVotes.counts[proposalId] ?? { favor: 0, against: 0, null: 0 }
            return {
              ...bill,
              votes: { favor: voteCounts.favor, against: voteCounts.against, abstain: voteCounts.null },
              voteCounts,
              voteUnavailable: false,
            }
          })
          setItems([...voteableProposals, ...result.bills])
          setBallots({ ...result.myVotes, ...proposalVotes.myVotes })
          setProposalError('')
        } catch (cause) {
          setItems([...proposalBills, ...result.bills])
          setBallots(result.myVotes)
          setProposalError(cause instanceof Error ? cause.message : 'A votação das proposições oficiais está indisponível.')
        }
      } catch (cause) {
        setItems(result.bills)
        setBallots(result.myVotes)
        setProposalError(cause instanceof Error ? cause.message : 'Não foi possível carregar as proposições oficiais para votação.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os projetos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [user?.id])

  const castVote = async (bill: Bill, choice: PopularVoteChoice) => {
    if (!user) {
      openAuthModal()
      return
    }
    setBusy(bill.id)
    setError('')
    try {
      if (bill.externalProposalId !== undefined) {
        await castOfficialProposalVote(bill.externalProposalId, user.id, choice)
      } else {
        await castBillVote(bill.id, user.id, choice)
      }
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível registrar seu voto.')
    } finally {
      setBusy('')
    }
  }

  if (billId) {
    const bill = items.find(item => item.id === billId)
    if (loading) return <div className="page-wrap votes-page"><div className="empty-state" role="status">Carregando projeto…</div></div>
    if (!bill) return <div className="page-wrap votes-page">
      <button type="button" className="law-back-button" onClick={() => navigate('/votacoes')}><ArrowLeft size={18} /> Voltar</button>
      {error && <div className="management-notice" role="alert">{error}</div>}
      <div className="empty-state">Este projeto não foi encontrado ou não está mais publicado.</div>
    </div>
    return <BillDetails
      bill={bill}
      ballot={ballots[bill.id]}
      busy={busy === bill.id}
      onBack={() => navigate('/votacoes')}
      onVote={choice => void castVote(bill, choice)}
      error={error}
      proposalError={proposalError}
    />
  }

  return <div className="page-wrap votes-page">
    <SectionTitle eyebrow="PARTICIPAÇÃO CIDADÃ" title="A sua opinião conta" description="Conheça os projetos em votação e consulte os detalhes antes de registrar sua posição." />
    <div className="vote-info">
      <div className="vote-info-icon"><ThumbsUp size={19} /></div>
      <p><strong>Voto consultivo:</strong> uma pessoa pode escolher uma posição por projeto e atualizar sua escolha enquanto a consulta estiver aberta.</p>
      <span>Aberto à população</span>
    </div>
    {proposalError && <div className="management-notice" role="alert">
      Não foi possível carregar as proposições oficiais para votação: {proposalError}
      <button className="retry-action" onClick={() => void refresh()}>Tentar novamente</button>
    </div>}
    {error && <div className="management-notice" role="alert">{error}<button className="retry-action" onClick={() => void refresh()}>Tentar novamente</button></div>}
    {loading ? <div className="empty-state" role="status">Carregando projetos e votos…</div>
      : items.length === 0 ? <div className="empty-state">Ainda não há projetos publicados no banco de dados.</div>
        : <div className="vote-list">{items.map(bill => {
          const counts = bill.voteCounts ?? { favor: 0, against: 0, null: 0 }
          const result = percentages(counts)
          return <Link className="bill-card popular-bill-card law-project-card" key={bill.id} to={`/votacoes/${encodeURIComponent(bill.id)}`}>
            <div className="bill-card-top">
              <span className="bill-id">{isGeneratedId(bill.id) ? `ID ${bill.id.slice(0, 8).toUpperCase()}` : bill.id}</span>
              <span className={bill.status === 'Em votação' ? 'bill-live' : 'bill-progress'}><i />{bill.status}</span>
            </div>
            <span className="bill-tag">{bill.category || 'Projeto de Lei'}</span>
            <h3>{bill.title}</h3>
            <p>{bill.summary}</p>
            <div className="bill-author">{bill.externalProposalId !== undefined ? 'Fonte oficial' : 'Autoria'} <strong>{bill.author}</strong></div>
            <div className="law-project-card-footer">
              <span>{result.total.toLocaleString('pt-BR')} votos registrados</span>
              <span>Ver detalhes <ArrowRight size={15} /></span>
            </div>
          </Link>
        })}</div>}
    <div className="vote-disclaimer">Os resultados são carregados e contabilizados no banco de dados. A votação é consultiva.</div>
  </div>
}

function BillDetails({ bill, ballot, busy, onBack, onVote, error, proposalError }: {
  bill: Bill
  ballot?: PopularVoteChoice
  busy: boolean
  onBack: () => void
  onVote: (choice: PopularVoteChoice) => void
  error: string
  proposalError: string
}) {
  const counts = bill.voteCounts ?? { favor: 0, against: 0, null: 0 }
  const result = percentages(counts)

  return <div className="page-wrap votes-page law-detail-page">
    <button type="button" className="law-back-button" onClick={onBack}><ArrowLeft size={18} /> Voltar aos projetos</button>
    {error && <div className="management-notice" role="alert">{error}</div>}
    {bill.externalProposalId !== undefined && bill.voteUnavailable && <div className="management-notice" role="alert">
      A proposição foi carregada da Câmara, mas a votação popular está temporariamente indisponível.{proposalError && ` ${proposalError}`}
    </div>}

    <article className="law-detail">
      <header className="law-detail-heading">
        <div className="law-detail-meta">
          <span className="bill-id">{isGeneratedId(bill.id) ? `ID da plataforma ${bill.id.slice(0, 8).toUpperCase()}` : bill.id}</span>
          <span className={bill.status === 'Em votação' ? 'bill-live' : 'bill-progress'}><i />{bill.status}</span>
          {bill.category && <span className="bill-tag">{bill.category}</span>}
        </div>
        <h1>{bill.title}</h1>
        <p className="law-detail-author">Autoria <strong>{bill.author}</strong></p>
        <div className="law-detail-summary">
          <h2>Ementa</h2>
          <p>{bill.summary}</p>
        </div>
      </header>

      <div className="law-detail-tools">
        <AccessibilityReader bill={bill} />
        <aside className="law-document-card" aria-label="Documento oficial do projeto">
          <div className="law-document-icon"><FileText size={24} /></div>
          <div>
            <span>DOCUMENTO OFICIAL</span>
            <h2>Projeto completo em PDF</h2>
            <p>Acesse o texto original para conferir todos os artigos e detalhes.</p>
          </div>
          {bill.sourceUrl
            ? <div className="law-document-actions">
              <a href={bill.sourceUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={16} /> Consultar proposta na Câmara</a>
            </div>
            : bill.pdfUrl
            ? <div className="law-document-actions">
              <a href={bill.pdfUrl} target="_blank" rel="noreferrer"><FileText size={16} /> Visualizar PDF</a>
              <a href={bill.pdfUrl} download><Download size={16} /> Baixar PDF</a>
            </div>
            : <p className="law-document-unavailable">O documento PDF original ainda não foi anexado a este projeto.</p>}
        </aside>
      </div>

      <details className="law-more-details">
        <summary><span>Saber Mais</span><span>Consulte o documento e os dados da proposta</span></summary>
        <div className="law-more-content">
          <dl className="law-facts">
            <div><dt>{isGeneratedId(bill.id) ? 'Identificador da plataforma' : 'Número do projeto'}</dt><dd>{bill.id}</dd></div>
            <div><dt>Autor</dt><dd>{bill.author}</dd></div>
            <div><dt>Status</dt><dd>{bill.status}</dd></div>
            {bill.deadline && <div><dt>Prazo da consulta</dt><dd>{bill.deadline}</dd></div>}
            {bill.updatedAt && <div><dt>Atualizado em</dt><dd>{bill.updatedAt}</dd></div>}
          </dl>
          {bill.pdfUrl
            ? <div className="law-pdf-viewer">
              <div><strong>Texto integral do projeto</strong><a href={bill.pdfUrl} target="_blank" rel="noreferrer">Abrir em nova janela</a></div>
              <iframe src={bill.pdfUrl} title={`Documento integral: ${bill.title}`} loading="lazy" />
            </div>
            : bill.sourceUrl
              ? <p className="law-document-unavailable">Esta proposição oficial está disponível para consulta na Câmara. O texto integral pode ser acessado pelo link acima.</p>
              : <p className="law-document-unavailable">A plataforma tem a ementa cadastrada, mas não recebeu o texto integral. Consulte o órgão responsável para obter o documento completo.</p>}
        </div>
      </details>

      <section className="law-vote-panel" aria-label="Votação consultiva">
        <div className="popular-results">
          <div className="popular-results-head"><strong>Vozes da comunidade</strong><span>{result.total.toLocaleString('pt-BR')} votos</span></div>
          <div className="popular-stacked-bar"><i className="bar-favor" style={{ width: `${result.favor}%` }} /><i className="bar-against" style={{ width: `${result.against}%` }} /><i className="bar-null" style={{ width: `${result.null}%` }} /></div>
          <div className="popular-result-legend"><span><i className="legend-favor" /> Favorável <b>{result.favor}%</b></span><span><i className="legend-against" /> Desfavorável <b>{result.against}%</b></span><span><i className="legend-null" /> Nulo <b>{result.null}%</b></span></div>
        </div>
        {bill.status !== 'Votado' ? <div className="popular-vote-actions">
          <span>{ballot ? 'Sua posição registrada' : 'Qual é a sua opinião?'}</span>
          <div>{([['favor', 'Favorável'], ['against', 'Desfavorável'], ['null', 'Nulo']] as const).map(([choice, label]) =>
            <button disabled={busy || bill.voteUnavailable} key={choice} className={`popular-vote-button ${choice} ${ballot === choice ? 'chosen' : ''}`} onClick={() => onVote(choice)}>
              {ballot === choice && <Check size={15} />}{choice === 'favor' ? <ThumbsUp size={15} /> : choice === 'against' ? <ThumbsDown size={15} /> : null}{label}
            </button>)}
          </div>
        </div> : <div className="bill-closed-note"><CalendarDays size={15} /> Consulta encerrada</div>}
      </section>
    </article>
    <div className="vote-disclaimer">Os resultados são consultivos e não substituem as votações oficiais do Poder Legislativo.</div>
  </div>
}

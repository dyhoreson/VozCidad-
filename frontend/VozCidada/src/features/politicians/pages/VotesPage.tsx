import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, Check, FileText, ThumbsDown, ThumbsUp } from 'lucide-react'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import type { Bill, PopularVoteChoice } from '../../../types'
import { useAuth } from '../../auth/AuthContext'
import { castBillVote, listBills } from '../../../services/supabaseService'

function percentages(counts: { favor: number; against: number; null: number }) { const total = counts.favor + counts.against + counts.null; if (!total) return { favor: 0, against: 0, null: 0, total }; const favor = Math.round(counts.favor / total * 100); const against = Math.round(counts.against / total * 100); return { favor, against, null: 100 - favor - against, total } }
export function VotesPage() {
  const { user, openAuthModal } = useAuth(); const [items, setItems] = useState<Bill[]>([]); const [ballots, setBallots] = useState<Record<string, PopularVoteChoice>>({}); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(''); const [error, setError] = useState('')
  const refresh = async () => { setLoading(true); setError(''); try { const result = await listBills(user?.id); setItems(result.bills); setBallots(result.myVotes) } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível carregar os projetos.') } finally { setLoading(false) } }
  useEffect(() => { void refresh() }, [user?.id])
  const castVote = async (bill: Bill, choice: PopularVoteChoice) => { if (!user) { openAuthModal(); return } setBusy(bill.id); setError(''); try { await castBillVote(bill.id, user.id, choice); await refresh() } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível registrar seu voto.') } finally { setBusy('') } }
  return <div className="page-wrap votes-page"><SectionTitle eyebrow="PARTICIPAÇÃO CIDADÃ" title="A sua opinião conta" description="Leia as propostas em tramitação e registre uma posição. Os resultados consultivos ajudam a ampliar o debate público." />
    <div className="vote-info"><div className="vote-info-icon"><ThumbsUp size={19} /></div><p><strong>Voto consultivo:</strong> uma pessoa pode escolher uma posição por projeto e atualizar sua escolha enquanto a consulta estiver aberta.</p><span>Aberto à população</span></div>
    {error && <div className="management-notice" role="alert">{error}<button onClick={() => void refresh()}>Tentar novamente</button></div>}
    {loading ? <div className="empty-state" role="status">Carregando projetos e votos…</div> : items.length === 0 ? <div className="empty-state">Ainda não há projetos publicados no banco de dados.</div> : <div className="vote-list">{items.map(bill => {
      const counts = bill.voteCounts ?? { favor: 0, against: 0, null: 0 }; const result = percentages(counts); const myChoice = ballots[bill.id]
      return <article className="bill-card popular-bill-card" key={bill.id}>
        <div className="bill-card-top"><span className="bill-id">{bill.id.slice(0, 8).toUpperCase()}</span><span className={bill.status === 'Em votação' ? 'bill-live' : 'bill-progress'}><i />{bill.status}</span></div>
        <span className="bill-tag">Projeto regional</span><h3>{bill.title}</h3><p>{bill.summary}</p><div className="bill-author">Autoria <strong>{bill.author}</strong></div>
        {bill.pdfUrl && <a className="bill-document-link" href={bill.pdfUrl} target="_blank" rel="noreferrer"><FileText size={15} /> Ler documento original (PDF) <ArrowRight size={14} /></a>}
        <div className="popular-results"><div className="popular-results-head"><strong>Vozes da comunidade</strong><span>{result.total.toLocaleString('pt-BR')} votos</span></div>
          <div className="popular-stacked-bar"><i className="bar-favor" style={{ width: `${result.favor}%` }} /><i className="bar-against" style={{ width: `${result.against}%` }} /><i className="bar-null" style={{ width: `${result.null}%` }} /></div>
          <div className="popular-result-legend"><span><i className="legend-favor" /> Favorável <b>{result.favor}%</b></span><span><i className="legend-against" /> Desfavorável <b>{result.against}%</b></span><span><i className="legend-null" /> Nulo <b>{result.null}%</b></span></div>
        </div>
        {bill.status !== 'Votado' ? <div className="popular-vote-actions"><span>{myChoice ? 'Sua posição registrada' : 'Qual é a sua opinião?'}</span><div>{([['favor', 'Favorável'], ['against', 'Desfavorável'], ['null', 'Nulo']] as const).map(([choice, label]) => <button disabled={busy === bill.id} key={choice} className={`popular-vote-button ${choice} ${myChoice === choice ? 'chosen' : ''}`} onClick={() => void castVote(bill, choice)}>{myChoice === choice && <Check size={15} />}{choice === 'favor' ? <ThumbsUp size={15} /> : choice === 'against' ? <ThumbsDown size={15} /> : null}{label}</button>)}</div></div> : <div className="bill-closed-note"><CalendarDays size={15} /> Consulta encerrada</div>}
      </article>
    })}</div>}
    <div className="vote-disclaimer">Os resultados são carregados e contabilizados no banco de dados. A votação é consultiva.</div>
  </div>
}

import { ArrowRight, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Bill } from '../../types'

function VoteMeter({ bill }: { bill: Bill }) {
  const favor = bill.voteCounts?.favor ?? bill.votes.favor
  const against = bill.voteCounts?.against ?? bill.votes.against
  const abstain = bill.voteCounts?.null ?? bill.votes.abstain
  const total = favor + against + abstain
  const favorPercent = total ? Math.round(favor / total * 100) : 0
  const againstPercent = total ? Math.round(against / total * 100) : 0
  return <div className="mt-4" aria-label={`Consulta popular com ${total} votos`}>
    <div className="mb-2 flex justify-between text-xs text-slate-600"><span>Resultado da consulta</span><span>{total.toLocaleString('pt-BR')} votos</span></div>
    <div className="flex h-2 overflow-hidden rounded-full bg-slate-100"><div className="bg-emerald-500 transition-all" style={{ width: `${favorPercent}%` }} /><div className="bg-rose-500 transition-all" style={{ width: `${againstPercent}%` }} /><div className="flex-1 bg-slate-300" /></div>
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"><span className="inline-flex items-center gap-1 text-emerald-800"><ThumbsUp size={13} />Favorável {favorPercent}%</span><span className="inline-flex items-center gap-1 text-rose-800"><ThumbsDown size={13} />Desfavorável {againstPercent}%</span><span className="text-slate-500">Nulo {total ? Math.round(abstain / total * 100) : 0}%</span></div>
  </div>
}

export function BillsSection({ bills, loading = false, authenticated, onRequestLogin }: { bills: Bill[]; loading?: boolean; authenticated: boolean; onRequestLogin: () => void }) {
  const openBills = bills.filter(bill => bill.status !== 'Votado').slice(0, 4)
  return <section className="my-8" aria-labelledby="bills-section-title">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-widest text-purple-700">Plenário aberto</span><h2 id="bills-section-title" className="mt-1 text-2xl font-bold text-slate-900">Projetos em consulta pública</h2><p className="mt-1 text-sm text-slate-600">Acompanhe as propostas e a opinião registrada pela comunidade.</p></div><Link to="/votacoes" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-800">Todos os projetos <ArrowRight size={15} /></Link></div>
    {loading ? <div className="h-48 animate-pulse rounded-2xl bg-slate-100" /> : openBills.length ? <div className="grid gap-4 lg:grid-cols-2">{openBills.map(bill => <article key={bill.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-800">{bill.status}</span><span className="text-xs text-slate-500">Autor: {bill.author}</span></div><h3 className="mt-3 text-lg font-bold text-slate-900">{bill.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">{bill.summary}</p><VoteMeter bill={bill} /><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">Consulta popular consultiva; não representa quórum legislativo oficial.</span>{authenticated ? <Link to="/votacoes" className="inline-flex items-center gap-1 rounded-lg bg-brand-primary transition-colors hover:bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Registrar voto <ArrowRight size={15} /></Link> : <button onClick={onRequestLogin} className="inline-flex items-center gap-1 rounded-lg bg-brand-primary transition-colors hover:bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Entre para votar <ArrowRight size={15} /></button>}</div></article>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center text-sm text-slate-600">Não há projetos abertos para consulta no momento.</div>}
  </section>
}

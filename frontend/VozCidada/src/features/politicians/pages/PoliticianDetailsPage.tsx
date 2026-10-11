import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BadgeCheck, Building2, CalendarDays, FileCheck2, Landmark, MapPin, Vote } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getPoliticianCivicData, listInstitutionProfiles } from '../../../services/supabaseService'
import type { Database } from '../../../types/database'

type DirectoryPerson = { id: string; name: string; role: string; municipality: string | null; avatarUrl?: string }
type PoliticianDetail = Database['public']['Tables']['politician_details']['Row']
type Project = Database['public']['Tables']['approved_projects']['Row']
type Amendment = Database['public']['Tables']['parliamentary_amendments']['Row']
const partyColors: Record<string, string> = { PT: '#d71920', PL: '#244f9e', PSB: '#ffd427', PSD: '#f58220', MDB: '#168447', 'Partido Verde': '#168447', Cidadania: '#00a3d7', União: '#159447' }
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value)) : 'Não informado'
const yearsBetween = (start: string, end: string) => Math.max(0, (Date.parse(end) - Date.parse(start)) / (365.2425 * 24 * 60 * 60 * 1000))

export function PoliticianDetailsPage() {
  const { profileId } = useParams()
  const [person, setPerson] = useState<DirectoryPerson | null>(null)
  const [detail, setDetail] = useState<PoliticianDetail | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [amendments, setAmendments] = useState<Amendment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    if (!profileId) { setLoading(false); return }
    void Promise.all([listInstitutionProfiles(), getPoliticianCivicData(profileId)]).then(([people, civic]) => {
      if (!active) return
      setPerson(people.find(item => item.id === profileId && item.role === 'politico') ?? null)
      setDetail(civic.detail); setProjects(civic.projects); setAmendments(civic.amendments)
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os dados do mandato.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [profileId])

  const previous = detail?.previous_offices ?? []
  const totalPreviousYears = useMemo(() => previous.reduce((sum, term) => sum + yearsBetween(term.start, term.end), 0), [previous])
  const projectYears = useMemo(() => projects.reduce<Record<string, Project[]>>((groups, project) => { const year = project.approved_at.slice(0, 4); (groups[year] ??= []).push(project); return groups }, {}), [projects])
  const party = detail?.party ?? 'Partido não informado'
  const color = detail?.party_color && /^#[da-f]{6}$/i.test(detail.party_color) ? detail.party_color : partyColors[party] ?? '#245c91'
  const photo = detail?.photo_url ?? person?.avatarUrl

  if (loading) return <div className="page-wrap empty-state">Carregando perfil político…</div>
  if (error) return <div className="page-wrap"><p role="alert" className="management-notice">{error}</p><Link to="/representantes">Voltar ao diretório</Link></div>
  if (!person) return <Navigate to="/representantes" replace />

  return <div className="mx-auto max-w-6xl px-5 py-8 md:px-8"><Link className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700" to="/representantes"><ArrowLeft size={16} />Voltar ao diretório</Link>
    <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="h-4 w-full" style={{ backgroundColor: color }} /><div className="grid gap-6 p-5 md:grid-cols-[220px_minmax(0,1fr)] md:p-8"><div className="mx-auto h-48 w-48 overflow-hidden rounded-2xl bg-slate-100 text-5xl font-bold text-blue-900 md:mx-0">{photo ? <img src={photo} alt={person.name} className="h-full w-full object-contain object-center" /> : <div className="grid h-full place-items-center">{person.name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div>}</div><div><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-800"><BadgeCheck size={14} />Representante em atividade</span><h1 className="mt-3 text-3xl font-bold text-slate-950">{person.name}</h1><p className="mt-1 text-lg font-semibold" style={{ color }}>{party}</p><p className="mt-1 flex items-center gap-1 text-sm text-slate-600"><Landmark size={15} />{detail?.current_office ?? 'Cargo atual não informado'} <span>·</span><MapPin size={15} />{person.municipality ?? 'Rio Grande do Norte'}, RN</p>{detail?.biography && <p className="mt-4 max-w-3xl leading-relaxed text-slate-700">{detail.biography}</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><CalendarDays size={15} />Mandato atual</span><strong className="mt-1 block text-sm text-slate-900">{date(detail?.current_term_start)} — {date(detail?.current_term_end)}</strong></div><div className="rounded-xl bg-slate-50 p-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-500"><Vote size={15} />Última eleição</span><strong className="mt-1 block text-sm text-slate-900">{detail?.last_election_votes?.toLocaleString('pt-BR') ?? 'Votação não informada'} votos</strong></div></div>
      </div></div></header>
    <div className="mt-6 grid gap-6 lg:grid-cols-2"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-xl font-bold"><Landmark size={19} />Mandatos anteriores</h2><p className="mt-1 text-sm text-slate-600">Tempo total registrado: {totalPreviousYears.toFixed(1).replace('.', ',')} anos</p>{previous.length ? <ol className="mt-5 space-y-4 border-l-2 border-slate-200 pl-5">{previous.map((term, index) => <li key={`${term.office}-${term.start}-${index}`} className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-brand-light" /><strong>{term.office}</strong><p className="text-sm text-slate-600">{date(term.start)} — {date(term.end)}</p></li>)}</ol> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Cargos anteriores ainda não cadastrados.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-xl font-bold"><FileCheck2 size={19} />Projetos aprovados</h2>{Object.keys(projectYears).length ? Object.entries(projectYears).map(([year, rows]) => <div key={year} className="mt-4"><h3 className="font-semibold text-blue-800">{year} · {rows.length} projeto(s)</h3><ul className="mt-2 space-y-3">{rows.map(project => <li key={project.id} className="rounded-xl bg-slate-50 p-3"><strong>{project.title}</strong><p className="mt-1 text-xs text-slate-500">Aprovado em {date(project.approved_at)}</p>{project.summary && <p className="mt-2 text-sm text-slate-600">{project.summary}</p>}</li>)}</ul></div>) : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Projetos aprovados ainda não cadastrados.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2"><h2 className="flex items-center gap-2 text-xl font-bold"><Building2 size={19} />Emendas parlamentares e destinações</h2>{amendments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Período</th><th className="p-3">Valor</th><th className="p-3">Destino</th><th className="p-3">Município</th><th className="p-3">Finalidade</th></tr></thead><tbody>{amendments.map(item => <tr key={item.id} className="border-b border-slate-100"><td className="p-3">{item.period}</td><td className="p-3 font-semibold">{item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td><td className="p-3">{item.destination}</td><td className="p-3">{item.municipality ?? 'RN'}</td><td className="p-3">{item.event_name ?? item.category ?? 'Não especificada'}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Destinações de emendas ainda não cadastradas.</p>}</section></div>
  </div>
}

import { ArrowRight, Landmark, LogIn, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { IncidentMap } from '../../map/components/IncidentMap'
import type { Occurrence } from '../../../types'

type PublicPolitician = { id: string; name: string; municipality: string | null; avatarUrl?: string }

export function PublicMapPreview({ reports }: { reports: Occurrence[] }) {
  return <section className="my-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-widest text-blue-700">Mapa em modo visualização</span><h2 className="mt-1 text-2xl font-bold text-slate-900">Ocorrências recentes no RN</h2><p className="mt-1 text-sm text-slate-600">Explore os registros públicos e acompanhe o status de cada demanda.</p></div><Link to="/mapa" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-800">Abrir mapa completo <ArrowRight size={16} /></Link></div>
    <IncidentMap occurrences={reports.slice(0, 30)} onSelect={() => undefined} />
  </section>
}

export function PublicPoliticianShowcase({ people }: { people: PublicPolitician[] }) {
  const politicians = people.slice(0, 4)
  return <section className="my-8"><div className="mb-4 flex items-end justify-between gap-3"><div><span className="text-xs font-bold uppercase tracking-widest text-blue-700">Transparência e representação</span><h2 className="mt-1 text-2xl font-bold text-slate-900">Políticos do Rio Grande do Norte</h2><p className="mt-1 text-sm text-slate-600">Consulte mandatos, projetos e informações públicas.</p></div><Link to="/representantes" className="text-sm font-semibold text-blue-800">Ver diretório <ArrowRight className="ml-1 inline" size={15} /></Link></div>
    {politicians.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{politicians.map(person => <Link key={person.id} to={`/politicos/${person.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:shadow-md"><div className="grid aspect-[4/3] place-items-center overflow-hidden bg-slate-100 text-3xl font-bold text-blue-900">{person.avatarUrl ? <img src={person.avatarUrl} alt={person.name} className="h-full w-full object-cover" /> : person.name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()}</div><div className="p-4"><h3 className="font-semibold text-slate-900">{person.name}</h3><p className="mt-1 text-sm text-slate-500">{person.municipality || 'Rio Grande do Norte'}</p></div></Link>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600"><Landmark className="mb-2 text-blue-700" size={19} />Os perfis de políticos serão exibidos aqui quando cadastrados.</div>}
  </section>
}

export function JoinCta({ authenticated, onLogin }: { authenticated: boolean; onLogin: () => void }) {
  return <section className="join-cta-banner my-9 flex flex-col items-start justify-between gap-5 rounded-2xl bg-blue-950 p-6 text-white md:flex-row md:items-center md:p-8"><div><span className="text-xs font-bold uppercase tracking-widest text-blue-200">A participação começa com você</span><h2 className="mt-2 text-2xl font-bold">Ajude a transformar sua cidade.</h2><p className="mt-2 max-w-2xl text-sm text-blue-100">{authenticated ? 'Abra uma denúncia, acompanhe seus registros e participe das consultas públicas.' : 'Crie sua conta para registrar denúncias, acompanhar respostas e desbloquear pontos e ferramentas cívicas.'}</p></div>{authenticated ? <Link to="/mapa" className="join-cta-action inline-flex shrink-0 items-center gap-2 bg-white text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-gray-100 transition-all"><Landmark size={17} /> Acessar painel <ArrowRight size={16} /></Link> : <div className="flex shrink-0 flex-wrap gap-3"><button onClick={onLogin} className="join-cta-button inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-300 hover:text-blue-950 transition-all"><LogIn size={17} /> Entrar</button><button onClick={onLogin} className="join-cta-button inline-flex items-center gap-2 bg-white text-blue-900 font-bold px-6 py-3 rounded-lg shadow-md hover:bg-yellow-300 hover:text-blue-950 transition-all"><UserPlus size={17} /> Criar conta</button></div>}</section>
}

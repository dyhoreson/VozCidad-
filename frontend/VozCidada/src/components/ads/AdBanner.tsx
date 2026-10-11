import { Megaphone } from 'lucide-react'

export function AdBanner() {
  return <aside aria-label="Espaço publicitário" className="my-8 overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-5 py-6 sm:px-8">
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-start gap-3"><span className="rounded-xl bg-blue-100 p-3 text-blue-800"><Megaphone size={20} /></span><div><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Publicidade</p><h2 className="mt-1 text-base font-semibold text-slate-800">Espaço para iniciativas que movem o RN</h2><p className="mt-1 text-sm text-slate-500">Área reservada para anúncio identificado e transparente.</p></div></div><span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500">Espaço disponível</span></div>
  </aside>
}

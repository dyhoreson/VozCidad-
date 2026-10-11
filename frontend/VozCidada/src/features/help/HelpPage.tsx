import { useState } from 'react'
import { ChevronDown, Mail, Phone } from 'lucide-react'

const faqs = [
  { q: 'Como registro uma ocorrência?', a: 'Acesse o Mapa de ocorrências, entre na sua conta e selecione Registrar ocorrência. Informe categoria, descrição, município e localização. Você pode acompanhar as atualizações no próprio mapa.' },
  { q: 'Como funciona a confirmação da comunidade?', a: 'Pessoas da região podem confirmar que também observaram a ocorrência. O sistema limita uma confirmação por conta em cada ocorrência. As confirmações ajudam a demonstrar relevância, mas não substituem a análise do órgão responsável.' },
  { q: 'Como funciona o voto popular?', a: 'Na área Voto popular, escolha um projeto e registre sua posição. O voto é associado à sua conta. Os resultados publicados representam a participação na plataforma e não substituem a votação oficial legislativa.' },
  { q: 'Como acompanho o andamento de uma denúncia?', a: 'Cada ocorrência pode passar por Aguardando Resposta, Em Reparo, Reparo Realizado ou Improcedente. Quando um órgão autorizado atualiza o status, a resposta oficial e o histórico ficam disponíveis na ocorrência.' },
  { q: 'Quando recebo pontos cívicos?', a: 'Uma ocorrência criada por você gera 100 pontos quando seu status chega a Reparo Realizado. Cada ocorrência concede pontos uma única vez.' },
]

export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0)
  return <div className="mx-auto max-w-4xl px-5 py-10 md:px-8"><header className="mb-8"><p className="text-sm font-semibold uppercase tracking-widest text-blue-700">Voz Cidadã RN</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Central de ajuda</h1><p className="mt-2 text-slate-600">Informações para participar, acompanhar e cobrar serviços públicos.</p></header>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{faqs.map((faq, index) => <div className="border-b border-slate-100 last:border-0" key={faq.q}><button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-slate-800" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)}>{faq.q}<ChevronDown className={`shrink-0 transition-transform ${open === index ? 'rotate-180' : ''}`} size={18} /></button>{open === index && <p className="px-5 pb-5 leading-relaxed text-slate-600">{faq.a}</p>}</div>)}</section>
    <section className="mt-8 rounded-2xl bg-slate-900 p-6 text-white"><h2 className="text-xl font-semibold">Canais de atendimento</h2><p className="mt-2 text-sm text-slate-300">Para suporte à plataforma, fale com nossa equipe. Para emergências, procure os canais oficiais de atendimento do seu município.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><a className="flex items-center gap-3 rounded-xl bg-white/10 p-4 hover:bg-white/15" href="mailto:suporte@vozcidada.rn.gov.br"><Mail size={18} /><span><small className="block text-slate-300">Suporte da plataforma</small>suporte@vozcidada.rn.gov.br</span></a><a className="flex items-center gap-3 rounded-xl bg-white/10 p-4 hover:bg-white/15" href="mailto:contato@vozcidada.rn.gov.br"><Phone size={18} /><span><small className="block text-slate-300">Contato institucional</small>contato@vozcidada.rn.gov.br</span></a></div><p className="mt-4 text-xs text-slate-400">Os e-mails acima são canais sugeridos da plataforma. Configure caixas postais ativas antes da publicação.</p></section>
  </div>
}

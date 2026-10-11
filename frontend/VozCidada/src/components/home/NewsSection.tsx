import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowDownRight, ArrowRight, Building2, Clock3, Landmark, MapPinned, Newspaper, X } from 'lucide-react'
import type { Bill, Occurrence } from '../../types'
import { detectUserLocation, type UserRegion } from '../../services/locationService'
import { FALLBACK_NEWS, fetchLocalNews, type LocalNewsArticle } from '../../services/newsService'

type NewsItem = {
  id: string
  category: string
  title: string
  date?: string | null
  summary: string
  image?: string | null
  municipality: string
  kind: 'incident' | 'bill' | 'external'
  source?: string
  url?: string
}

function toExternalNews(article: LocalNewsArticle, city: string): NewsItem {
  return {
    id: `external-${article.id}`,
    category: article.category || 'RN',
    title: article.title,
    date: article.publishedAt,
    summary: article.description,
    image: article.imageUrl,
    municipality: city,
    kind: 'external',
    source: article.source,
    url: article.url,
  }
}

function timeLabel(item: NewsItem) {
  if (!item.date) return 'Leitura de 2 min'
  const timestamp = new Date(item.date).getTime()
  if (!Number.isFinite(timestamp)) return 'Leitura de 2 min'
  const elapsedMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60_000))
  if (elapsedMinutes < 60) return `Há ${elapsedMinutes} min`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `Há ${elapsedHours} h`
  const elapsedDays = Math.floor(elapsedHours / 24)
  if (elapsedDays < 7) return `Há ${elapsedDays} d`
  return 'Leitura de 2 min'
}

function NewsIcon({ kind, className = '' }: { kind: NewsItem['kind']; className?: string }) {
  const Icon = kind === 'incident' ? MapPinned : kind === 'bill' ? Landmark : kind === 'external' ? Newspaper : Building2
  return <Icon aria-hidden="true" className={className} />
}

function NewsArtwork({ item, hero = false }: { item: NewsItem; hero?: boolean }) {
  return <div className={`absolute inset-0 overflow-hidden ${item.image ? 'bg-slate-200' : 'bg-gradient-to-br from-slate-900 via-blue-950 to-emerald-950'}`}>
    {item.image ? <img src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${hero ? 'scale-[1.01]' : ''}`} onError={event => { event.currentTarget.style.display = 'none' }} /> : <>
      <div className="absolute -right-16 -top-24 h-80 w-80 rounded-full border border-white/10" />
      <div className="absolute -right-2 -top-10 h-56 w-56 rounded-full border border-white/10" />
      <div className="absolute -bottom-28 -left-12 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <NewsIcon kind={item.kind} className={`absolute right-8 top-1/2 -translate-y-1/2 text-white/[0.08] ${hero ? 'h-44 w-44' : 'h-24 w-24'}`} />
    </>}
    <div className={`absolute inset-0 ${hero ? 'bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/5' : 'bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent'}`} />
  </div>
}

function ArticleAction({ item, children, onRead, className }: { item: NewsItem; children: ReactNode; onRead: (item: NewsItem) => void; className: string }) {
  if (item.url) {
    return <a href={item.url} target="_blank" rel="noopener noreferrer" className={className} aria-label={`Abrir: ${item.title}`}>{children}</a>
  }
  return <button type="button" onClick={() => onRead(item)} className={`${className} text-left`} aria-label={`Ler: ${item.title}`}>{children}</button>
}

function NewsSkeleton() {
  return <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]" aria-label="Carregando notícias" aria-busy="true">
    <div className="h-[390px] animate-pulse rounded-3xl bg-slate-200 sm:h-[470px]" />
    <div className="space-y-3">{[0, 1, 2, 3].map(item => <div key={item} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3"><div className="h-20 w-24 shrink-0 animate-pulse rounded-xl bg-slate-200 sm:h-24 sm:w-28" /><div className="flex-1 space-y-3 py-2"><div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" /><div className="h-4 w-full animate-pulse rounded bg-slate-200" /><div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" /></div></div>)}</div>
  </div>
}

export function NewsSection({ incidents, bills, loading = false }: { incidents: Occurrence[]; bills: Bill[]; loading?: boolean }) {
  const [region, setRegion] = useState<UserRegion>({ city: 'Natal', state: 'RN', countryCode: 'BR', isFallback: true })
  const [regionLoading, setRegionLoading] = useState(true)
  const [externalNews, setExternalNews] = useState<LocalNewsArticle[]>(FALLBACK_NEWS)
  const [selectedArticle, setSelectedArticle] = useState<NewsItem | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      const detected = await detectUserLocation()
      if (!active) return
      setRegion(detected)
      const articles = await fetchLocalNews(detected.city)
      if (active) setExternalNews(articles.length ? articles : FALLBACK_NEWS)
    })().catch(error => {
      console.warn('[notícias] Falha ao carregar região e artigos; mantendo conteúdo local.', error)
      if (active) setExternalNews(FALLBACK_NEWS)
    }).finally(() => { if (active) setRegionLoading(false) })
    return () => { active = false }
  }, [])

  const news = useMemo<NewsItem[]>(() => {
    const platformItems: NewsItem[] = [
      ...incidents.map(item => ({ id: `incident-${item.id}`, category: item.category, title: item.title, date: item.date, summary: item.description, image: item.photoUrl, municipality: item.municipality, kind: 'incident' as const })),
      ...bills.map(item => ({ id: `bill-${item.id}`, category: item.category || 'Câmara', title: item.title, date: item.updatedAt, summary: item.summary, municipality: 'Rio Grande do Norte', kind: 'bill' as const })),
    ]
    return [...externalNews.map(item => toExternalNews(item, region.city)), ...platformItems]
      .sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime())
      .slice(0, 6)
  }, [incidents, bills, externalNews, region.city])

  const hero = news[0]
  const compactStories = news.slice(1)
  const showSkeleton = news.length === 0 && (loading || regionLoading)
  const showingFallback = externalNews.some(item => item.source === FALLBACK_NEWS[0]?.source)

  return <section className="my-10 min-w-0" aria-labelledby="local-news-title">
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
      <div>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">Radar Cidadão · {region.state}</span>
        <h2 id="local-news-title" className="mt-1 font-serif text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">O que está acontecendo no RN</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">Notícias, serviços e decisões que movimentam {region.city} e o Rio Grande do Norte.</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"><MapPinned size={14} className="text-emerald-700" />{region.city}, RN</span>
    </header>

    {showingFallback && !regionLoading && <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-900">Exibindo uma seleção local de referência. As notícias externas estão temporariamente indisponíveis.</p>}

    {showSkeleton ? <NewsSkeleton /> : hero ? <div className="grid min-w-0 gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:gap-5">
      <ArticleAction item={hero} onRead={setSelectedArticle} className="group relative isolate flex min-h-[390px] min-w-0 overflow-hidden rounded-3xl bg-slate-950 text-left shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-xl sm:min-h-[470px]">
        <NewsArtwork item={hero} hero />
        <div className="relative z-10 mt-auto flex w-full flex-col items-start p-5 text-white sm:p-8 lg:p-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-emerald-950">{hero.kind === 'incident' ? 'Urbano' : hero.kind === 'bill' ? 'Em debate' : hero.category}</span>
            <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">{hero.municipality}</span>
          </div>
          <h3 className="max-w-3xl font-serif text-3xl font-bold leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">{hero.title}</h3>
          <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">{hero.summary}</p>
          <div className="mt-6 flex w-full flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4 text-xs text-white/75">
            <span className="flex items-center gap-2"><Clock3 size={14} />{timeLabel(hero)}{hero.source ? ` · ${hero.source}` : ''}</span>
            <span className="inline-flex items-center gap-1.5 font-bold text-white">Ler destaque <ArrowDownRight size={16} /></span>
          </div>
        </div>
      </ArticleAction>

      <div className="flex min-w-0 flex-col gap-3" aria-label="Mais notícias">
        <div className="flex items-center justify-between px-1 pb-1"><h3 className="text-sm font-bold uppercase tracking-[0.13em] text-slate-800">Mais para acompanhar</h3><span className="text-xs text-slate-500">{compactStories.length} matérias</span></div>
        {compactStories.map(item => <ArticleAction key={item.id} item={item} onRead={setSelectedArticle} className="group flex min-w-0 flex-1 gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:border-slate-300 hover:shadow-lg sm:gap-4 sm:p-3.5">
          <div className="relative h-[86px] w-[100px] shrink-0 overflow-hidden rounded-xl bg-slate-900 sm:h-[100px] sm:w-[120px]"><NewsArtwork item={item} /><span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/45 px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider text-white">{item.municipality}</span></div>
          <div className="flex min-w-0 flex-1 flex-col items-start justify-center py-0.5">
            <span className="mb-1.5 line-clamp-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">{item.category}</span>
            <h4 className="line-clamp-3 text-left text-sm font-bold leading-snug text-slate-900 group-hover:text-blue-800 sm:text-[15px]">{item.title}</h4>
            <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500"><Clock3 size={12} />{timeLabel(item)}</span>
          </div>
          <ArrowRight aria-hidden="true" size={16} className="mt-1 shrink-0 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-emerald-700" />
        </ArticleAction>)}
      </div>
    </div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Não há atualizações disponíveis no momento.</div>}

    {selectedArticle && <div className="fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedArticle(null) }}>
      <article role="dialog" aria-modal="true" aria-labelledby="news-dialog-title" className="relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="relative h-48 overflow-hidden bg-slate-900 sm:h-64"><NewsArtwork item={selectedArticle} /><span className="absolute bottom-4 left-5 rounded-full bg-emerald-400 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-950">{selectedArticle.category}</span></div>
        <button type="button" onClick={() => setSelectedArticle(null)} aria-label="Fechar notícia" className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-slate-800 shadow hover:bg-white"><X size={19} /></button>
        <div className="p-5 sm:p-8"><p className="text-xs font-semibold text-slate-500">{selectedArticle.municipality} · {timeLabel(selectedArticle)}</p><h3 id="news-dialog-title" className="mt-3 font-serif text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">{selectedArticle.title}</h3><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{selectedArticle.summary}</p><div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">{selectedArticle.source ? `Fonte: ${selectedArticle.source}` : 'Voz Cidadã RN'}</span><button type="button" onClick={() => setSelectedArticle(null)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200">Fechar</button></div></div>
      </article>
    </div>}
  </section>
}

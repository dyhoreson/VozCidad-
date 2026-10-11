import { Router } from 'express'
import { env } from '../config/env.js'

type NewsArticle = { id: string; title: string; description: string; imageUrl: string | null; url: string; publishedAt: string | null; category: string; source: string }
type CachedNews = { articles: NewsArticle[]; savedAt: number }
type ProviderArticle = { article_id?: unknown; title?: unknown; description?: unknown; content?: unknown; image_url?: unknown; link?: unknown; pubDate?: unknown; category?: unknown; source_id?: unknown }

const router = Router()
const cache = new Map<string, CachedNews>()
const inFlight = new Map<string, Promise<NewsArticle[]>>()
const CACHE_TTL_MS = 15 * 60 * 1000
const allowedCities = new Set(['natal', 'mossoro', 'parnamirim', 'sao goncalo do amarante', 'caico', 'currais novos', 'macau', 'assu', 'macaiba'])

function normalizeCity(value: unknown) {
  if (typeof value !== 'string') return 'Natal'
  const cleaned = value.trim().slice(0, 80)
  const key = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  return allowedCities.has(key) ? cleaned : 'Natal'
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function articleFromProvider(article: ProviderArticle, index: number): NewsArticle | null {
  const title = text(article.title)
  const url = text(article.link)
  if (!title || !url || !/^https:\/\//i.test(url)) return null
  const categoryValue = Array.isArray(article.category) ? article.category[0] : article.category
  return {
    id: text(article.article_id, `${url}-${index}`),
    title,
    description: text(article.description, text(article.content, 'Leia a matéria completa na publicação original.')),
    imageUrl: text(article.image_url) || null,
    url,
    publishedAt: text(article.pubDate) || null,
    category: text(categoryValue, 'Notícias'),
    source: text(article.source_id, 'Fonte externa'),
  }
}

async function fetchNews(city: string): Promise<NewsArticle[]> {
  const cacheKey = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.articles
  const pending = inFlight.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    if (!env.NEWSDATA_API_KEY) return cached?.articles ?? []
    const query = `"${city}" OR "Rio Grande do Norte" OR Natal OR Mossoró OR Parnamirim OR serviços públicos`
    const url = new URL('https://newsdata.io/api/1/latest')
    url.searchParams.set('q', query)
    url.searchParams.set('country', 'br')
    url.searchParams.set('language', 'pt')
    url.searchParams.set('size', '10')
    try {
      const response = await fetch(url, { headers: { 'X-ACCESS-KEY': env.NEWSDATA_API_KEY }, signal: AbortSignal.timeout(8000) })
      if (!response.ok) throw new Error(`NewsData respondeu HTTP ${response.status}`)
      const payload: unknown = await response.json()
      if (!payload || typeof payload !== 'object') throw new Error('Resposta inválida do NewsData.')
      const results = (payload as { results?: unknown }).results
      if (!Array.isArray(results)) throw new Error('A resposta do NewsData não contém artigos.')
      const articles = results.map((item, index) => articleFromProvider(item as ProviderArticle, index)).filter((item): item is NewsArticle => item !== null)
      cache.set(cacheKey, { articles, savedAt: Date.now() })
      return articles
    } catch (error) {
      console.error(JSON.stringify({ level: 'warn', message: 'News provider unavailable; using cached news', city, error: error instanceof Error ? error.message : 'Unknown error' }))
      return cached?.articles ?? []
    }
  })()
  inFlight.set(cacheKey, request)
  try { return await request } finally { inFlight.delete(cacheKey) }
}

router.get('/', async (req, res) => {
  const city = normalizeCity(req.query.city)
  const existing = cache.get(city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR'))
  const articles = await fetchNews(city)
  res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
  res.json({ articles, city, source: articles.length ? (existing ? 'cache-or-newsdata' : 'newsdata') : 'platform-fallback' })
})

export { router as newsRouter }

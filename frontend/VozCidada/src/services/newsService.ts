export type LocalNewsArticle = {
  id: string
  title: string
  description: string
  imageUrl: string | null
  url: string
  publishedAt: string | null
  category: string
  source: string
}

type CachedNews = { articles: LocalNewsArticle[]; savedAt: number }
type NewsResponse = { articles?: unknown }

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:5000'
const CACHE_TTL_MS = 30 * 60 * 1000
const STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const FALLBACK_SOURCE = 'Voz Cidadã · conteúdo local de referência'
const memoryCache = new Map<string, CachedNews>()
const inFlight = new Map<string, Promise<LocalNewsArticle[]>>()

/**
 * Conteúdo editorial de reserva. Não representa notícia factual ou evento atual;
 * fica disponível quando a API externa está fora do ar ou sem resultados.
 */
export const FALLBACK_NEWS: LocalNewsArticle[] = [
  {
    id: 'rn-mobilidade-urbana',
    title: 'Mobilidade urbana: acompanhe melhorias e pontos críticos da sua cidade',
    description: 'Consulte os canais oficiais do seu município para acompanhar intervenções viárias, transporte público e ações de segurança no trânsito.',
    imageUrl: null,
    url: 'https://www.rn.gov.br/',
    publishedAt: null,
    category: 'Mobilidade',
    source: FALLBACK_SOURCE,
  },
  {
    id: 'rn-saneamento',
    title: 'Saneamento e abastecimento: saiba onde buscar informações oficiais',
    description: 'Em caso de dúvidas sobre água, esgoto ou interrupções no serviço, consulte os comunicados e canais de atendimento da Caern.',
    imageUrl: null,
    url: 'https://www.caern.com.br/',
    publishedAt: null,
    category: 'Serviços públicos',
    source: FALLBACK_SOURCE,
  },
  {
    id: 'rn-energia',
    title: 'Energia elétrica: canais para informar ocorrências e consultar avisos',
    description: 'Problemas na rede elétrica devem ser comunicados diretamente à concessionária. Em situações de risco, mantenha distância dos cabos.',
    imageUrl: null,
    url: 'https://www.neoenergia.com/rio-grande-do-norte',
    publishedAt: null,
    category: 'Serviços públicos',
    source: FALLBACK_SOURCE,
  },
  {
    id: 'rn-participacao-cidada',
    title: 'Participação cidadã: registre problemas urbanos com localização e detalhes',
    description: 'Relatos claros, com município, endereço aproximado e descrição objetiva, ajudam a comunidade a acompanhar demandas locais.',
    imageUrl: null,
    url: 'https://www.rn.gov.br/',
    publishedAt: null,
    category: 'Cidadania',
    source: FALLBACK_SOURCE,
  },
  {
    id: 'rn-transparencia-publica',
    title: 'Transparência pública: acompanhe serviços e decisões no Rio Grande do Norte',
    description: 'Portais oficiais permitem consultar informações sobre serviços, orçamento e ações dos órgãos públicos estaduais e municipais.',
    imageUrl: null,
    url: 'https://www.transparencia.rn.gov.br/',
    publishedAt: null,
    category: 'Transparência',
    source: FALLBACK_SOURCE,
  },
]

function cacheKey(city: string) {
  return `voz-cidada-news-v1-${city.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`
}

function readCache(city: string): CachedNews | null {
  const key = cacheKey(city)
  const memory = memoryCache.get(key)
  if (memory) return memory
  try {
    const saved = localStorage.getItem(key)
    if (!saved) return null
    const parsed = JSON.parse(saved) as CachedNews
    if (Array.isArray(parsed.articles) && typeof parsed.savedAt === 'number') {
      memoryCache.set(key, parsed)
      return parsed
    }
  } catch {
    // Storage may be unavailable in private browsing or WebViews.
  }
  return null
}

function isArticle(value: unknown): value is LocalNewsArticle {
  if (!value || typeof value !== 'object') return false
  const article = value as Partial<LocalNewsArticle>
  return typeof article.id === 'string'
    && typeof article.title === 'string'
    && typeof article.description === 'string'
    && typeof article.url === 'string'
    && /^https:\/\//i.test(article.url)
}

function saveCache(city: string, articles: LocalNewsArticle[]) {
  const value = { articles, savedAt: Date.now() }
  memoryCache.set(cacheKey(city), value)
  try {
    localStorage.setItem(cacheKey(city), JSON.stringify(value))
  } catch {
    // Cache is optional; the current response remains usable without it.
  }
}

function fallbackOrCache(city: string, cached: CachedNews | null): LocalNewsArticle[] {
  if (cached && Date.now() - cached.savedAt < STALE_TTL_MS && cached.articles.length > 0) return cached.articles
  console.info(`[notícias] Exibindo conteúdo local de reserva para ${city}.`)
  return FALLBACK_NEWS
}

/** Calls the backend proxy; the Newsdata secret must stay on the server. */
export async function fetchLocalNews(city: string): Promise<LocalNewsArticle[]> {
  const cached = readCache(city)
  if (cached && cached.articles.length > 0 && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.articles

  const key = cacheKey(city)
  const pending = inFlight.get(key)
  if (pending) return pending

  const request = (async () => {
    try {
      const url = new URL(`${API_BASE_URL}/api/news`)
      url.searchParams.set('city', city)
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(7000),
      })
      if (!response.ok) throw new Error(`Endpoint de notícias respondeu HTTP ${response.status}`)

      const payload = await response.json() as NewsResponse
      const articles = Array.isArray(payload.articles) ? payload.articles.filter(isArticle) : []
      if (articles.length > 0) {
        saveCache(city, articles)
        return articles
      }
      console.warn(`[notícias] O endpoint não retornou artigos para ${city}.`)
      return fallbackOrCache(city, cached)
    } catch (error) {
      console.warn('[notícias] Falha ao consultar o backend; usando cache ou conteúdo local.', error)
      return fallbackOrCache(city, cached)
    }
  })()

  inFlight.set(key, request)
  try {
    return await request
  } finally {
    inFlight.delete(key)
  }
}

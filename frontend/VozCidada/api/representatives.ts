type Request = { method?: string }
type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
}

type ApiRecord = Record<string, unknown>
type ChamberPayload = { dados?: unknown; links?: unknown }
type Representative = {
  id: string
  name: string
  party: string
  state: string
  photoUrl: string | null
  profileUrl: string
  office: 'Deputado federal' | 'Senador'
}

function records(value: unknown): ApiRecord[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ApiRecord => typeof item === 'object' && item !== null && !Array.isArray(item))
}

function value(record: ApiRecord, key: string): string {
  const item = record[key]
  return typeof item === 'string' || typeof item === 'number' ? String(item).trim() : ''
}

async function chamberDeputies(): Promise<Representative[]> {
  const base = new URL('https://dadosabertos.camara.leg.br/api/v2/deputados')
  base.searchParams.set('ordem', 'ASC')
  base.searchParams.set('ordenarPor', 'nome')
  base.searchParams.set('itens', '100')
  const fetchPage = async (url: URL): Promise<ChamberPayload> => {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) })
    if (!response.ok) throw new Error(`Câmara dos Deputados respondeu HTTP ${response.status}.`)
    return await response.json() as ChamberPayload
  }
  const first = await fetchPage(base)
  const pages = Array.isArray(first.links) ? first.links : []
  const lastLink = pages.find((link): link is { rel: string; href: string } =>
    typeof link === 'object' && link !== null && 'rel' in link && link.rel === 'last' && 'href' in link && typeof link.href === 'string',
  )
  if (!lastLink && records(first.dados).length >= 100) throw new Error('A API da Câmara não informou todas as páginas de deputados.')
  const lastPage = lastLink ? Number(new URL(lastLink.href).searchParams.get('pagina')) : 1
  if (!Number.isInteger(lastPage) || lastPage < 1 || lastPage > 20) throw new Error('A API da Câmara retornou uma paginação inválida.')
  const rest = await Promise.all(Array.from({ length: lastPage - 1 }, async (_, index) => {
    const pageUrl = new URL(base)
    pageUrl.searchParams.set('pagina', String(index + 2))
    return records((await fetchPage(pageUrl)).dados)
  }))
  return [records(first.dados), ...rest].flat().map(record => {
    const id = value(record, 'id')
    return {
      id: `camara-${id}`,
      name: value(record, 'nome') || 'Deputado sem nome informado',
      party: value(record, 'siglaPartido') || 'Partido não informado',
      state: value(record, 'siglaUf').toUpperCase(),
      photoUrl: value(record, 'urlFoto') || null,
      profileUrl: `https://www.camara.leg.br/deputados/${encodeURIComponent(id)}`,
      office: 'Deputado federal' as const,
    }
  })
}

function xmlText(parent: string, tag: string): string {
  const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i').exec(parent)
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim() ?? ''
}

async function senateMembers(): Promise<Representative[]> {
  const url = new URL('https://legis.senado.leg.br/dadosabertos/senador/lista/atual')
  url.searchParams.set('formato', 'json')
  const response = await fetch(url, { headers: { Accept: 'application/xml, application/json;q=0.9' }, signal: AbortSignal.timeout(12_000) })
  if (!response.ok) throw new Error(`Senado Federal respondeu HTTP ${response.status}.`)
  const body = await response.text()
  const documentBlocks = [...body.matchAll(/<IdentificacaoParlamentar\b[^>]*>([\s\S]*?)<\/IdentificacaoParlamentar>/gi)]
  if (!documentBlocks.length) throw new Error('Senado Federal retornou uma lista de parlamentares vazia ou inválida.')
  return documentBlocks.flatMap(([, block]) => {
    const id = xmlText(block, 'CodigoParlamentar')
    const name = xmlText(block, 'NomeParlamentar')
    if (!id || !name) return []
    const profile = xmlText(block, 'UrlPaginaParlamentar')
    const photo = xmlText(block, 'UrlFotoParlamentar')
    return [{
      id: `senado-${id}`,
      name,
      party: xmlText(block, 'SiglaPartidoParlamentar') || 'Partido não informado',
      state: xmlText(block, 'UfParlamentar').toUpperCase(),
      photoUrl: photo.replace(/^http:/i, 'https:') || null,
      profileUrl: profile.replace(/^http:/i, 'https:') || `https://www25.senado.leg.br/web/senadores/senador/-/perfil/${encodeURIComponent(id)}`,
      office: 'Senador' as const,
    }]
  })
}

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const results = await Promise.allSettled([chamberDeputies(), senateMembers()])
  const errors = results.flatMap(result => result.status === 'rejected'
    ? [result.reason instanceof Error ? result.reason.message : 'Uma fonte legislativa não respondeu.']
    : [])
  const representatives = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  if (!representatives.length) {
    res.status(502).json({ error: errors.join(' ') || 'As fontes oficiais não retornaram representantes.' })
    return
  }
  res.status(200).json({ representatives, errors })
}

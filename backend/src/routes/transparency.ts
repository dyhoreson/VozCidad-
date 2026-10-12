import { Router, type Request, type Response } from 'express'
import { env } from '../config/env.js'

const router = Router()
const federalApiBase = 'https://api.portaldatransparencia.gov.br/api-de-dados'
const assemblyApiBase = 'https://api-transparencia.al.rn.leg.br'
const federalResources = new Set(['contratos', 'licitacoes', 'emendas', 'despesas/por-orgao', 'transferencias/por-municipio'])
const federalQueryParameters = new Set([
  'pagina',
  'codigoOrgao',
  'orgaoSuperior',
  'ano',
  'dataInicial',
  'dataFinal',
  'codigoIBGE',
])
const assemblySearchTerms = [
  { category: 'Contratos', query: 'contratos' },
  { category: 'Licitações', query: 'licitações' },
  { category: 'Despesas', query: 'despesas' },
]

function appendFederalQuery(source: Request, destination: URL): boolean {
  for (const [name, value] of Object.entries(source.query)) {
    if (!federalQueryParameters.has(name) || typeof value !== 'string' || value.length > 80) return false
    destination.searchParams.set(name, value)
  }
  return true
}

async function proxyFederalRequest(req: Request, res: Response, resource: string) {
  if (!federalResources.has(resource)) {
    res.status(404).json({ error: 'Consulta federal de transparência não reconhecida.' })
    return
  }
  if (!env.PORTAL_TRANSPARENCIA_API_KEY) {
    res.status(503).json({ error: 'A integração com o Portal da Transparência ainda não foi habilitada no servidor.' })
    return
  }

  const target = new URL(`${federalApiBase}/${resource}`)
  if (!appendFederalQuery(req, target)) {
    res.status(400).json({ error: 'Os filtros da consulta de transparência são inválidos.' })
    return
  }

  try {
    const upstream = await fetch(target, {
      headers: {
        Accept: 'application/json',
        'chave-api-dados': env.PORTAL_TRANSPARENCIA_API_KEY,
      },
      signal: AbortSignal.timeout(12_000),
    })
    if (!upstream.ok) {
      console.warn(JSON.stringify({ level: 'warn', message: 'Federal transparency API returned an error', status: upstream.status, resource }))
      res.status(upstream.status).json({ error: `O Portal da Transparência respondeu com HTTP ${upstream.status}.` })
      return
    }

    const payload: unknown = await upstream.json()
    res.setHeader('Cache-Control', 'private, max-age=60')
    res.json(payload)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    console.error(JSON.stringify({
      level: 'error',
      message: timedOut ? 'Federal transparency API timed out' : 'Could not reach federal transparency API',
      resource,
    }))
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? 'O Portal da Transparência demorou para responder. Tente novamente.'
        : 'Não foi possível conectar ao Portal da Transparência. Tente novamente.',
    })
  }
}

router.get('/federal/transferencias/por-municipio', async (req, res) => {
  await proxyFederalRequest(req, res, 'transferencias/por-municipio')
})

router.get('/federal/despesas/por-orgao', async (req, res) => {
  await proxyFederalRequest(req, res, 'despesas/por-orgao')
})

router.get('/federal/:resource', async (req, res) => {
  await proxyFederalRequest(req, res, req.params.resource)
})

router.get('/local/alrn', async (_req, res) => {
  try {
    const responses = await Promise.all(assemblySearchTerms.map(async ({ category, query }) => {
      const target = new URL('/search', assemblyApiBase)
      target.searchParams.set('query', query)
      const response = await fetch(target, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) throw new Error(`A API da Assembleia respondeu com HTTP ${response.status}.`)
      const payload: unknown = await response.json()
      if (!Array.isArray(payload)) throw new Error('A API da Assembleia retornou um formato de dados inesperado.')
      return { category, records: payload }
    }))

    const records = new Map<string, { id: string; title: string; description: string; date: null; sourceUrl: string; matchedQuery: string }>()
    for (const { category, records: searchRecords } of responses) {
      for (const value of searchRecords) {
        if (!value || typeof value !== 'object') continue
        const record = value as { title?: unknown; link?: unknown; conteudo?: unknown }
        if (typeof record.title !== 'string' || typeof record.link !== 'string' || typeof record.conteudo !== 'string') continue
        if (!record.link.startsWith('/') || record.link.startsWith('//')) continue
        const sourceUrl = new URL(record.link, 'https://transparencia.al.rn.leg.br').toString()
        records.set(sourceUrl, {
          id: sourceUrl,
          title: record.title.trim(),
          description: record.conteudo.trim().slice(0, 500),
          date: null,
          sourceUrl,
          matchedQuery: category,
        })
      }
    }

    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=900')
    res.json({ records: [...records.values()].slice(0, 60) })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    console.error(JSON.stringify({
      level: 'error',
      message: timedOut ? 'Assembly transparency API timed out' : 'Could not retrieve Assembly transparency results',
    }))
    res.status(timedOut ? 504 : 502).json({
      error: timedOut
        ? 'O portal da Assembleia demorou para responder. Tente novamente.'
        : error instanceof Error ? error.message : 'Não foi possível consultar o portal da Assembleia.',
    })
  }
})

export { router as transparencyRouter }

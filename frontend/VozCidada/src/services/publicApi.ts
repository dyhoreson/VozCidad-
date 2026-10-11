const REQUEST_TIMEOUT_MS = 12_000
const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504])
const RETRY_DELAY_MS = 500

export type PublicApiRecord = Record<string, unknown>

export function isRecord(value: unknown): value is PublicApiRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function recordsFromPayload(payload: unknown): PublicApiRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) throw new Error('A API retornou um formato de dados não reconhecido.')

  for (const key of ['dados', 'items', 'data', 'content', 'results']) {
    if (key in payload) {
      const value = payload[key]
      if (Array.isArray(value)) return value.filter(isRecord)
      throw new Error(`A API retornou um campo "${key}" que não contém uma lista de registros.`)
    }
  }

  throw new Error('A API não retornou uma lista nos campos dados, items, data, content ou results.')
}

export function textValue(record: PublicApiRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

export function numberValue(record: PublicApiRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim()) {
      const normalized = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.')
      const parsed = Number(normalized)
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return null
}

async function requestWithRetry(url: URL, source: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    } catch (cause) {
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
        continue
      }
      const reason = cause instanceof Error && cause.name === 'TimeoutError'
        ? 'a solicitação excedeu o tempo limite'
        : 'não foi possível conectar à API'
      throw new Error(`${source}: ${reason}. Tente novamente mais tarde.`, { cause })
    }

    if (attempt === 0 && TRANSIENT_HTTP_STATUSES.has(response.status)) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      continue
    }
    return response
  }

  throw new Error(`${source}: não foi possível concluir a solicitação. Tente novamente mais tarde.`)
}

export async function requestJson(url: URL, source: string, headers: HeadersInit = {}): Promise<unknown> {
  const response = await requestWithRetry(url, source, {
    headers: { Accept: 'application/json', ...headers },
  })

  if (!response.ok) {
    let detail = ''
    try {
      const payload: unknown = await response.json()
      if (isRecord(payload) && typeof payload.error === 'string') detail = ` ${payload.error}`
    } catch {
      // Preserve the HTTP status when an upstream error body is not JSON.
    }
    throw new Error(`${source}: a API respondeu com HTTP ${response.status}.${detail} Tente novamente mais tarde.`)
  }

  try {
    return await response.json() as unknown
  } catch (cause) {
    throw new Error(`${source}: a API retornou uma resposta JSON inválida.`, { cause })
  }
}

export async function requestText(url: URL, source: string, headers: HeadersInit = {}): Promise<string> {
  const response = await requestWithRetry(url, source, {
    headers: { Accept: 'application/xml, text/xml, application/json;q=0.9', ...headers },
  })

  if (!response.ok) throw new Error(`${source}: a API respondeu com HTTP ${response.status}. Tente novamente mais tarde.`)
  return response.text()
}

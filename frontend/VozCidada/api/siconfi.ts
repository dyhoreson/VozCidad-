type Request = {
  method?: string
  url?: string
}

type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
}

const SICONFI_API = 'https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/rreo'

export default async function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Método não permitido.' })
    return
  }

  const requestUrl = new URL(req.url ?? '/', 'https://vozcidada.local')
  const year = requestUrl.searchParams.get('year')
  const period = requestUrl.searchParams.get('period')
  if (!year || !/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > new Date().getFullYear()) {
    res.status(400).json({ error: 'Informe um exercício válido para consultar o SICONFI.' })
    return
  }
  if (!period || !/^[1-6]$/.test(period)) {
    res.status(400).json({ error: 'O bimestre do RREO deve estar entre 1 e 6.' })
    return
  }

  const url = new URL(SICONFI_API)
  url.searchParams.set('an_exercicio', year)
  url.searchParams.set('nr_periodo', period)
  url.searchParams.set('co_tipo_demonstrativo', 'RREO')
  url.searchParams.set('no_anexo', 'RREO-Anexo 01')
  url.searchParams.set('co_esfera', 'M')
  url.searchParams.set('id_ente', '2408102')

  let response: globalThis.Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (cause) {
    const reason = cause instanceof Error && cause.name === 'TimeoutError'
      ? 'A consulta ao SICONFI excedeu o tempo limite.'
      : 'Não foi possível conectar ao SICONFI.'
    res.status(502).json({ error: `${reason} Tente novamente mais tarde.` })
    return
  }

  if (!response.ok) {
    res.status(502).json({ error: `O SICONFI respondeu com HTTP ${response.status}.` })
    return
  }

  try {
    res.status(200).json(await response.json() as unknown)
  } catch {
    res.status(502).json({ error: 'O SICONFI retornou uma resposta JSON inválida.' })
  }
}

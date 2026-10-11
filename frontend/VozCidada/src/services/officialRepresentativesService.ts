export type OfficialRepresentative = {
  id: string
  name: string
  party: string
  state: string
  photoUrl: string | null
  profileUrl: string
  office: 'Deputado federal' | 'Senador'
}

export async function listOfficialRepresentatives(): Promise<{ representatives: OfficialRepresentative[]; warnings: string[] }> {
  let response: Response
  try {
    response = await fetch('/api/representatives', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
  } catch (cause) {
    const reason = cause instanceof Error && cause.name === 'TimeoutError'
      ? 'A consulta aos representantes oficiais excedeu o tempo limite.'
      : 'Não foi possível conectar ao serviço de representantes oficiais.'
    throw new Error(`${reason} Tente novamente mais tarde.`, { cause })
  }
  let payload: unknown
  try {
    payload = await response.json() as unknown
  } catch (cause) {
    throw new Error('O serviço de representantes oficiais retornou uma resposta inválida.', { cause })
  }
  if (!response.ok) {
    const message = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : `O serviço de representantes oficiais respondeu HTTP ${response.status}.`
    throw new Error(message)
  }
  if (!payload || typeof payload !== 'object' || !('representatives' in payload) || !Array.isArray(payload.representatives)) {
    throw new Error('O serviço de representantes oficiais retornou uma lista inválida.')
  }
  const representatives = payload.representatives.filter((item): item is OfficialRepresentative =>
    Boolean(item) && typeof item === 'object' && 'id' in item && typeof item.id === 'string' &&
    'name' in item && typeof item.name === 'string' && 'state' in item && typeof item.state === 'string' &&
    'party' in item && typeof item.party === 'string' && 'profileUrl' in item && typeof item.profileUrl === 'string' &&
    'office' in item && (item.office === 'Senador' || item.office === 'Deputado federal'),
  )
  const warnings = 'errors' in payload && Array.isArray(payload.errors)
    ? payload.errors.filter((item): item is string => typeof item === 'string')
    : []
  return { representatives, warnings }
}

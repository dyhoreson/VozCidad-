export type ElectedOffice =
  | 'Presidente da República'
  | 'Prefeito'
  | 'Governador'
  | 'Deputado estadual'
  | 'Deputado distrital'
  | 'Vereador'

export type ElectedOfficial = {
  id: string
  name: string
  party: string
  state: string
  municipality: string | null
  municipalityCode: string | null
  office: ElectedOffice
  photoUrl: string | null
  profileUrl: string
  electionYear: number
  term: string
  sourceUrl: string
}

type ElectionDataset = {
  year: number
  path: string
}

const datasets: ElectionDataset[] = [
  { year: 2022, path: '/data/elected-politicians-2022.json' },
  { year: 2024, path: '/data/elected-politicians-2024.json' },
]

const offices = new Set<ElectedOffice>([
  'Presidente da República',
  'Prefeito',
  'Governador',
  'Deputado estadual',
  'Deputado distrital',
  'Vereador',
])

function isElectedOfficial(value: unknown): value is ElectedOfficial {
  if (!value || typeof value !== 'object') return false
  const person = value as Partial<ElectedOfficial>
  return typeof person.id === 'string'
    && typeof person.name === 'string'
    && typeof person.party === 'string'
    && typeof person.state === 'string'
    && (typeof person.municipality === 'string' || person.municipality === null)
    && (typeof person.municipalityCode === 'string' || person.municipalityCode === null)
    && typeof person.office === 'string'
    && offices.has(person.office as ElectedOffice)
    && (typeof person.photoUrl === 'string' || person.photoUrl === null)
    && typeof person.profileUrl === 'string'
    && typeof person.electionYear === 'number'
    && Number.isInteger(person.electionYear)
    && person.electionYear >= 2022
    && person.electionYear <= 2028
    && typeof person.term === 'string'
    && typeof person.sourceUrl === 'string'
}

async function fetchElectionDataset(dataset: ElectionDataset): Promise<ElectedOfficial[]> {
  let response: Response
  try {
    response = await fetch(dataset.path, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
  } catch (cause) {
    const reason = cause instanceof Error && cause.name === 'TimeoutError'
      ? 'o download dos dados eleitorais excedeu o tempo limite'
      : 'não foi possível conectar ao arquivo eleitoral'
    throw new Error(`TSE ${dataset.year}: ${reason}.`, { cause })
  }
  if (!response.ok) throw new Error(`TSE ${dataset.year}: o arquivo respondeu HTTP ${response.status}.`)

  let payload: unknown
  try {
    payload = await response.json() as unknown
  } catch (cause) {
    throw new Error(`TSE ${dataset.year}: o arquivo de eleitos não contém JSON válido.`, { cause })
  }
  if (!Array.isArray(payload)) throw new Error(`TSE ${dataset.year}: o arquivo não contém uma lista de eleitos.`)

  const people = payload.filter(isElectedOfficial)
  if (people.length === 0) throw new Error(`TSE ${dataset.year}: o arquivo não contém cargos eleitos reconhecidos.`)
  return people
}

export async function listElectedOfficials(): Promise<{ officials: ElectedOfficial[]; warnings: string[] }> {
  const results = await Promise.allSettled(datasets.map(fetchElectionDataset))
  const officials = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
  const warnings = results.flatMap(result => result.status === 'rejected'
    ? [result.reason instanceof Error ? result.reason.message : 'Uma base eleitoral do TSE não pôde ser carregada.']
    : [])

  if (officials.length === 0) {
    throw new Error(warnings.join(' ') || 'Os arquivos oficiais do TSE não retornaram representantes eleitos.')
  }
  return { officials, warnings }
}

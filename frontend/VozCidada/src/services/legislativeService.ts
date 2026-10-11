import { numberValue, recordsFromPayload, requestJson, textValue, type PublicApiRecord } from './publicApi'
import { listOfficialRepresentatives, type OfficialRepresentative } from './officialRepresentativesService'

const CHAMBER_API = 'https://dadosabertos.camara.leg.br/api/v2'

export type FederalDeputy = {
  id: number
  name: string
  party: string
  state: string
  photoUrl: string | null
  profileUrl: string
}

export type Senator = {
  id: string
  name: string
  party: string
  state: string
  photoUrl: string | null
  profileUrl: string
}

export type LegislativeProposal = {
  id: number
  kind: string
  number: number
  year: number
  summary: string
  presentedAt: string | null
  url: string
}

export type DeputyExpense = {
  id: string
  category: string
  supplier: string
  documentDate: string | null
  amount: number
  documentUrl: string | null
}

function requiredNumber(record: PublicApiRecord, key: string, source: string): number {
  const value = numberValue(record, key)
  if (value === null) throw new Error(`${source}: a resposta contém um registro sem ${key}.`)
  return value
}

function mapDeputy(record: PublicApiRecord): FederalDeputy {
  const id = requiredNumber(record, 'id', 'Câmara dos Deputados')
  return {
    id,
    name: textValue(record, 'nome') ?? 'Parlamentar sem nome informado',
    party: textValue(record, 'siglaPartido') ?? 'Partido não informado',
    state: textValue(record, 'siglaUf') ?? 'UF não informada',
    photoUrl: textValue(record, 'urlFoto'),
    profileUrl: `https://www.camara.leg.br/deputados/${id}`,
  }
}

export async function fetchFederalDeputies(options: { state?: string; limit?: number } = {}): Promise<FederalDeputy[]> {
  const url = new URL(`${CHAMBER_API}/deputados`)
  url.searchParams.set('ordem', 'ASC')
  url.searchParams.set('ordenarPor', 'nome')
  url.searchParams.set('itens', String(Math.min(Math.max(options.limit ?? 20, 1), 100)))
  if (options.state) url.searchParams.set('siglaUf', options.state.toUpperCase())

  const payload = await requestJson(url, 'Câmara dos Deputados')
  return recordsFromPayload(payload).map(mapDeputy)
}

export async function fetchAllFederalDeputies(): Promise<FederalDeputy[]> {
  const { representatives, warnings } = await listOfficialRepresentatives()
  const deputies = representatives.filter(person => person.office === 'Deputado federal')
  if (!deputies.length) {
    throw new Error(warnings.join(' ') || 'A fonte oficial não retornou deputados federais.')
  }
  return deputies.map(mapOfficialDeputy)
}

function mapOfficialDeputy(person: OfficialRepresentative): FederalDeputy {
  const id = Number(person.id.replace(/^camara-/, ''))
  if (!Number.isInteger(id) || id <= 0) throw new Error('A API oficial retornou um código inválido de deputado.')
  return { id, name: person.name, party: person.party, state: person.state, photoUrl: person.photoUrl, profileUrl: person.profileUrl }
}

export async function fetchDeputyExpenses(
  deputyId: number,
  options: { year?: number; limit?: number } = {},
): Promise<DeputyExpense[]> {
  if (!Number.isInteger(deputyId) || deputyId <= 0) throw new Error('Informe um código válido de deputado.')

  const url = new URL(`${CHAMBER_API}/deputados/${deputyId}/despesas`)
  url.searchParams.set('ano', String(options.year ?? new Date().getFullYear()))
  url.searchParams.set('ordem', 'DESC')
  url.searchParams.set('ordenarPor', 'mes')
  url.searchParams.set('itens', String(Math.min(Math.max(options.limit ?? 5, 1), 100)))

  const payload = await requestJson(url, 'Despesas da Câmara dos Deputados')
  return recordsFromPayload(payload).map((record, index) => ({
    id: textValue(record, 'codDocumento', 'numDocumento') ?? `${deputyId}-${index}`,
    category: textValue(record, 'tipoDespesa') ?? 'Despesa parlamentar',
    supplier: textValue(record, 'nomeFornecedor') ?? 'Fornecedor não informado',
    documentDate: textValue(record, 'dataDocumento'),
    amount: numberValue(record, 'valorLiquido', 'valorDocumento') ?? 0,
    documentUrl: textValue(record, 'urlDocumento'),
  }))
}

export async function fetchRecentProposals(limit = 10): Promise<LegislativeProposal[]> {
  const url = new URL(`${CHAMBER_API}/proposicoes`)
  url.searchParams.set('ordem', 'DESC')
  url.searchParams.set('ordenarPor', 'id')
  url.searchParams.set('itens', String(Math.min(Math.max(limit, 1), 100)))

  const payload = await requestJson(url, 'Proposições da Câmara dos Deputados')
  return recordsFromPayload(payload).map(record => {
    const id = requiredNumber(record, 'id', 'Câmara dos Deputados')
    return {
      id,
      kind: textValue(record, 'siglaTipo') ?? 'Proposição',
      number: numberValue(record, 'numero') ?? id,
      year: numberValue(record, 'ano') ?? new Date().getFullYear(),
      summary: textValue(record, 'ementa') ?? 'Ementa não informada.',
      presentedAt: textValue(record, 'dataApresentacao'),
      url: `https://www.camara.leg.br/propostas-legislativas/${id}`,
    }
  })
}

export async function fetchSenators(state?: string): Promise<Senator[]> {
  const { representatives, warnings } = await listOfficialRepresentatives()
  const senators = representatives.filter(person => person.office === 'Senador')
  if (!senators.length) throw new Error(warnings.join(' ') || 'A fonte oficial não retornou senadores.')
  return senators
    .filter(person => !state || person.state.toUpperCase() === state.toUpperCase())
    .map(person => ({
      id: person.id.replace(/^senado-/, ''),
      name: person.name,
      party: person.party,
      state: person.state,
      photoUrl: person.photoUrl,
      profileUrl: person.profileUrl,
    }))
}

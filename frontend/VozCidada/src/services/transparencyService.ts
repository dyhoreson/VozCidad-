import { isRecord, numberValue, recordsFromPayload, requestJson, textValue, type PublicApiRecord } from './publicApi'

const DEFAULT_PORTAL_API = 'https://api.portaldatransparencia.gov.br/api-de-dados'

type PortalRecordFilters = {
  page?: number
  agencyCode?: string
  superiorAgencyCode?: string
  year?: number
  startDate?: string
  endDate?: string
  municipalityCode?: string
}

export type ExecutiveAnnualExpense = {
  year: number
  organization: string
  organizationCode: string
  superiorOrganization: string
  committed: number | null
  settled: number | null
  paid: number | null
}

export type FederalAmendment = {
  id: string
  year: number
  kind: string
  author: string
  number: string
  destination: string
  function: string
  committed: number | null
  settled: number | null
  paid: number | null
}

function nestedText(value: unknown, ...keys: string[]): string | null {
  return isRecord(value) ? textValue(value, ...keys) : null
}

export type PublicContract = {
  id: string
  number: string
  agency: string
  supplier: string
  description: string
  amount: number | null
  signedAt: string | null
  url: string | null
}

export type PublicProcurement = {
  id: string
  number: string
  agency: string
  modality: string
  status: string
  description: string
  estimatedAmount: number | null
  openingAt: string | null
  url: string | null
}

export type PublicTransfer = {
  id: string
  recipient: string
  agency: string
  description: string
  amount: number | null
  transferredAt: string | null
  url: string | null
}

export type SiconfiRevenue = {
  accountCode: string
  account: string
  forecast: number | null
  accumulated: number | null
}

export type SiconfiBudgetReport = {
  entity: string
  year: number
  period: number
  revenues: SiconfiRevenue[]
}

export function isPortalTransparencyConfigured(): boolean {
  return isPortalProxyConfigured() || Boolean(import.meta.env.VITE_PORTAL_TRANSPARENCIA_KEY?.trim())
}

function portalUrl(path: string, filters: PortalRecordFilters): URL {
  const base = (import.meta.env.VITE_PORTAL_TRANSPARENCIA_API_URL || DEFAULT_PORTAL_API).replace(/\/+$/, '')
  const url = new URL(`${base}/${path.replace(/^\/+/, '')}`)
  url.searchParams.set('pagina', String(Math.max(1, filters.page ?? 1)))
  if (filters.agencyCode) url.searchParams.set('codigoOrgao', filters.agencyCode)
  if (filters.superiorAgencyCode) url.searchParams.set('orgaoSuperior', filters.superiorAgencyCode)
  if (filters.year) url.searchParams.set('ano', String(filters.year))
  if (filters.startDate) url.searchParams.set('dataInicial', filters.startDate)
  if (filters.endDate) url.searchParams.set('dataFinal', filters.endDate)
  if (filters.municipalityCode) url.searchParams.set('codigoIBGE', filters.municipalityCode)
  return url
}

function isPortalProxyConfigured(): boolean {
  return Boolean(import.meta.env.VITE_PORTAL_TRANSPARENCIA_API_URL?.trim())
}

async function fetchPortalRecords(path: string, label: string, filters: PortalRecordFilters): Promise<PublicApiRecord[]> {
  const apiKey = import.meta.env.VITE_PORTAL_TRANSPARENCIA_KEY?.trim()
  if (!apiKey && !isPortalProxyConfigured()) {
    throw new Error('Configure VITE_PORTAL_TRANSPARENCIA_KEY ou um proxy em VITE_PORTAL_TRANSPARENCIA_API_URL para consultar o Portal da Transparência.')
  }
  const headers: HeadersInit = apiKey && !isPortalProxyConfigured() ? { 'chave-api-dados': apiKey } : {}
  const payload = await requestJson(portalUrl(path, filters), label, headers)
  return recordsFromPayload(payload)
}

export async function fetchPublicContracts(filters: PortalRecordFilters = {}): Promise<PublicContract[]> {
  const records = await fetchPortalRecords('contratos', 'Contratos do Portal da Transparência', filters)
  return records.map((record, index) => ({
    id: textValue(record, 'id', 'numero', 'contrato') ?? `contrato-${index}`,
    number: textValue(record, 'numero', 'numeroContrato', 'id') ?? 'Número não informado',
    agency: nestedText(record.orgaoVinculado, 'nome') ?? textValue(record, 'orgao', 'nomeOrgao') ?? 'Órgão não informado',
    supplier: nestedText(record.fornecedor, 'nome', 'razaoSocial') ?? textValue(record, 'nomeFornecedor', 'fornecedor') ?? 'Fornecedor não informado',
    description: textValue(record, 'objeto', 'descricao') ?? 'Objeto não informado.',
    amount: numberValue(record, 'valorFinal', 'valorInicial', 'valor'),
    signedAt: textValue(record, 'dataAssinatura', 'dataInicioVigencia'),
    url: textValue(record, 'url', 'urlDetalhamento'),
  }))
}

export async function fetchPublicProcurements(filters: PortalRecordFilters = {}): Promise<PublicProcurement[]> {
  const records = await fetchPortalRecords('licitacoes', 'Licitações do Portal da Transparência', filters)
  return records.map((record, index) => ({
    id: textValue(record, 'id', 'numero', 'codigo') ?? `licitacao-${index}`,
    number: textValue(record, 'numero', 'numeroLicitacao', 'id') ?? 'Número não informado',
    agency: nestedText(record.orgao, 'nome') ?? textValue(record, 'nomeOrgao', 'orgaoVinculado') ?? 'Órgão não informado',
    modality: nestedText(record.modalidade, 'descricao') ?? textValue(record, 'modalidade', 'nomeModalidade') ?? 'Modalidade não informada',
    status: textValue(record, 'situacao', 'status') ?? 'Status não informado',
    description: textValue(record, 'objeto', 'descricao') ?? 'Objeto não informado.',
    estimatedAmount: numberValue(record, 'valorEstimado', 'valor'),
    openingAt: textValue(record, 'dataAbertura', 'data'),
    url: textValue(record, 'url', 'urlDetalhamento'),
  }))
}

export async function fetchPublicTransfers(filters: PortalRecordFilters = {}): Promise<PublicTransfer[]> {
  const records = await fetchPortalRecords('transferencias/por-municipio', 'Repasses do Portal da Transparência', filters)
  return records.map((record, index) => ({
    id: textValue(record, 'id', 'codigo', 'numero') ?? `repasse-${index}`,
    recipient: nestedText(record.beneficiario, 'nome') ?? textValue(record, 'nomeFavorecido', 'municipio', 'ente') ?? 'Favorecido não informado',
    agency: nestedText(record.orgao, 'nome') ?? textValue(record, 'nomeOrgao', 'orgao') ?? 'Órgão não informado',
    description: textValue(record, 'objeto', 'programa', 'acao') ?? 'Descrição não informada.',
    amount: numberValue(record, 'valorTransferido', 'valorRecebido', 'valor'),
    transferredAt: textValue(record, 'data', 'dataTransferencia', 'dataReferencia'),
    url: textValue(record, 'url', 'urlDetalhamento'),
  }))
}

export async function fetchExecutiveAnnualExpenses(year: number): Promise<ExecutiveAnnualExpense[]> {
  if (!Number.isInteger(year) || year < 2000) throw new Error('Informe um exercício válido para consultar as despesas federais.')
  const records = await fetchPortalRecords('despesas/por-orgao', 'Despesas anuais da Presidência da República', {
    year,
    superiorAgencyCode: '20000',
  })
  return records.map(record => ({
    year: numberValue(record, 'ano') ?? year,
    organization: textValue(record, 'orgao') ?? 'Órgão não informado',
    organizationCode: textValue(record, 'codigoOrgao') ?? '',
    superiorOrganization: textValue(record, 'orgaoSuperior') ?? 'Presidência da República',
    committed: numberValue(record, 'empenhado'),
    settled: numberValue(record, 'liquidado'),
    paid: numberValue(record, 'pago'),
  }))
}

export async function fetchFederalAmendments(year: number): Promise<FederalAmendment[]> {
  if (!Number.isInteger(year) || year < 2000) throw new Error('Informe um exercício válido para consultar emendas parlamentares.')
  const records = await fetchPortalRecords('emendas', 'Emendas parlamentares federais', { year })
  return records.map((record, index) => ({
    id: textValue(record, 'codigoEmenda') ?? `${year}-${index}`,
    year: numberValue(record, 'ano') ?? year,
    kind: textValue(record, 'tipoEmenda') ?? 'Emenda parlamentar',
    author: textValue(record, 'nomeAutor') ?? 'Autor não informado',
    number: textValue(record, 'numeroEmenda', 'codigoEmenda') ?? 'Número não informado',
    destination: textValue(record, 'localidadeDoGasto') ?? 'Destino não informado',
    function: textValue(record, 'funcao') ?? 'Função não informada',
    committed: numberValue(record, 'valorEmpenhado'),
    settled: numberValue(record, 'valorLiquidado'),
    paid: numberValue(record, 'valorPago'),
  }))
}

export async function fetchNatalBudgetReport(options: { year: number; period: number }): Promise<SiconfiBudgetReport> {
  if (!Number.isInteger(options.year) || options.year < 2000) throw new Error('Informe um exercício válido para a consulta SICONFI.')
  if (!Number.isInteger(options.period) || options.period < 1 || options.period > 6) throw new Error('O período do RREO deve estar entre 1 e 6.')

  const url = new URL('/api/siconfi', window.location.origin)
  url.searchParams.set('year', String(options.year))
  url.searchParams.set('period', String(options.period))
  const payload = await requestJson(url, 'Receitas municipais do SICONFI')
  const records = recordsFromPayload(payload)
  if (records.length === 0) throw new Error('SICONFI: não há dados para o exercício e bimestre selecionados.')

  const accounts = new Map<string, SiconfiRevenue>()
  for (const record of records) {
    const accountCode = textValue(record, 'cod_conta') ?? 'conta-sem-código'
    const account = textValue(record, 'conta') ?? 'Conta sem descrição'
    const key = `${accountCode}:${account}`
    const current = accounts.get(key) ?? { accountCode, account, forecast: null, accumulated: null }
    const column = (textValue(record, 'coluna') ?? '').toLocaleLowerCase('pt-BR')
    const amount = numberValue(record, 'valor')
    if (column.includes('previsão atualizada')) current.forecast = amount
    if (column.includes('até o bimestre') || column.includes('ate o bimestre')) current.accumulated = amount
    accounts.set(key, current)
  }

  const revenues = [...accounts.values()]
    .filter(revenue => revenue.forecast !== null || revenue.accumulated !== null)
    .sort((left, right) => (right.accumulated ?? 0) - (left.accumulated ?? 0))

  return {
    entity: textValue(records[0], 'instituicao') ?? 'Prefeitura Municipal de Natal - RN',
    year: options.year,
    period: options.period,
    revenues,
  }
}

import { recordsFromPayload, requestJson, textValue, type PublicApiRecord } from './publicApi'

export type LocalTransparencySourceId = 'natal' | 'rn-state' | 'rn-assembly'

export type LocalTransparencySource = {
  id: LocalTransparencySourceId
  name: string
  description: string
  portalUrl: string
  apiUrl: string | null
}

export type LocalTransparencyRecord = {
  id: string
  title: string
  description: string
  date: string | null
  sourceUrl: string | null
}

const sources: LocalTransparencySource[] = [
  {
    id: 'natal',
    name: 'Prefeitura do Natal',
    description: 'Portal municipal para consultas de despesas, contratos, licitações e receitas.',
    portalUrl: 'https://transparencia.natal.rn.gov.br/',
    apiUrl: import.meta.env.VITE_NATAL_TRANSPARENCIA_API_URL?.trim() || null,
  },
  {
    id: 'rn-state',
    name: 'Governo do Rio Grande do Norte',
    description: 'Portal estadual de transparência e acesso a dados públicos.',
    portalUrl: 'https://www.transparencia.rn.gov.br/',
    apiUrl: import.meta.env.VITE_RN_TRANSPARENCIA_API_URL?.trim() || null,
  },
  {
    id: 'rn-assembly',
    name: 'Assembleia Legislativa do RN',
    description: 'Transparência legislativa e administrativa da Assembleia.',
    portalUrl: 'https://www.al.rn.leg.br/',
    apiUrl: import.meta.env.VITE_ASSEMBLEIA_RN_TRANSPARENCIA_API_URL?.trim() || null,
  },
]

export function getLocalTransparencySources(): LocalTransparencySource[] {
  return sources
}

function mapLocalRecord(record: PublicApiRecord, index: number): LocalTransparencyRecord {
  return {
    id: textValue(record, 'id', 'codigo', 'numero') ?? `registro-${index}`,
    title: textValue(record, 'objeto', 'titulo', 'descricao', 'nome') ?? 'Registro público',
    description: textValue(record, 'orgao', 'unidadeGestora', 'favorecido', 'situacao', 'status') ?? 'Consulte o portal oficial para ver os detalhes.',
    date: textValue(record, 'data', 'dataPublicacao', 'dataAssinatura', 'dataAbertura'),
    sourceUrl: textValue(record, 'url', 'urlDetalhamento', 'link'),
  }
}

export async function fetchLocalTransparencyRecords(sourceId: LocalTransparencySourceId): Promise<LocalTransparencyRecord[]> {
  const source = sources.find(item => item.id === sourceId)
  if (!source) throw new Error('Fonte de transparência local não reconhecida.')
  if (!source.apiUrl) throw new Error(`A API de ${source.name} ainda não está configurada.`)

  const payload = await requestJson(new URL(source.apiUrl), source.name)
  return recordsFromPayload(payload).map(mapLocalRecord)
}

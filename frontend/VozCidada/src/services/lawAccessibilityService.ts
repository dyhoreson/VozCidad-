export type AnalysisMode = 'completo' | 'resumido'

export type FrequentQuestion = {
  pergunta: string
  resposta: string
}

export type LawAnalysis = {
  resumo_didatico: string
  perguntas_frequentes: FrequentQuestion[]
  analise_completa: string
  texto_para_voz: string
}

const API_BASE_URL = (import.meta.env.VITE_AI_SERVICE_URL?.trim() || 'http://localhost:8000').replace(/\/+$/, '')

function isAnalysis(value: unknown): value is LawAnalysis {
  if (!value || typeof value !== 'object') return false
  const analysis = value as Partial<LawAnalysis>
  return typeof analysis.resumo_didatico === 'string'
    && typeof analysis.analise_completa === 'string'
    && typeof analysis.texto_para_voz === 'string'
    && Array.isArray(analysis.perguntas_frequentes)
    && analysis.perguntas_frequentes.every(item =>
      Boolean(item)
      && typeof item === 'object'
      && typeof item.pergunta === 'string'
      && typeof item.resposta === 'string',
    )
}

export async function analyzeLaw(input: {
  title: string
  text: string
  mode: AnalysisMode
}): Promise<LawAnalysis> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/analisar-projeto`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: input.title,
        texto_original: input.text,
        modo: input.mode,
      }),
      signal: AbortSignal.timeout(60_000),
    })
  } catch (cause) {
    const reason = cause instanceof Error && cause.name === 'TimeoutError'
      ? 'A explicação da proposta excedeu o tempo limite.'
      : `Não foi possível conectar ao serviço de acessibilidade em ${API_BASE_URL}.`
    throw new Error(`${reason} Verifique a configuração de VITE_AI_SERVICE_URL e tente novamente.`, { cause })
  }

  let payload: unknown
  try {
    payload = await response.json() as unknown
  } catch (cause) {
    throw new Error('O serviço de acessibilidade retornou uma resposta inválida.', { cause })
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload && typeof payload.detail === 'string'
      ? payload.detail
      : `O serviço de acessibilidade respondeu com HTTP ${response.status}.`
    throw new Error(detail)
  }
  if (!isAnalysis(payload)) throw new Error('A resposta da IA não contém todos os campos esperados.')
  return payload
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Sparkles, Square, Volume2 } from 'lucide-react'
import { analyzeLaw, type AnalysisMode, type LawAnalysis } from '../../../services/lawAccessibilityService'
import type { Bill } from '../../../types'

type ExplanationType = 'quick' | 'technical' | 'faq'

const explanationOptions: Array<{ id: ExplanationType; label: string; description: string }> = [
  { id: 'quick', label: 'Resumo Rápido', description: 'Objetivo e direto' },
  { id: 'technical', label: 'Resumo Técnico', description: 'Mais explicativo e aprofundado' },
  { id: 'faq', label: 'Perguntas Frequentes', description: 'Dúvidas e respostas' },
]

export function AccessibilityReader({ bill }: { bill: Bill }) {
  const [explanationType, setExplanationType] = useState<ExplanationType>('quick')
  const [analysis, setAnalysis] = useState<LawAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const sourceText = useMemo(
    () => `Título da proposta: ${bill.title}. Autor: ${bill.author}. Ementa e resumo cadastrados: ${bill.summary}`,
    [bill.author, bill.summary, bill.title],
  )

  useEffect(() => () => {
    if (utteranceRef.current && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  async function generateAnalysis() {
    setLoading(true)
    setError('')
    try {
      const mode: AnalysisMode = explanationType === 'technical' ? 'completo' : 'resumido'
      const result = await analyzeLaw({ title: bill.title, text: sourceText, mode })
      setAnalysis(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a explicação.')
    } finally {
      setLoading(false)
    }
  }

  function textForReading(): string {
    if (!analysis) return sourceText
    if (explanationType === 'quick') return analysis.texto_para_voz
    if (explanationType === 'technical') return analysis.analise_completa
    return analysis.perguntas_frequentes
      .map(item => `Pergunta: ${item.pergunta}. Resposta: ${item.resposta}`)
      .join('. ')
  }

  function play() {
    if (!('speechSynthesis' in window)) {
      setError('Este navegador não oferece leitura em voz alta. Tente usar a ferramenta de leitura de tela do dispositivo.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(textForReading())
    utterance.lang = 'pt-BR'
    utterance.onstart = () => {
      setSpeaking(true)
      setPaused(false)
    }
    utterance.onend = () => {
      setSpeaking(false)
      setPaused(false)
      utteranceRef.current = null
    }
    utterance.onerror = event => {
      setSpeaking(false)
      setPaused(false)
      utteranceRef.current = null
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setError('O navegador não conseguiu iniciar a leitura em voz alta.')
      }
    }
    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  function pauseOrResume() {
    if (!('speechSynthesis' in window)) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setPaused(false)
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
      setPaused(true)
    }
  }

  function stop() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    utteranceRef.current = null
    setSpeaking(false)
    setPaused(false)
  }

  return <section className="accessibility-reader" aria-label={`Acessibilidade da proposta ${bill.title}`}>
    <div className="accessibility-reader-heading">
      <div>
        <h4>Resumo com Inteligência Artificial</h4>
        <p>Escolha um formato antes de gerar. A explicação apoia a leitura e não substitui o documento oficial.</p>
      </div>
    </div>

    <div className="law-explanation-options" role="group" aria-label="Formato da explicação">
      {explanationOptions.map(option => <button
        key={option.id}
        type="button"
        aria-pressed={explanationType === option.id}
        onClick={() => { stop(); setExplanationType(option.id); setError('') }}
      >
        <strong>{option.label}</strong>
        <span>{option.description}</span>
      </button>)}
    </div>

    {analysis && <div className="accessibility-reader-content" aria-live="polite">
      {explanationType === 'quick' && <div>
        <h5>Resumo rápido</h5>
        <p>{analysis.resumo_didatico}</p>
      </div>}
      {explanationType === 'technical' && <div>
        <h5>Resumo técnico</h5>
        <p>{analysis.analise_completa}</p>
      </div>}
      {explanationType === 'faq' && <div>
        <h5>Perguntas frequentes sobre a proposta</h5>
        <dl>{analysis.perguntas_frequentes.map((item, index) => <div key={`${item.pergunta}-${index}`}>
          <dt>{item.pergunta}</dt><dd>{item.resposta}</dd>
        </div>)}</dl>
      </div>}
      <p className="accessibility-reader-note">Texto gerado por inteligência artificial com base na ementa cadastrada. Confira os detalhes no documento oficial.</p>
    </div>}

    <div className="accessibility-reader-actions">
      <button type="button" className="accessibility-primary-action" onClick={() => void generateAnalysis()} disabled={loading} aria-busy={loading}>
        <Sparkles size={16} /> {loading ? 'Preparando explicação…' : analysis ? 'Atualizar explicação' : 'Gerar explicação'}
      </button>
      <div className="accessibility-speech-controls" role="group" aria-label="Controles de leitura em voz alta">
        <button type="button" onClick={play} aria-label="Ouvir conteúdo selecionado"><Volume2 size={16} /> Ouvir</button>
        <button type="button" onClick={pauseOrResume} disabled={!speaking} aria-label={paused ? 'Continuar leitura' : 'Pausar leitura'}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? 'Continuar' : 'Pausar'}</button>
        <button type="button" onClick={stop} disabled={!speaking} aria-label="Parar leitura"><Square size={14} /> Parar</button>
      </div>
    </div>
    {error && <p className="accessibility-reader-error" role="alert">{error}</p>}
  </section>
}

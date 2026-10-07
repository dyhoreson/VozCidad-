import { useState } from 'react'
import { BadgeCheck, MessageSquareText, Send } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import type { Occurrence, OccurrenceStatus } from '../../../types'

const statusOptions: OccurrenceStatus[] = ['Aguardando Resposta', 'Em Reparo', 'Reparo Realizado', 'Solicitação Improcedente']
export function WorkflowReportCard({ occurrence, onSave }: { occurrence: Occurrence; onSave: (id: string, status: OccurrenceStatus, response: string) => void }) {
  const [status, setStatus] = useState<OccurrenceStatus>(occurrence.status)
  const [response, setResponse] = useState('')
  return <article className="workflow-report-card"><div className="workflow-report-top"><div><span className="bill-id">{occurrence.id}</span><h3>{occurrence.title}</h3><p>{occurrence.neighborhood}, {occurrence.municipality} · {occurrence.category}</p></div><StatusBadge status={occurrence.status} /></div>
    {occurrence.officialResponse && <div className="latest-official-response"><BadgeCheck size={15} /><span><strong>Resposta oficial atual</strong>{occurrence.officialResponse}</span></div>}
    <label className="workflow-select-label">Atualizar status<select value={status} onChange={event => setStatus(event.target.value as OccurrenceStatus)}>{statusOptions.map(option => <option key={option}>{option}</option>)}</select></label>
    <label className="workflow-response-label"><MessageSquareText size={15} /> Resposta ou justificativa oficial<textarea rows={2} value={response} onChange={event => setResponse(event.target.value)} placeholder={status === 'Solicitação Improcedente' ? 'Explique por que a solicitação não procede (obrigatório)' : 'Ex.: Equipe enviada ao local para avaliação'} /></label>
    <div className="workflow-card-footer"><small>{status === 'Solicitação Improcedente' ? 'Justificativa obrigatória para improcedência.' : 'A resposta será exibida publicamente no histórico.'}</small><button onClick={() => onSave(occurrence.id, status, response)} disabled={!response.trim()}><Send size={14} /> Publicar atualização</button></div>
  </article>
}

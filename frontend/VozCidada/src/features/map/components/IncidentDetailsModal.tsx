import { BadgeCheck, CalendarClock, Check, CheckCircle2, Clock3, History, MapPin, MessageSquareText, ShieldCheck, ThumbsUp, X, XCircle } from 'lucide-react'
import type { Occurrence } from '../../../types'
import { getCommunityTrust } from '../../../types'
import type { UserProfile } from '../../../types/auth'
import { StatusBadge } from '../../../components/ui/StatusBadge'

function TrustBadge({ occurrence }: { occurrence: Occurrence }) {
  const trust = getCommunityTrust(occurrence)
  if (trust === 'official-confirmed' && occurrence.officialVerification) return <span className="trust-badge trust-official"><BadgeCheck size={15} /> Confirmada por {occurrence.officialVerification.organization}</span>
  if (trust === 'official-rejected' && occurrence.officialVerification) return <span className="trust-badge trust-rejected"><XCircle size={14} /> Não confirmada pelo órgão</span>
  if (trust === 'recognized') return <span className="trust-badge trust-community"><CheckCircle2 size={14} /> Reconhecida pela comunidade</span>
  return <span className="trust-badge trust-new"><Clock3 size={14} /> Denúncia nova</span>
}

export function IncidentDetailsModal({ occurrence, profile, confirmed, onClose, onConfirm, onVerify }: { occurrence: Occurrence | null; profile: UserProfile | null; confirmed: boolean; onClose: () => void; onConfirm: () => void; onVerify: (status: 'procedente' | 'improcedente') => void }) {
  if (!occurrence) return null
  const canVerify = (profile?.role === 'politico' || profile?.role === 'empresa' || profile?.role === 'admin') && profile.id === occurrence.assignedTo
  const history = occurrence.workflowHistory?.length ? occurrence.workflowHistory : [{ status: occurrence.status, changedBy: occurrence.officialVerification?.reviewer ?? 'Sistema de atendimento', organization: occurrence.officialVerification?.organization ?? 'Protocolo comunitário', changedAt: occurrence.officialVerification?.reviewedAt ?? 'Abertura da denúncia', response: occurrence.officialResponse ?? 'Denúncia registrada e encaminhada para avaliação do órgão responsável.' }]
  return <div className="incident-detail-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><aside className="incident-detail-panel" role="dialog" aria-modal="true" aria-labelledby="incident-title">
    <button className="incident-detail-close" onClick={onClose} aria-label="Fechar detalhes"><X size={19} /></button>
    <img className="incident-photo" src={occurrence.photoUrl} alt={`Registro fotográfico: ${occurrence.title}`} />
    <div className="incident-detail-body"><div className="incident-kicker"><span className="incident-id">{occurrence.id}</span><span>{occurrence.category}</span></div><div className="incident-badges"><StatusBadge status={occurrence.status} /><TrustBadge occurrence={occurrence} /></div><h2 id="incident-title">{occurrence.title}</h2><p className="incident-description">{occurrence.description}</p>
      <div className="incident-info"><span><MapPin size={15} />{occurrence.neighborhood}, {occurrence.municipality} · RN</span><span><CalendarClock size={15} />Registrada {occurrence.date}</span></div>
      {occurrence.officialVerification && <div className={`official-note ${occurrence.officialVerification.status}`}><ShieldCheck size={17} /><div><strong>{occurrence.officialVerification.organization} · validação oficial</strong><p>{occurrence.officialVerification.note ?? 'Análise registrada pelo órgão responsável.'}</p><small>Verificado em {occurrence.officialVerification.reviewedAt}</small></div></div>}
      {occurrence.officialResponse && <div className="public-response"><MessageSquareText size={16} /><div><strong>Resposta oficial mais recente</strong><p>{occurrence.officialResponse}</p></div></div>}
      <div className="corroboration-card"><div className="corroboration-count"><strong>{occurrence.confirmations}</strong><span>confirmações da comunidade</span></div><div className="quorum-track"><i style={{ width: `${Math.min(occurrence.confirmations * 10, 100)}%` }} /></div><small>{Math.max(10 - occurrence.confirmations, 0)} para alcançar o reconhecimento comunitário</small>
        <button className={`corroborate-button ${confirmed ? 'corroborate-done' : ''}`} onClick={onConfirm} disabled={confirmed}>{confirmed ? <><Check size={16} /> Você confirmou esta ocorrência</> : <><ThumbsUp size={16} /> Eu também passo por isso</>}</button>
      </div>
      <section className="workflow-history"><h3><History size={16} /> Histórico de atualizações</h3><div className="workflow-timeline">{[...history].reverse().map((entry, index) => <article key={`${entry.changedAt}-${index}`}><i /><div><div className="workflow-timeline-head"><strong>{entry.organization}</strong><time>{entry.changedAt}</time></div><StatusBadge status={entry.status} /><p>{entry.response}</p><small>Atualizado por {entry.changedBy}</small></div></article>)}</div></section>
      {canVerify && <div className="official-review"><div className="official-review-heading"><ShieldCheck size={17} /><div><strong>Validação do órgão</strong><small>Seu perfil permite registrar uma análise oficial.</small></div></div><button className="verify-positive" onClick={() => onVerify('procedente')}><BadgeCheck size={16} /> Confirmar como procedente</button><button className="verify-negative" onClick={() => onVerify('improcedente')}><XCircle size={16} /> Marcar como não procedente</button><small className="verification-advisory">A validação fica identificada como {profile?.role === 'empresa' ? profile.fullName : 'representante público'}.</small></div>}
    </div>
  </aside></div>
}

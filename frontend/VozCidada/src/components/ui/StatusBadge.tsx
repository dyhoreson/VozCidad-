import type { OccurrenceStatus } from '../../types'
const style: Record<OccurrenceStatus, string> = {
  'Aguardando Resposta': 'status-awaiting',
  'Em Reparo': 'status-repair',
  'Reparo Realizado': 'status-resolved',
  'Solicitação Improcedente': 'status-improper',
}
export function StatusBadge({ status }: { status: OccurrenceStatus }) { return <span className={`status-badge ${style[status]}`}><i />{status}</span> }

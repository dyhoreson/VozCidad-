import { ArrowUpRight, BadgeCheck, CheckCircle2, Clock3, MapPin } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { getCommunityTrust, type Occurrence } from '../../../types'

export function OccurrenceList({ limit = 4, items = [], onSelect }: { limit?: number; items?: Occurrence[]; onSelect?: (item: Occurrence) => void }) {
  if (items.length === 0) return <div className="empty-state occurrence-empty-state"><strong>Nenhuma denúncia encontrada</strong><p>Quando houver novos registros no banco, eles aparecerão nesta lista.</p></div>
  return <div className="occurrence-list">{items.slice(0, limit).map(item => {
    const trust = getCommunityTrust(item)
    return <button className="occurrence-row occurrence-row-button" key={item.id} onClick={() => onSelect?.(item)}>
      <div className={`category-icon category-${item.category === 'Infraestrutura' ? 'road' : item.category === 'Iluminação' ? 'light' : item.category === 'Segurança' ? 'safety' : 'water'}`}><MapPin size={18} /></div>
      <div className="occurrence-copy"><div className="occurrence-title-line"><h3>{item.title}</h3><span className="occurrence-id">{item.id}</span></div>
        <div className="occurrence-meta"><span><MapPin size={13} />{item.neighborhood}, {item.municipality}</span><span><Clock3 size={13} />{item.date}</span></div>
        <span className={`list-trust list-trust-${trust}`}>{trust === 'official-confirmed' ? <><BadgeCheck size={12} /> Confirmada por {item.officialVerification?.organization}</> : trust === 'recognized' ? <><CheckCircle2 size={12} /> Reconhecida pela comunidade</> : trust === 'official-rejected' ? 'Não confirmada pelo órgão' : 'Denúncia nova'} · {item.confirmations} confirmações</span>
      </div><StatusBadge status={item.status} /><span className="support-count">↑ {item.confirmations}</span><span className="row-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
    </button>
  })}</div>
}

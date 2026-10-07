import { ArrowUpRight, BadgeCheck, BriefcaseBusiness, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CivicProfile } from '../../../types'

export function PoliticianCard({ person }: { person: CivicProfile }) {
  return <Link to={`/representantes/${person.id}`} className="politician-card civic-profile-card">
    <div className={`politician-avatar ${person.color}`}>{person.photoUrl && <img src={person.photoUrl} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />}{person.initials}</div>
    <span className="verified-mark" title="Perfil demonstrativo"><BadgeCheck size={12} /></span><span className="profile-kind-tag">{person.kind === 'orgao' ? 'Órgão / concessionária' : person.role}</span>
    <h3>{person.name}</h3><p>{person.kind === 'orgao' ? person.acronym : `${person.party} · ${person.municipality}`}</p>
    <div className="politician-location"><MapPin size={14} /> {person.municipality}{person.municipality === 'Rio Grande do Norte' ? '' : ', RN'}</div>
    <div className="politician-card-footer"><span><BriefcaseBusiness size={15} /> {person.kind === 'orgao' ? `${person.metrics.reportsReceived} manifestações` : `${person.metrics.billsPresented} projetos`}</span><span className="row-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span></div>
  </Link>
}

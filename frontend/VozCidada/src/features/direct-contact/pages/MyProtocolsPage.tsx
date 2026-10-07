import { useEffect, useState } from 'react'
import { Archive, BellRing, CheckCheck, Clock3, FileText, MessageSquareText, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import { useAuth } from '../../auth/AuthContext'
import type { DirectRequest } from '../../../types'
import { listProtocols } from '../../../services/supabaseService'

const statusIcon = { Enviado: Send, Lido: BellRing, Respondido: CheckCheck, Arquivado: Archive }
export function MyProtocolsPage() {
  const { user, openAuthModal } = useAuth(); const [requests, setRequests] = useState<DirectRequest[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  useEffect(() => { let active = true; if (!user) { setLoading(false); return } setLoading(true); void listProtocols('mine', user.id).then(rows => { if (active) setRequests(rows) }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar seus protocolos.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [user?.id])
  if (!user) return <div className="page-wrap contact-gate"><FileText size={28} /><h2>Seus protocolos em um só lugar</h2><p>Entre na plataforma para acompanhar leituras e respostas às suas mensagens.</p><button className="primary-button" onClick={openAuthModal}>Entrar para continuar</button></div>
  return <div className="page-wrap my-protocols-page"><div className="direct-contact-tabs"><Link to="/contato"><Send size={15} /> Nova solicitação</Link><span className="active"><FileText size={15} /> Meus protocolos</span></div><SectionTitle eyebrow="ACOMPANHAMENTO" title="Meus protocolos" description="Acompanhe o recebimento e as respostas dos órgãos e representantes." action={<Link className="primary-button" to="/contato"><Send size={15} /> Nova mensagem</Link>} />
    {error && <p role="alert" className="management-notice">{error}</p>}{loading ? <div className="empty-state" role="status">Carregando protocolos…</div> : requests.length ? <div className="protocol-list">{requests.map(item => { const Icon = statusIcon[item.status]; return <article className="protocol-card" key={item.id}><div className="protocol-card-top"><span className="protocol-number">{item.protocolNumber}</span><span className={`protocol-status protocol-${item.status.toLocaleLowerCase('pt-BR')}`}><Icon size={13} />{item.status}</span></div><h3>{item.subject}</h3><p className="protocol-recipient">{item.category} · Para <strong>{item.recipientName}</strong></p><p className="protocol-message">{item.message}</p><div className="protocol-card-footer"><span><Clock3 size={13} /> Enviado em {item.sentAt}</span>{item.attachmentNames.length > 0 && <span><FileText size={13} /> {item.attachmentNames.length} anexo(s)</span>}</div>{item.response && <div className="protocol-response"><MessageSquareText size={15} /><div><strong>Resposta do destinatário{item.respondedAt ? ` · ${item.respondedAt}` : ''}</strong><p>{item.response}</p></div></div>}</article> })}</div> : <div className="protocol-empty"><FileText size={23} /><strong>Nenhum protocolo por enquanto</strong><p>Quando enviar uma solicitação, você poderá acompanhar o andamento nesta página.</p><Link to="/contato" className="primary-button"><Send size={15} /> Enviar mensagem</Link></div>}
  </div>
}

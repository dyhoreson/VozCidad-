import { useEffect, useState, type FormEvent } from 'react'
import { FileText, HeartHandshake, Paperclip, Send, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SectionTitle } from '../../../components/ui/SectionTitle'
import type { DirectRequestCategory } from '../../../types'
import { useAuth } from '../../auth/AuthContext'
import { listProtocolRecipients, sendProtocol } from '../../../services/supabaseService'

const categories: DirectRequestCategory[] = ['Reclamação', 'Elogio', 'Solicitação']
type Recipient = { id: string; name: string; role: string; municipality: string | null }
export function DirectContactPage() {
  const { user, openAuthModal } = useAuth(); const [recipients, setRecipients] = useState<Recipient[]>([]); const [recipientId, setRecipientId] = useState(''); const [category, setCategory] = useState<DirectRequestCategory>('Solicitação'); const [subject, setSubject] = useState(''); const [message, setMessage] = useState(''); const [files, setFiles] = useState<File[]>([]); const [protocol, setProtocol] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { if (!user) return; void listProtocolRecipients().then(list => { setRecipients(list); setRecipientId(list[0]?.id ?? '') }).catch(e => setError(e instanceof Error ? e.message : 'Não foi possível carregar destinatários.')) }, [user?.id])
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!user) { openAuthModal(); return } if (!recipientId) { setError('Ainda não há destinatários institucionais cadastrados.'); return } setBusy(true); setError(''); try { const number = await sendProtocol({ userId: user.id, recipientId, category, subject, message, files }); setProtocol(number); setSubject(''); setMessage(''); setFiles([]) } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível enviar sua solicitação.') } finally { setBusy(false) } }
  if (!user) return <div className="page-wrap contact-gate"><HeartHandshake size={28} /><h2>Fale diretamente com quem pode ajudar</h2><p>Entre na plataforma para enviar mensagens a representantes e órgãos públicos do RN e acompanhar cada protocolo.</p><button className="primary-button" onClick={openAuthModal}>Entrar para continuar</button></div>
  return <div className="page-wrap direct-contact-page"><div className="direct-contact-tabs"><span className="active"><Send size={15} /> Nova solicitação</span><Link to="/meus-protocolos"><FileText size={15} /> Meus protocolos</Link></div>
    <SectionTitle eyebrow="CANAL DIRETO" title="Sua voz chega ao destinatário" description="Envie uma mensagem ao representante, prefeitura ou concessionária responsável. Você receberá um protocolo para acompanhar a resposta." />
    {error && <p className="management-notice" role="alert">{error}</p>}{protocol && <div className="protocol-success"><ShieldCheck size={20} /><div><strong>Solicitação enviada com sucesso</strong><span>Protocolo <b>{protocol}</b> · acompanhe em Meus protocolos.</span></div><Link to="/meus-protocolos">Acompanhar</Link></div>}
    <form className="direct-request-form" onSubmit={submit}><div className="direct-form-heading"><span><HeartHandshake size={18} /></span><div><strong>Nova mensagem</strong><small>Os campos com * são obrigatórios.</small></div></div>
      <label>Destinatário *<select required value={recipientId} onChange={event => setRecipientId(event.target.value)} disabled={!recipients.length}><option value="">{recipients.length ? 'Selecione o destinatário' : 'Nenhum destinatário cadastrado'}</option>{recipients.map(person => <option key={person.id} value={person.id}>{person.name} · {person.role}{person.municipality ? ` · ${person.municipality}` : ''}</option>)}</select></label>
      <fieldset className="request-category-field"><legend>Tipo de mensagem *</legend><div>{categories.map(item => <label key={item} className={category === item ? 'selected' : ''}><input type="radio" name="category" value={item} checked={category === item} onChange={() => setCategory(item)} />{item}</label>)}</div></fieldset>
      <label>Assunto *<input required maxLength={120} value={subject} onChange={event => setSubject(event.target.value)} placeholder="Resuma o motivo do contato" /></label>
      <label>Mensagem *<textarea required minLength={15} maxLength={2500} rows={6} value={message} onChange={event => setMessage(event.target.value)} placeholder="Descreva sua solicitação com detalhes, incluindo local e datas quando possível." /><small className="field-hint">{message.length}/2500 caracteres</small></label>
      <label className="request-attachments"><Paperclip size={17} /><span>{files.length ? `${files.length} arquivo(s) selecionado(s)` : 'Anexar fotos ou documentos (opcional)'}</span><input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={event => setFiles(Array.from(event.target.files ?? []))} /></label>
      {files.length > 0 && <ul className="attached-file-list">{files.map((file, index) => <li key={`${file.name}-${index}`}><FileText size={13} />{file.name}</li>)}</ul>}
      <div className="contact-privacy-note"><ShieldCheck size={15} /> Sua mensagem será encaminhada ao destinatário escolhido. Evite incluir dados pessoais sensíveis no texto.</div>
      <button type="submit" className="primary-button send-request-button" disabled={busy || !recipients.length}><Send size={16} /> {busy ? 'Enviando…' : 'Enviar e gerar protocolo'}</button>
    </form>
  </div>
}

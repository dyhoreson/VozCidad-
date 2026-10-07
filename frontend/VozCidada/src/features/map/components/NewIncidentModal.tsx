import { useState, type FormEvent } from 'react'
import { ImagePlus, MapPin, X } from 'lucide-react'
import { municipalities } from '../../../data/mock'
import type { Occurrence, OccurrenceCategory } from '../../../types'
export type NewIncidentDraft = Occurrence & { imageFile?: File }

const categoryOptions: OccurrenceCategory[] = ['Infraestrutura', 'Iluminação', 'Água e saneamento', 'Segurança']
const cityCoordinates: Record<string, [number, number]> = { Natal: [-5.7945, -35.2094], Mossoró: [-5.1872, -37.3442], Parnamirim: [-5.9167, -35.2628], Caicó: [-6.4582, -37.0977] }
export function NewIncidentModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (item: NewIncidentDraft) => void }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [category, setCategory] = useState<OccurrenceCategory>('Infraestrutura')
  const [municipality, setMunicipality] = useState('Natal'); const [neighborhood, setNeighborhood] = useState(''); const [photo, setPhoto] = useState(''); const [imageFile, setImageFile] = useState<File>()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit({ id: '', title, description, category, municipality, neighborhood, status: 'Aguardando Resposta', date: 'agora', support: 0, confirmations: 0, photoUrl: photo, coordinates: cityCoordinates[municipality], workflowHistory: [], imageFile })
  }
  return <div className="new-incident-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><form className="new-incident-modal" onSubmit={submit}>
    <button type="button" className="incident-detail-close" onClick={onClose} aria-label="Fechar"><X size={19} /></button><span className="eyebrow">PARTICIPE DA MUDANÇA</span><h2>Registrar ocorrência</h2><p className="new-incident-intro">Descreva o problema para que sua comunidade e os órgãos responsáveis possam acompanhar.</p>
    <label>Título da ocorrência<input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Poste apagado na rua principal" /></label>
    <label>Descrição<textarea required rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="Conte quando começou e como afeta a comunidade" /></label>
    <div className="new-incident-fields"><label>Categoria<select value={category} onChange={e => setCategory(e.target.value as OccurrenceCategory)}>{categoryOptions.map(item => <option key={item}>{item}</option>)}</select></label><label>Município<select value={municipality} onChange={e => setMunicipality(e.target.value)}>{municipalities.map(item => <option key={item}>{item}</option>)}</select></label></div>
    <label>Bairro<input required value={neighborhood} onChange={e => setNeighborhood(e.target.value)} placeholder="Nome do bairro" /></label>
    <label className="photo-upload"><ImagePlus size={17} /><span>{photo ? 'Foto adicionada' : 'Adicionar foto (opcional)'}</span><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) { setImageFile(file); setPhoto(URL.createObjectURL(file)) } }} /></label>
    <div className="new-incident-location"><MapPin size={15} /> A localização inicial será aproximada pelo município selecionado.</div>
    <div className="new-incident-actions"><button type="button" className="secondary-action" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Publicar ocorrência</button></div>
  </form></div>
}

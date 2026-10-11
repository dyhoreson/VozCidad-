import { useEffect, useState, type FormEvent } from 'react'
import { CarFront, Construction, Droplets, ImagePlus, Lightbulb, LoaderCircle, MapPin, ShieldAlert, TrafficCone, TreePine, Waves, X } from 'lucide-react'
import { municipalities } from '../../../data/mock'
import { useAuth } from '../../auth/AuthContext'
import type { Occurrence, OccurrenceCategory } from '../../../types'

export type NewIncidentDraft = Occurrence & { imageFile?: File }
type Coordinates = [number, number]
const categories: Array<{ title: OccurrenceCategory; icon: typeof Waves; tone: string }> = [
  { title: 'Ponto de alagamento', icon: Waves, tone: 'border-cyan-200 bg-cyan-50 text-cyan-800' },
  { title: 'Árvore para poda', icon: TreePine, tone: 'border-green-200 bg-green-50 text-green-800' },
  { title: 'Semáforo apagado', icon: TrafficCone, tone: 'border-amber-200 bg-amber-50 text-amber-800' },
  { title: 'Acidente de trânsito', icon: CarFront, tone: 'border-red-200 bg-red-50 text-red-800' },
  { title: 'Infraestrutura', icon: Construction, tone: 'border-slate-200 bg-slate-50 text-slate-800' },
  { title: 'Iluminação', icon: Lightbulb, tone: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
  { title: 'Água e saneamento', icon: Droplets, tone: 'border-blue-200 bg-blue-50 text-blue-800' },
  { title: 'Segurança', icon: ShieldAlert, tone: 'border-purple-200 bg-purple-50 text-purple-800' },
]

function isInsideRn([latitude, longitude]: Coordinates) {
  return latitude >= -7.5 && latitude <= -4 && longitude >= -39 && longitude <= -34
}

export function NewIncidentModal({ onClose, onSubmit, initialCoordinates }: { onClose: () => void; onSubmit: (item: NewIncidentDraft) => void; initialCoordinates?: Coordinates | null }) {
  const { user, openAuthModal } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<OccurrenceCategory>('Ponto de alagamento')
  const [municipality, setMunicipality] = useState('Natal')
  const [neighborhood, setNeighborhood] = useState('')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates ?? null)
  const [imageFile, setImageFile] = useState<File>()
  const [previewUrl, setPreviewUrl] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setCoordinates(initialCoordinates ?? null) }, [initialCoordinates])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const locateMe = () => {
    setError('')
    if (!navigator.geolocation) { setError('Este navegador não oferece geolocalização. Toque no mapa para marcar o ponto.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      const point: Coordinates = [position.coords.latitude, position.coords.longitude]
      if (!isInsideRn(point)) { setError('A localização detectada está fora do Rio Grande do Norte. Marque o ponto correto no mapa.'); setLocating(false); return }
      setCoordinates(point); setLocating(false)
    }, cause => {
      setError(cause.code === cause.PERMISSION_DENIED ? 'Permissão de localização negada. Autorize o acesso ou marque o local tocando no mapa.' : 'Não foi possível obter sua localização. Marque o local tocando no mapa.')
      setLocating(false)
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!user) { setError('Entre na sua conta para vincular e publicar esta ocorrência.'); return }
    if (!coordinates) { setError('Marque o local no mapa ou use sua localização atual antes de enviar.'); return }
    if (!isInsideRn(coordinates)) { setError('O local precisa estar dentro do Rio Grande do Norte.'); return }
    onSubmit({ id: '', title: title.trim(), description: description.trim(), category, municipality, neighborhood: neighborhood.trim(), status: 'Aguardando Resposta', date: new Date().toISOString(), support: 0, confirmations: 0, photoUrl: '', coordinates, workflowHistory: [], imageFile })
  }

  return <div className="new-incident-scrim" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="new-incident-modal" onSubmit={submit}>
    <button type="button" className="incident-detail-close" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
    <span className="eyebrow">PARTICIPE DA MUDANÇA</span><h2>Reporte rápido</h2><p className="new-incident-intro">Escolha a categoria e marque o local exato no mapa ou use sua localização atual.</p>
    {!user ? <div className="my-5 rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-blue-950">Para evitar envios anônimos e acompanhar a ocorrência, entre ou crie uma conta antes de publicar.</p><button type="button" onClick={() => { onClose(); openAuthModal() }} className="mt-3 rounded-lg bg-brand-primary transition-colors hover:bg-brand-dark px-4 py-2 text-sm font-semibold text-white">Entrar ou criar conta</button></div> : <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{categories.map(({ title: name, icon: Icon, tone }) => <button type="button" key={name} aria-pressed={category === name} onClick={() => setCategory(name)} className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-xs font-semibold transition hover:-translate-y-0.5 ${tone} ${category === name ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}><Icon size={28} strokeWidth={2.2} /><span>{name}</span></button>)}</div>
      <label>Título da ocorrência<input required maxLength={100} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: Alagamento na avenida principal" /></label>
      <label>Descrição<textarea required rows={3} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="Descreva o problema e como afeta a comunidade" /></label>
      <div className="new-incident-fields"><label>Município<select required value={municipality} onChange={event => setMunicipality(event.target.value)}>{municipalities.map(city => <option key={city}>{city}</option>)}</select></label><label>Bairro<input required value={neighborhood} onChange={event => setNeighborhood(event.target.value)} placeholder="Nome do bairro" /></label></div>
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-3"><button type="button" onClick={locateMe} disabled={locating} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800 disabled:opacity-60">{locating ? <LoaderCircle className="animate-spin" size={16} /> : <MapPin size={16} />}{locating ? 'Localizando…' : 'Usar localização atual'}</button><span className="text-xs text-slate-600">{coordinates ? `Ponto marcado: ${coordinates[0].toFixed(5)}, ${coordinates[1].toFixed(5)}` : 'Toque no mapa para marcar o local.'}</span></div>
      <label className="photo-upload"><ImagePlus size={17} /><span>{imageFile ? imageFile.name : 'Adicionar foto (opcional)'}</span><input type="file" accept="image/*" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) { setError('Selecione um arquivo de imagem válido.'); return } if (file.size > 5 * 1024 * 1024) { setError('A foto deve ter no máximo 5 MB.'); return } setError(''); setImageFile(file); setPreviewUrl(URL.createObjectURL(file)) }} /></label>
      {previewUrl && <img src={previewUrl} alt="Prévia da foto anexada" className="h-36 w-full rounded-xl object-cover" />}
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="new-incident-actions"><button type="button" className="secondary-action" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button">Publicar ocorrência</button></div>
    </>}
  </form></div>
}

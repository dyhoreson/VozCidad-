import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { Occurrence, OccurrenceCategory } from '../../types'

type Coordinates = [number, number]
const defaultCenter: Coordinates = [-5.7945, -35.2094]
const categoryStyle: Record<string, { tone: string; icon: string; title: string }> = {
  'Ponto de alagamento': { tone: 'flood', icon: '🌊', title: 'Alagamento' }, alagamento: { tone: 'flood', icon: '🌊', title: 'Alagamento' },
  'Árvore para poda': { tone: 'tree', icon: '🌳', title: 'Árvore para poda' }, poda_arvore: { tone: 'tree', icon: '🌳', title: 'Árvore para poda' },
  'Semáforo apagado': { tone: 'traffic-light', icon: '🚦', title: 'Semáforo quebrado' }, semaforo_quebrado: { tone: 'traffic-light', icon: '🚦', title: 'Semáforo quebrado' },
  'Acidente de trânsito': { tone: 'accident', icon: '💥', title: 'Acidente de trânsito' }, acidente_transito: { tone: 'accident', icon: '💥', title: 'Acidente de trânsito' },
  Infraestrutura: { tone: 'infrastructure', icon: '🔧', title: 'Infraestrutura' }, Iluminação: { tone: 'lighting', icon: '💡', title: 'Iluminação' },
  'Água e saneamento': { tone: 'water', icon: '🚰', title: 'Água e saneamento' }, Segurança: { tone: 'safety', icon: '🛡️', title: 'Segurança' },
}

function markerIcon(category: OccurrenceCategory) {
  const style = categoryStyle[category] ?? categoryStyle.Infraestrutura
  return L.divIcon({ className: 'incident-marker-shell', html: `<span class="incident-marker incident-marker-${style.tone}" aria-hidden="true"><b>${style.icon}</b></span>`, iconSize: [38, 44], iconAnchor: [19, 38], popupAnchor: [0, -36] })
}

function selectedPointIcon() {
  return L.divIcon({ className: 'incident-marker-shell', html: '<span class="incident-selected-point" aria-hidden="true"></span>', iconSize: [28, 28], iconAnchor: [14, 14] })
}

function MapInteractions({ occurrences, onMapClick }: { occurrences: Occurrence[]; onMapClick?: (coordinates: Coordinates) => void }) {
  const map = useMap()
  useMapEvents({ click: event => onMapClick?.([event.latlng.lat, event.latlng.lng]) })
  useEffect(() => {
    if (occurrences.length === 1) map.flyTo(occurrences[0].coordinates, 14, { duration: 0.45 })
    else if (occurrences.length > 1) map.fitBounds(occurrences.map(item => item.coordinates), { padding: [34, 34], maxZoom: 12 })
    else map.setView(defaultCenter, 8)
  }, [map, occurrences])
  return null
}

export function IncidentMap({ occurrences, onSelect, onMapClick, draftLocation, className = '' }: { occurrences: Occurrence[]; onSelect: (occurrence: Occurrence) => void; onMapClick?: (coordinates: Coordinates) => void; draftLocation?: Coordinates | null; className?: string }) {
  return <div className={`incident-map-wrap ${className}`}><MapContainer center={defaultCenter} zoom={10} scrollWheelZoom className="incident-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <MapInteractions occurrences={occurrences} onMapClick={onMapClick} />
    {occurrences.map(item => { const style = categoryStyle[item.category] ?? categoryStyle.Infraestrutura; return <Marker key={item.id} position={item.coordinates} icon={markerIcon(item.category)} eventHandlers={{ click: () => onSelect(item) }}><Tooltip direction="top" offset={[0, -22]}>{style.title} · {item.title} · {item.status}</Tooltip></Marker> })}
    {draftLocation && <Marker position={draftLocation} icon={selectedPointIcon()} interactive={false} />}
  </MapContainer><div className="map-legend"><strong>Tipo de ocorrência</strong><span><i className="legend-flood" />Alagamento</span><span><i className="legend-tree" />Poda</span><span><i className="legend-traffic" />Semáforo</span><span><i className="legend-accident" />Acidente</span></div>{onMapClick && <div className="map-tap-hint">Toque no mapa para marcar um local</div>}</div>
}

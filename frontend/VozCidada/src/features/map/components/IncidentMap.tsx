import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Occurrence } from '../../../types'

const markerIcon = (occurrence: Occurrence) => {
  const tone = occurrence.status === 'Em Reparo' ? 'repair' : occurrence.status === 'Reparo Realizado' ? 'completed' : occurrence.status === 'Solicitação Improcedente' ? 'improper' : 'awaiting'
  const mark = tone === 'repair' ? '↻' : tone === 'completed' ? '✓' : tone === 'improper' ? '×' : '…'
  return L.divIcon({ className: 'incident-marker-shell', html: `<span class="incident-marker ${tone}"><b>${mark}</b></span>`, iconSize: [34, 42], iconAnchor: [17, 35], popupAnchor: [0, -34] })
}

function FitOccurrences({ occurrences }: { occurrences: Occurrence[] }) {
  const map = useMap()
  useEffect(() => {
    if (occurrences.length === 1) map.flyTo(occurrences[0].coordinates, 14, { duration: 0.45 })
    else if (occurrences.length) map.fitBounds(occurrences.map(item => item.coordinates), { padding: [34, 34], maxZoom: 12 })
  }, [map, occurrences])
  return null
}

export function IncidentMap({ occurrences, onSelect }: { occurrences: Occurrence[]; onSelect: (occurrence: Occurrence) => void }) {
  return <div className="incident-map-wrap"><MapContainer center={[-5.8, -36.2]} zoom={7} scrollWheelZoom className="incident-map">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <FitOccurrences occurrences={occurrences} />
    {occurrences.map(item => <Marker key={item.id} position={item.coordinates} icon={markerIcon(item)} eventHandlers={{ click: () => onSelect(item) }} />)}
  </MapContainer><div className="map-legend"><strong>Status do protocolo</strong><span><i className="legend-awaiting" />Aguardando</span><span><i className="legend-repair" />Em reparo</span><span><i className="legend-completed" />Realizado</span><span><i className="legend-improper" />Improcedente</span></div></div>
}

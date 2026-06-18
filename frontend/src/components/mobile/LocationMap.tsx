import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'

export interface LatLng {
  lat: number
  lng: number
}

export interface WorkPoint extends LatLng {
  radius: number
  name: string
}

interface Props {
  position?: LatLng | null
  work?: WorkPoint | null
  height?: number
}

/** Pans the map when the user's GPS position arrives/changes. */
function Recenter({ position }: { position?: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo([position.lat, position.lng], 16, { duration: 0.8 })
  }, [map, position])
  return null
}

const FALLBACK: LatLng = { lat: -6.2, lng: 106.816666 } // Jakarta

export function LocationMap({ position, work, height = 200 }: Props) {
  const center = position ?? work ?? FALLBACK

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height, width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {work && (
        <>
          <Circle
            center={[work.lat, work.lng]}
            radius={work.radius}
            pathOptions={{ color: '#0ea5e9', fillColor: '#0ea5e9', fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[work.lat, work.lng]}
            radius={6}
            pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 1 }}
          >
            <Tooltip>{work.name}</Tooltip>
          </CircleMarker>
        </>
      )}

      {position && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={8}
          pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }}
        >
          <Tooltip>Lokasi Anda</Tooltip>
        </CircleMarker>
      )}

      <Recenter position={position} />
    </MapContainer>
  )
}

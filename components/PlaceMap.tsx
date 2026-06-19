'use client'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { Reccie } from '@/lib/types'
import L from 'leaflet'
import Link from 'next/link'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Green marker for reccies
const reccieIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

// Grey marker for saves
const saveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
})

interface Props { reccies: Reccie[] }

export default function PlaceMap({ reccies }: Props) {
  const withCoords = reccies.filter(r => r.place?.lat && r.place?.lng)
  const center: [number, number] = withCoords.length > 0
    ? [withCoords[0].place!.lat!, withCoords[0].place!.lng!]
    : [54.0, -2.5] // UK centre

  return (
    <MapContainer center={center} zoom={6} className="w-full h-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {withCoords.map(reccie => (
        <Marker
          key={reccie.id}
          position={[reccie.place!.lat!, reccie.place!.lng!]}
          icon={reccie.type === 'reccie' ? reccieIcon : saveIcon}
        >
          <Popup maxWidth={240}>
            {reccie.place?.images?.[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={reccie.place.images[0]} alt="" className="w-full h-28 object-cover rounded mb-2" />
            )}
            <div className="space-y-1">
              <p className="font-semibold text-sm">{reccie.place?.name}</p>
              <p className="text-xs text-gray-500">{reccie.place?.location}</p>
              {reccie.place?.cost_per_night && (
                <p className="text-sm font-medium text-green-700">£{reccie.place.cost_per_night}/night</p>
              )}
              {reccie.place?.sleeps && <p className="text-xs">Sleeps {reccie.place.sleeps}</p>}
              {reccie.profile && (
                <p className="text-xs text-gray-400">
                  Reccie'd by{' '}
                  <Link href={`/profile/${reccie.profile.username}`} className="text-green-700 hover:underline">
                    {reccie.profile.display_name ?? reccie.profile.username}
                  </Link>
                </p>
              )}
              {reccie.what_made_it_special && (
                <p className="text-xs italic text-gray-500 border-l-2 border-green-200 pl-2">
                  "{reccie.what_made_it_special}"
                </p>
              )}
              <a href={reccie.place?.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block pt-1">
                View listing ↗
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

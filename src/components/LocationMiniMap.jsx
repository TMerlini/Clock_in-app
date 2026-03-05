import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import './LocationMiniMap.css';

// Fix default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const clockInIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const clockOutIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
      }
    }
  }, [map, bounds]);
  return null;
}

export function LocationMiniMap({ clockInCoords, clockOutCoords, height = 150 }) {
  const { t } = useTranslation();

  const bounds = useMemo(() => {
    const pts = [];
    if (clockInCoords?.lat && clockInCoords?.lng) pts.push([clockInCoords.lat, clockInCoords.lng]);
    if (clockOutCoords?.lat && clockOutCoords?.lng) pts.push([clockOutCoords.lat, clockOutCoords.lng]);
    return pts;
  }, [clockInCoords, clockOutCoords]);

  if (bounds.length === 0) return null;

  const center = bounds[0];

  return (
    <div className="location-mini-map" style={{ height }}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', borderRadius: '8px' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitBounds bounds={bounds} />

        {clockInCoords?.lat && clockInCoords?.lng && (
          <Marker position={[clockInCoords.lat, clockInCoords.lng]} icon={clockInIcon}>
            <Popup>
              <strong>{t('session.clockInLocation')}</strong>
              <br />
              {clockInCoords.address}
            </Popup>
          </Marker>
        )}

        {clockOutCoords?.lat && clockOutCoords?.lng && (
          <Marker position={[clockOutCoords.lat, clockOutCoords.lng]} icon={clockOutIcon}>
            <Popup>
              <strong>{t('session.clockOutLocation')}</strong>
              <br />
              {clockOutCoords.address}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

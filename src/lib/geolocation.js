const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const GPS_TIMEOUT = 10000;

export function isGeolocationAvailable() {
  return 'geolocation' in navigator;
}

function getPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: GPS_TIMEOUT,
      maximumAge: 60000,
    });
  });
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'ClockInApp/1.0 (contacto@clock-in.pt)' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway || '',
      a.house_number || '',
    ].filter(Boolean);
    const locality = a.city || a.town || a.village || a.suburb || '';
    if (locality) parts.push(locality);
    return parts.join(', ') || data.display_name?.split(',').slice(0, 3).join(',') || null;
  } catch {
    return null;
  }
}

/**
 * Captures GPS position quickly without reverse geocoding.
 * Returns { lat, lng, address } with raw coords as address.
 * Use for fast persistence; follow up with captureLocation() for full address.
 */
export async function captureLocationQuick() {
  if (!isGeolocationAvailable()) {
    throw new Error('Geolocation not available');
  }
  const position = await getPosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  return { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
}

/**
 * Captures the current GPS position and reverse-geocodes it.
 * Returns { lat, lng, address } or throws on failure.
 */
export async function captureLocation() {
  if (!isGeolocationAvailable()) {
    throw new Error('Geolocation not available');
  }

  const position = await getPosition();
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;

  const address = await reverseGeocode(lat, lng) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

  return { lat, lng, address };
}

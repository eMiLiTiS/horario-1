export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
}

export interface GeoValidation {
  position: GeoPosition
  distance_meters: number
  is_valid: boolean
}

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Maximum time to wait for a GPS position.
const GPS_OPTIONS_TIMEOUT_MS = 5_000

// JS-level safety timeout: fires 500 ms after the browser option so we have a
// guaranteed upper bound even when the browser ignores options.timeout.
// Reproduced on desktop Chrome with enableHighAccuracy=true and no GPS hardware:
// the error callback simply never fires, leaving the Promise pending forever.
const GPS_BAIL_TIMEOUT_MS = GPS_OPTIONS_TIMEOUT_MS + 500

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation no está disponible en este dispositivo'))
      return
    }

    // Bail timer fires if the browser never calls success or error.
    // Both callbacks call clearTimeout so only one of the two paths settles
    // the promise; subsequent resolve/reject calls on an already-settled
    // promise are safe no-ops in the JS spec.
    const bail = setTimeout(
      () => reject(new Error('Tiempo de espera agotado al obtener la ubicación.')),
      GPS_BAIL_TIMEOUT_MS,
    )

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(bail)
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
      },
      (err) => {
        clearTimeout(bail)
        switch (err.code) {
          case err.PERMISSION_DENIED:
            reject(new Error('Permiso de ubicación denegado. Actívalo en los ajustes del dispositivo.'))
            break
          case err.POSITION_UNAVAILABLE:
            reject(new Error('Ubicación no disponible. Comprueba que el GPS está activado.'))
            break
          case err.TIMEOUT:
            reject(new Error('Tiempo de espera agotado al obtener la ubicación.'))
            break
          default:
            reject(new Error('Error desconocido al obtener la ubicación.'))
        }
      },
      { enableHighAccuracy: true, timeout: GPS_OPTIONS_TIMEOUT_MS, maximumAge: 0 },
    )
  })
}

export async function validatePosition(
  companyLat: number,
  companyLng: number,
  radiusMeters: number,
): Promise<GeoValidation> {
  const position = await getCurrentPosition()
  const distance_meters = haversineMeters(position.lat, position.lng, companyLat, companyLng)
  return {
    position,
    distance_meters,
    is_valid: distance_meters <= radiusMeters,
  }
}

export function getDeviceInfo(): Record<string, unknown> {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screen: { width: screen.width, height: screen.height },
    online: navigator.onLine,
  }
}

import { useCallback, useState } from 'react'

export interface Coordinates {
  latitude: number
  longitude: number
}

interface GeolocationState {
  loading: boolean
  error: string | null
  coords: Coordinates | null
}

/**
 * Wraps the browser Geolocation API as an imperative `request()` promise,
 * suitable for use right before a clock-in/out call.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    coords: null,
  })

  const request = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        const error = 'Perangkat tidak mendukung geolokasi.'
        setState({ loading: false, error, coords: null })
        reject(new Error(error))
        return
      }

      setState((s) => ({ ...s, loading: true, error: null }))

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          setState({ loading: false, error: null, coords })
          resolve(coords)
        },
        (err) => {
          const error =
            err.code === err.PERMISSION_DENIED
              ? 'Izin lokasi ditolak. Aktifkan lokasi untuk absen.'
              : 'Gagal mendapatkan lokasi Anda.'
          setState({ loading: false, error, coords: null })
          reject(new Error(error))
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      )
    })
  }, [])

  return { ...state, request }
}

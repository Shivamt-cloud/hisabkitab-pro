import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const GEOCODE_API = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_GEOCODE = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const WEATHER_CITY_KEY = 'hisabkitab_weather_city'

type Coords = { lat: number; lon: number }

type LocationContextType = {
  placeName: string | null
  coords: Coords | null
  loading: boolean
  error: string | null
  setLocation: (city: string) => void
  clearAndRedetect: () => void
}

const LocationContext = createContext<LocationContextType | undefined>(undefined)

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (ctx === undefined) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}

/** Use when component may render outside LocationProvider (e.g. WeatherWidget used elsewhere). */
export function useLocationOptional(): LocationContextType | undefined {
  return useContext(LocationContext)
}

const ipProviders: Array<() => Promise<Coords | null>> = [
  () =>
    fetch('https://ipinfo.io/json')
      .then((r) => r.json())
      .then((d) => {
        const [lat, lon] = (d?.loc || '').split(',').map(Number)
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
      }),
  () =>
    fetch('https://ipapi.co/json/?fields=latitude,longitude')
      .then((r) => r.json())
      .then((d) => {
        const lat = d?.latitude
        const lon = d?.longitude
        return typeof lat === 'number' && typeof lon === 'number' ? { lat, lon } : null
      }),
  () =>
    fetch('https://get.geojs.io/v1/ip/geo.json')
      .then((r) => r.json())
      .then((d) => {
        const lat = parseFloat(d?.latitude)
        const lon = parseFloat(d?.longitude)
        return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
      }),
]

async function tryProviders(): Promise<Coords | null> {
  for (const fn of ipProviders) {
    try {
      const r = await fn()
      if (r) return r
    } catch {}
  }
  return null
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const r = await fetch(`${REVERSE_GEOCODE}?latitude=${lat}&longitude=${lon}`)
  const rev = await r.json()
  const city = rev?.city || rev?.locality || rev?.principalSubdivision
  return city ? String(city) : `${lat.toFixed(1)}°, ${lon.toFixed(1)}°`
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [placeName, setPlaceName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    const savedCity = localStorage.getItem(WEATHER_CITY_KEY)?.trim()
    const useCoords = (lat: number, lon: number, city: string) => {
      if (!cancelled) {
        setCoords({ lat, lon })
        setPlaceName(city)
        setError(null)
      }
    }
    const fail = () => {
      if (!cancelled) {
        setError('Location unavailable')
        setLoading(false)
      }
    }
    if (savedCity) {
      fetch(`${GEOCODE_API}?name=${encodeURIComponent(savedCity)}&count=1`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return
          const first = data?.results?.[0]
          if (first?.latitude != null && first?.longitude != null) {
            useCoords(first.latitude, first.longitude, first.name || savedCity)
          } else fail()
        })
        .catch(fail)
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }
    setLoading(true)
    setError(null)
    tryProviders()
      .then((result) => {
        if (cancelled || !result) {
          fail()
          return
        }
        return reverseGeocode(result.lat, result.lon).then(
          (city) => {
            if (!cancelled) useCoords(result.lat, result.lon, city)
          },
          () => {
            if (!cancelled) useCoords(result.lat, result.lon, `${result.lat.toFixed(1)}°, ${result.lon.toFixed(1)}°`)
          }
        )
      })
      .catch(fail)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refresh])

  const setLocation = useCallback((city: string) => {
    const name = city.trim()
    if (!name) return
    fetch(`${GEOCODE_API}?name=${encodeURIComponent(name)}&count=1`)
      .then((r) => r.json())
      .then((data) => {
        const first = data?.results?.[0]
        if (first?.latitude != null && first?.longitude != null) {
          localStorage.setItem(WEATHER_CITY_KEY, first.name || name)
          setCoords({ lat: first.latitude, lon: first.longitude })
          setPlaceName(first.name || name)
          setError(null)
        }
      })
  }, [])

  const clearAndRedetect = useCallback(() => {
    localStorage.removeItem(WEATHER_CITY_KEY)
    setCoords(null)
    setPlaceName(null)
    setError(null)
    setLoading(true)
    setRefresh((k) => k + 1)
  }, [])

  const value: LocationContextType = {
    placeName,
    coords,
    loading,
    error,
    setLocation,
    clearAndRedetect,
  }

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

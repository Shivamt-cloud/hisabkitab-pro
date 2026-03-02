import { useState, useEffect } from 'react'
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, CloudFog, MapPin } from 'lucide-react'
import { useLocationOptional } from '../context/LocationContext'

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast'
const GEOCODE_API = 'https://geocoding-api.open-meteo.com/v1/search'
const REVERSE_GEOCODE = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const WEATHER_CITY_KEY = 'hisabkitab_weather_city'

// WMO weather codes → label + icon
function getWeatherInfo(code: number): { label: string; icon: React.ReactNode } {
  if (code === 0) return { label: 'Clear', icon: <Sun className="h-8 w-8" /> }
  if (code >= 1 && code <= 3) return { label: 'Cloudy', icon: <Cloud className="h-8 w-8" /> }
  if (code === 45 || code === 48) return { label: 'Foggy', icon: <CloudFog className="h-8 w-8" /> }
  if (code >= 51 && code <= 67) return { label: 'Drizzle / Rain', icon: <CloudRain className="h-8 w-8" /> }
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: <Snowflake className="h-8 w-8" /> }
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: <CloudRain className="h-8 w-8" /> }
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: <Snowflake className="h-8 w-8" /> }
  if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: <CloudLightning className="h-8 w-8" /> }
  return { label: 'Partly cloudy', icon: <Cloud className="h-8 w-8" /> }
}

interface WeatherData {
  temp: number
  apparentTemp: number | null
  code: number
  humidity: number
  wind: number
}

export function WeatherWidget({ inline = false }: { inline?: boolean }) {
  const location = useLocationOptional()
  const [standaloneCoords, setStandaloneCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [standalonePlaceName, setStandalonePlaceName] = useState<string | null>(null)
  const [standaloneLoading, setStandaloneLoading] = useState(true)
  const [standaloneError, setStandaloneError] = useState<string | null>(null)
  const [standaloneRefresh, setStandaloneRefresh] = useState(0)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(true)
  const [weatherError, setWeatherError] = useState<string | null>(null)

  const coords = location ? location.coords : standaloneCoords
  const placeName = location ? location.placeName : standalonePlaceName
  const locationLoading = location ? location.loading : standaloneLoading
  const locationError = location ? location.error : standaloneError

  // Standalone location detection when not inside LocationProvider
  useEffect(() => {
    if (location) return
    let cancelled = false
    const savedCity = localStorage.getItem(WEATHER_CITY_KEY)?.trim()
    const useCoords = (lat: number, lon: number, city: string) => {
      if (!cancelled) {
        setStandaloneCoords({ lat, lon })
        setStandalonePlaceName(city)
        setStandaloneError(null)
      }
    }
    const fail = () => {
      if (!cancelled) {
        setStandaloneError('Location unavailable')
        setStandaloneLoading(false)
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
        .finally(() => { if (!cancelled) setStandaloneLoading(false) })
      return () => { cancelled = true }
    }
    const ipProviders: Array<() => Promise<{ lat: number; lon: number } | null>> = [
      () => fetch('https://ipinfo.io/json').then((r) => r.json()).then((d) => {
        const [lat, lon] = (d?.loc || '').split(',').map(Number)
        return (Number.isFinite(lat) && Number.isFinite(lon)) ? { lat, lon } : null
      }),
      () => fetch('https://ipapi.co/json/?fields=latitude,longitude').then((r) => r.json()).then((d) => {
        const lat = d?.latitude
        const lon = d?.longitude
        return (typeof lat === 'number' && typeof lon === 'number') ? { lat, lon } : null
      }),
      () => fetch('https://get.geojs.io/v1/ip/geo.json').then((r) => r.json()).then((d) => {
        const lat = parseFloat(d?.latitude)
        const lon = parseFloat(d?.longitude)
        return (Number.isFinite(lat) && Number.isFinite(lon)) ? { lat, lon } : null
      }),
    ]
    const tryProviders = async (): Promise<{ lat: number; lon: number } | null> => {
      for (const fn of ipProviders) {
        try {
          const r = await fn()
          if (r) return r
        } catch {}
      }
      return null
    }
    setStandaloneLoading(true)
    setStandaloneError(null)
    tryProviders()
      .then((result) => {
        if (cancelled || !result) { fail(); return }
        return fetch(`${REVERSE_GEOCODE}?latitude=${result.lat}&longitude=${result.lon}`)
          .then((r) => r.json())
          .then((rev) => {
            if (cancelled) return
            const city = rev?.city || rev?.locality || rev?.principalSubdivision
            useCoords(result.lat, result.lon, city ? String(city) : `${result.lat.toFixed(1)}°, ${result.lon.toFixed(1)}°`)
          })
          .catch(() => { if (!cancelled) useCoords(result.lat, result.lon, `${result.lat.toFixed(1)}°, ${result.lon.toFixed(1)}°`) })
      })
      .catch(fail)
      .finally(() => { if (!cancelled) setStandaloneLoading(false) })
    return () => { cancelled = true }
  }, [location, standaloneRefresh])

  useEffect(() => {
    if (!coords) return
    const url = `${OPEN_METEO}?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m`
    let cancelled = false
    setWeatherLoading(true)
    setWeatherError(null)
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Weather API error')
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const c = data?.current
        if (c) {
          const temp = c.temperature_2m ?? 0
          const apparent = c.apparent_temperature
          setWeather({
            temp,
            apparentTemp: typeof apparent === 'number' ? apparent : null,
            code: c.weather_code ?? 0,
            humidity: c.relative_humidity_2m ?? 0,
            wind: c.wind_speed_10m ?? 0,
          })
        } else {
          setWeatherError('Weather unavailable')
        }
      })
      .catch(() => {
        if (!cancelled) setWeatherError('Weather unavailable')
      })
      .finally(() => {
        if (!cancelled) setWeatherLoading(false)
      })
    return () => { cancelled = true }
  }, [coords])

  const handleSetLocation = () => {
    const city = window.prompt('Enter your city (e.g. Lucknow), or leave empty to auto-detect', placeName || '')
    if (city === null) return
    if (!city.trim()) {
      localStorage.removeItem(WEATHER_CITY_KEY)
      if (location) {
        location.clearAndRedetect()
      } else {
        setStandaloneCoords(null)
        setStandalonePlaceName(null)
        setStandaloneError(null)
        setStandaloneLoading(true)
        setStandaloneRefresh((k) => k + 1)
      }
      setWeather(null)
      setWeatherError(null)
      return
    }
    const name = city.trim()
    if (location) {
      location.setLocation(name)
      return
    }
    fetch(`${GEOCODE_API}?name=${encodeURIComponent(name)}&count=1`)
      .then((r) => r.json())
      .then((data) => {
        const first = data?.results?.[0]
        if (first?.latitude != null && first?.longitude != null) {
          localStorage.setItem(WEATHER_CITY_KEY, first.name || name)
          setStandaloneCoords({ lat: first.latitude, lon: first.longitude })
          setStandalonePlaceName(first.name || name)
          setStandaloneError(null)
        } else {
          window.alert('City not found. Try another name.')
        }
      })
      .catch(() => window.alert('Could not find city. Try again.'))
  }

  const loading = location ? locationLoading || weatherLoading : weatherLoading
  const error = location ? locationError || weatherError : weatherError

  if (loading && !weather) {
    if (inline) {
      return <span className="hidden md:inline font-mono text-sm text-gray-400">Weather …</span>
    }
    return (
      <div className="hidden md:flex items-center gap-3 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-900/90 to-blue-900/90 px-4 py-2.5 shadow-md ring-1 ring-sky-500/30 animate-pulse min-w-[140px]">
        <div className="h-8 w-8 rounded-full bg-sky-500/30" />
        <div className="space-y-1">
          <div className="h-3 w-20 bg-sky-500/30 rounded" />
          <div className="h-5 w-12 bg-sky-500/30 rounded" />
        </div>
      </div>
    )
  }

  if (error || !weather) {
    if (inline) {
      return (
        <button type="button" onClick={handleSetLocation} className="hidden md:inline-flex items-center gap-1 font-mono text-sm text-amber-600 hover:text-amber-700">
          <MapPin className="h-3 w-3" /> Weather unavailable
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={handleSetLocation}
        className="hidden md:flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-900/30 px-4 py-2.5 min-w-[140px] hover:bg-amber-900/50 text-left"
        title="Set location or retry auto-detect"
      >
        <MapPin className="h-4 w-4 text-amber-400/80 shrink-0" />
        <p className="text-xs text-amber-200/90">{error || 'Weather unavailable'}</p>
      </button>
    )
  }

  const info = getWeatherInfo(weather.code)

  /** Inline one-liner for header strip (no box) */
  if (inline) {
    return (
      <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-sm text-gray-700 [&_svg]:w-4 [&_svg]:h-4">
        <span className="text-sky-600 shrink-0">{info.icon}</span>
        <button
          type="button"
          onClick={handleSetLocation}
          className="inline-flex items-center gap-1 hover:text-sky-700 focus:outline-none"
          title="Change location"
        >
          {placeName ?? 'Weather'}
          <MapPin className="h-3 w-3 opacity-70" />
        </button>
        <span className="tabular-nums font-semibold text-gray-900">
          {Math.round(weather.temp)}°C
          {weather.apparentTemp != null && (
            <span className="font-normal text-gray-500 ml-0.5">(feels {Math.round(weather.apparentTemp)}°C)</span>
          )}
        </span>
        <span className="text-gray-500">{info.label}</span>
      </span>
    )
  }

  return (
    <div className="hidden md:flex relative items-center gap-3 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-900/95 to-blue-900/95 px-4 py-2.5 shadow-md ring-1 ring-sky-500/40 overflow-hidden">
      <div className="absolute inset-0 bg-[length:200%_100%] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <div className="text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.4)] animate-weather-icon">
          {info.icon}
        </div>
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={handleSetLocation}
            className="flex items-center gap-1 text-[10px] font-semibold tracking-widest text-sky-400/95 hover:text-sky-300 focus:outline-none focus:ring-0"
            title="Change location"
          >
            {placeName ?? 'Weather'}
            <MapPin className="h-3 w-3 opacity-70" />
          </button>
          <p className="text-sm font-bold tabular-nums text-white drop-shadow-sm">
            {Math.round(weather.temp)}°C
            {weather.apparentTemp != null && (
              <span className="font-normal text-sky-200/90 ml-1">(feels {Math.round(weather.apparentTemp)}°C)</span>
            )}
          </p>
          <p className="text-[10px] text-sky-200/90 truncate max-w-[100px]">{info.label}</p>
          <p className="text-[9px] text-sky-300/80">
            H {weather.humidity}% · W {weather.wind} km/h
          </p>
        </div>
      </div>
    </div>
  )
}


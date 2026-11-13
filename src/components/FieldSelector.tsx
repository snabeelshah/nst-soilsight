import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'
import { useAppStore } from '../store/useAppStore'
import { translations } from '../i18n/translations'
import { fetchNASAClimateData } from '../api/nasa-power'
import { fetchSoilData } from '../api/soilgrids'
import { DEMO_LOCATIONS } from '../lib/demoLocations'
import {
  MapPin, Layers, RefreshCw, AlertCircle, Sparkles, CheckCircle2, Search,
  Compass, Satellite, Eye, Trash2, Upload
} from 'lucide-react'

// Fix default leaflet marker icon issue in Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Calculate polygon area in hectares using spherical polygon formula
function computePolygonAreaHectares(coords: { lat: number; lng: number }[]): number {
  if (coords.length < 3) return 0
  const radius = 6378137
  let area = 0

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    const p1 = coords[i]
    const p2 = coords[j]
    const lat1 = (p1.lat * Math.PI) / 180
    const lat2 = (p2.lat * Math.PI) / 180
    const lon1 = (p1.lng * Math.PI) / 180
    const lon2 = (p2.lng * Math.PI) / 180
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  area = Math.abs((area * radius * radius) / 2.0)
  return Math.round((area / 10000) * 100) / 100
}

function computeCenter(coords: { lat: number; lng: number }[]): { lat: number; lng: number } {
  const sumLat = coords.reduce((s, c) => s + c.lat, 0)
  const sumLng = coords.reduce((s, c) => s + c.lng, 0)
  return {
    lat: Math.round((sumLat / coords.length) * 10000) / 10000,
    lng: Math.round((sumLng / coords.length) * 10000) / 10000,
  }
}

interface FieldSelectorProps {
  onImportDataset: () => void
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({ onImportDataset }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const gibsLayerRef = useRef<L.TileLayer | null>(null)

  const {
    field, setField,
    nasaLoading, soilLoading,
    setNasaLoading, setSoilLoading,
    setNasaError, setSoilError,
    recalculateAll,
    language
  } = useAppStore()

  const t = translations[language]

  const [activeLayer, setActiveLayer] = useState<'osm' | 'gibs'>('osm')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const initialCenter: [number, number] = field ? [field.center.lat, field.center.lng] : [30.1575, 71.5249]
    const initialZoom = field ? 14 : 7

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
    })

    // Base OSM Layer with clean dark styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | NASA Earth Science',
      maxZoom: 19,
    }).addTo(map)

    // NASA GIBS MODIS Terra Surface Reflectance layer
    const gibsLayer = L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_SurfaceReflectance_Bands143/default/2024-05-01/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
      {
        attribution: '&copy; NASA GIBS / EOSDIS',
        maxZoom: 9,
        opacity: 0.85,
      }
    )
    gibsLayerRef.current = gibsLayer

    // Feature group to hold drawn items
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Draw initial field boundary if present
    if (field && field.coordinates.length > 0) {
      const latlngs = field.coordinates.map(c => [c.lat, c.lng] as [number, number])
      const polygon = L.polygon(latlngs, {
        color: '#06b6d4',
        weight: 3,
        fillColor: '#06b6d4',
        fillOpacity: 0.25,
      })
      drawnItems.addLayer(polygon)
      map.fitBounds(polygon.getBounds(), { padding: [40, 40] })
    }

    // Leaflet Draw Control
    const drawControl = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#38bdf8',
            weight: 3,
            fillColor: '#38bdf8',
            fillOpacity: 0.35,
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#38bdf8',
            weight: 3,
            fillColor: '#38bdf8',
            fillOpacity: 0.35,
          },
        },
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })
    map.addControl(drawControl)

    // Event on draw created
    map.on(L.Draw.Event.CREATED, (event: unknown) => {
      const e = event as { layer: L.Polygon }
      drawnItems.clearLayers()
      const layer = e.layer
      drawnItems.addLayer(layer)

      const rawLatLngs = layer.getLatLngs()[0] as L.LatLng[]
      const coordinates = rawLatLngs.map(pt => ({ lat: pt.lat, lng: pt.lng }))
      const center = computeCenter(coordinates)
      const areaHectares = computePolygonAreaHectares(coordinates)
      const areaAcres = Math.round(areaHectares * 2.47105 * 100) / 100

      setField({
        coordinates,
        center,
        areaHectares: Math.max(0.1, areaHectares),
        areaAcres: Math.max(0.25, areaAcres),
      })
    })

    map.on(L.Draw.Event.DELETED, () => {
      setField(null)
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Sync field changes from demo buttons to map
  useEffect(() => {
    if (!mapInstanceRef.current || !drawnItemsRef.current || !field) return
    drawnItemsRef.current.clearLayers()
    const latlngs = field.coordinates.map(c => [c.lat, c.lng] as [number, number])
    const polygon = L.polygon(latlngs, {
      color: '#06b6d4',
      weight: 3,
      fillColor: '#06b6d4',
      fillOpacity: 0.25,
    })
    drawnItemsRef.current.addLayer(polygon)
    mapInstanceRef.current.fitBounds(polygon.getBounds(), { padding: [50, 50], maxZoom: 15 })
  }, [field])

  // Toggle Map Layers
  const handleLayerToggle = (layerType: 'osm' | 'gibs') => {
    if (!mapInstanceRef.current) return
    const map = mapInstanceRef.current

    if (gibsLayerRef.current) {
      if (layerType === 'gibs') {
        if (!map.hasLayer(gibsLayerRef.current)) {
          gibsLayerRef.current.addTo(map)
        }
      } else {
        if (map.hasLayer(gibsLayerRef.current)) {
          map.removeLayer(gibsLayerRef.current)
        }
      }
    }
    setActiveLayer(layerType)
  }

  // Location search using OpenStreetMap Nominatim
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim() || !mapInstanceRef.current) return
    setSearchLoading(true)

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      )
      const results = await res.json()
      if (results && results.length > 0) {
        const top = results[0]
        const lat = parseFloat(top.lat)
        const lon = parseFloat(top.lon)
        mapInstanceRef.current.setView([lat, lon], 13)

        const d = 0.003
        const coordinates = [
          { lat: lat - d, lng: lon - d },
          { lat: lat - d, lng: lon + d },
          { lat: lat + d, lng: lon + d },
          { lat: lat + d, lng: lon - d },
        ]
        setField({
          coordinates,
          center: { lat, lng: lon },
          areaHectares: 22.0,
          areaAcres: 54.3,
        })
      } else {
        alert('Location not found. Try entering a city or district name.')
      }
    } catch {
      alert('Search service unavailable. Use the map or demo locations.')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleFetchAll = async () => {
    if (!field) return
    setNasaLoading(true)
    setSoilLoading(true)
    setNasaError(null)
    setSoilError(null)

    try {
      const [nasa, soil] = await Promise.all([
        fetchNASAClimateData(field.center.lat, field.center.lng),
        fetchSoilData(field.center.lat, field.center.lng),
      ])
      recalculateAll(nasa, soil)
    } catch (err) {
      setNasaError('Failed to fetch environmental data')
      console.error(err)
    } finally {
      setNasaLoading(false)
      setSoilLoading(false)
    }
  }

  const handleSelectDemo = async (locationIndex: string) => {
    const loc = DEMO_LOCATIONS[Number(locationIndex)]
    if (!loc) return

    const delta = 0.0035
    const coordinates = [
      { lat: loc.lat - delta, lng: loc.lon - delta },
      { lat: loc.lat - delta, lng: loc.lon + delta },
      { lat: loc.lat + delta, lng: loc.lon + delta },
      { lat: loc.lat + delta, lng: loc.lon - delta },
    ]
    setField({
      coordinates,
      center: { lat: loc.lat, lng: loc.lon },
      areaHectares: 24.5,
      areaAcres: 60.5,
    })

    setNasaLoading(true)
    setSoilLoading(true)
    setNasaError(null)
    setSoilError(null)
    try {
      const [nasa, soil] = await Promise.all([
        fetchNASAClimateData(loc.lat, loc.lon),
        fetchSoilData(loc.lat, loc.lon),
      ])
      recalculateAll(nasa, soil)
    } catch (err) {
      setNasaError('Failed to fetch environmental data')
      setSoilError('Failed to fetch environmental data')
      console.error(err)
    } finally {
      setNasaLoading(false)
      setSoilLoading(false)
    }
  }

  const isLoading = nasaLoading || soilLoading

  return (
    <div className="field-selector glass-panel rounded-2xl overflow-hidden border border-[#e7ddcd] shadow-sm transition-all">
      <div className="p-4 border-b border-[#e7ddcd] bg-[#faf7f1]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfd0ba] bg-[#f0e7d8] text-[#806444]">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-[#463927]">
                {t.selectField}
              </h2>
              <p className="text-xs text-[#847766]">{t.drawPrompt}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(event) => {
                void handleSelectDemo(event.target.value)
                event.target.value = ''
              }}
              aria-label="Choose a demo location"
              className="rounded-lg border border-[#e3d7c6] bg-white px-3 py-2 text-xs text-[#66543c] outline-none focus:border-[#a98c65]"
            >
              <option value="" disabled>Demo locations</option>
              {DEMO_LOCATIONS.map((loc, index) => (
                <option key={loc.name} value={index}>{language === 'ur' ? loc.nameUrdu : loc.name}</option>
              ))}
            </select>

            <button
              onClick={onImportDataset}
              className="flex items-center gap-1.5 rounded-lg border border-[#e3d7c6] bg-white px-3 py-2 text-xs font-medium text-[#66543c] transition-colors hover:bg-[#f4ecdf]"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import data</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearch} className="flex min-w-[240px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search region, city or coordinates..."
                className="w-full rounded-lg border border-[#e3d7c6] bg-white px-3.5 py-2 pl-9 text-xs text-[#463927] placeholder-[#a99c8b] transition-all focus:border-[#a98c65] focus:outline-none focus:ring-1 focus:ring-[#cbb99b]"
              />
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a8d7b]" />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="rounded-lg bg-[#806444] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6e5538] disabled:opacity-40"
            >
              {searchLoading ? '...' : 'Locate'}
            </button>
          </form>

          <div className="flex items-center gap-1 rounded-lg border border-[#e3d7c6] bg-white p-1 text-xs">
            <Layers className="ml-1.5 mr-0.5 h-3.5 w-3.5 text-[#8b6a42]" />
            <button
              onClick={() => handleLayerToggle('osm')}
              className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                activeLayer === 'osm' ? 'bg-[#806444] text-white shadow-sm' : 'text-[#847766] hover:text-[#463927]'
              }`}
            >
              Base Map
            </button>
            <button
              onClick={() => handleLayerToggle('gibs')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
                activeLayer === 'gibs' ? 'bg-[#6f8053] text-white shadow-sm' : 'text-[#847766] hover:text-[#463927]'
              }`}
            >
              <Sparkles className="h-3 w-3 text-[#9a7b4f]" />
              Satellite
            </button>
          </div>
        </div>
      </div>

      {/* Map Canvas with HUD overlays */}
      <div className="relative w-full h-[390px] bg-[#eee5d7]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Tool Instructions */}
        {!field && (
          <div className="absolute top-4 left-16 z-10 glass-panel px-4 py-2.5 rounded-xl text-xs text-[#463927] flex items-center gap-2.5 max-w-sm pointer-events-none border border-[#d9c8ae] shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9aaf7d]" />
            <span className="font-medium">
              Use the polygon or square tool on the top-left toolbar to delineate your farm boundary.
            </span>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="p-4 bg-[#faf7f1] border-t border-[#e7ddcd] flex flex-wrap items-center justify-between gap-4">
        {field ? (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Area Pill */}
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#f0e7d8] border border-[#dfd0ba] text-[#66543c]">
              <CheckCircle2 className="w-4 h-4 text-[#806444]" />
              <div>
                <span className="text-[#847766]">{t.fieldArea}: </span>
                <span className="font-bold text-[#463927] text-sm">{field.areaHectares} {t.hectares}</span>
                <span className="text-[#847766] text-[11px] ml-1.5">({field.areaAcres} {t.acres})</span>
              </div>
            </div>

            {/* Coordinates Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-[#e7ddcd] text-[#66543c]">
              <Compass className="w-3.5 h-3.5 text-[#806444]" />
              <span>{field.center.lat.toFixed(4)}°N, {field.center.lng.toFixed(4)}°E</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/20">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Awaiting field boundary delineation or select a quick demo above.</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {field && (
            <button
              onClick={() => {
                drawnItemsRef.current?.clearLayers()
                setField(null)
              }}
              className="px-3 py-2 text-xs font-semibold text-[#847766] hover:text-[#9a563b] flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.clearBoundary}</span>
            </button>
          )}

          <button
            onClick={handleFetchAll}
            disabled={!field || isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              !field || isLoading
                ? 'bg-[#e9e3d9] text-[#a99c8b] cursor-not-allowed border border-[#e2d9cc]'
                : 'bg-[#806444] hover:bg-[#6e5538] text-white shadow-sm'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? t.loadingNasa : t.fetchData}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { MapPin, Search, Pencil, Trash2, RefreshCw, Layers } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { createField, formatCoordinates } from '../lib/geometry'
import { DEMO_LOCATIONS } from '../lib/demoLocations'
export function FieldSelector() {
  const element = useRef<HTMLDivElement>(null),
    mapRef = useRef<L.Map | null>(null),
    drawnRef = useRef<L.FeatureGroup | null>(null)
  const layers = useRef<{ osm: L.TileLayer; satellite: L.TileLayer } | null>(null)
  const searchController = useRef<AbortController | null>(null)
  const { field, loading, setField, fetchData, loadDemo } = useAppStore()
  const [layer, setLayer] = useState<'osm' | 'satellite'>('osm'),
    [tileErrors, setTileErrors] = useState({ osm: false, satellite: false })
  const [query, setQuery] = useState(''),
    [searching, setSearching] = useState(false),
    [message, setMessage] = useState('')
  useEffect(() => {
    if (!element.current) return
    const initial = useAppStore.getState().field?.center
    const map = L.map(element.current, {
      center: initial ? [initial.lat, initial.lng] : [20, 0],
      zoom: initial ? 13 : 2,
      scrollWheelZoom: false,
    })
    mapRef.current = map
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    const satellite = L.tileLayer(
      'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_SurfaceReflectance_Bands143/default/2024-05-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
      { maxNativeZoom: 8, maxZoom: 19, attribution: 'NASA GIBS · MODIS Terra · 1 May 2024' },
    )
    osm.on('tileerror', () => setTileErrors((errors) => ({ ...errors, osm: true })))
    osm.on('tileload', () => setTileErrors((errors) => ({ ...errors, osm: false })))
    satellite.on('tileerror', () => setTileErrors((errors) => ({ ...errors, satellite: true })))
    satellite.on('tileload', () => setTileErrors((errors) => ({ ...errors, satellite: false })))
    osm.addTo(map)
    layers.current = { osm, satellite }
    const drawn = new L.FeatureGroup().addTo(map)
    drawnRef.current = drawn
    const updatePolygon = (polygon: L.Polygon) => {
      try {
        setField(
          createField(
            (polygon.getLatLngs()[0] as L.LatLng[]).map((p) => ({ lat: p.lat, lng: p.lng })),
          ),
        )
        setMessage('Boundary saved. Load NASA data to calculate this field’s plan.')
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Invalid boundary.')
        drawn.clearLayers()
        const previous = useAppStore.getState().field
        if (previous) {
          L.polygon(previous.coordinates, { color: '#315b41', weight: 3, fillOpacity: 0.22 }).addTo(
            drawn,
          )
        }
      }
    }
    map.addControl(
      new L.Control.Draw({
        draw: {
          polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: '#47745a' } },
          rectangle: {},
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
        },
        edit: { featureGroup: drawn },
      }),
    )
    map.on(L.Draw.Event.CREATED, (e) => updatePolygon((e as unknown as { layer: L.Polygon }).layer))
    map.on(L.Draw.Event.EDITED, (e) =>
      (e as unknown as { layers: L.LayerGroup }).layers.eachLayer((l) =>
        updatePolygon(l as L.Polygon),
      ),
    )
    map.on(L.Draw.Event.DELETED, () => {
      setField(null)
      setMessage('Boundary cleared. Search for a supported location and draw a new field.')
    })
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(element.current)
    return () => {
      resize.disconnect()
      searchController.current?.abort()
      map.remove()
      mapRef.current = null
    }
  }, [setField])
  useEffect(() => {
    const map = mapRef.current,
      drawn = drawnRef.current
    if (!map || !drawn) return
    drawn.clearLayers()
    if (field) {
      const polygon = L.polygon(field.coordinates, {
        color: '#315b41',
        weight: 3,
        fillColor: '#709a5c',
        fillOpacity: 0.22,
      }).addTo(drawn)
      map.fitBounds(polygon.getBounds(), { padding: [40, 40], maxZoom: 16, animate: false })
    }
  }, [field])
  const changeLayer = (next: 'osm' | 'satellite') => {
    if (!mapRef.current || !layers.current) return
    mapRef.current.removeLayer(layers.current[layer])
    layers.current[next].addTo(mapRef.current)
    setLayer(next)
    setTileErrors((errors) => ({ ...errors, [next]: false }))
  }
  const loadLiveData = async () => {
    const replacedDemoClimate = useAppStore.getState().nasaData?.kind === 'demo'
    const loaded = await fetchData()
    if (!loaded || useAppStore.getState().nasaData?.kind !== 'live') return
    setMessage(
      replacedDemoClimate
        ? 'Example boundary retained; live NASA climate loaded for its centre point.'
        : 'Live NASA climate loaded for this boundary.',
    )
  }
  const locate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    const value = query.trim()
    const coords = value.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
    if (coords) {
      const lat = Number(coords[1]),
        lon = Number(coords[2])
      if (Math.abs(lat) > 85 || Math.abs(lon) > 180) {
        setMessage('Enter latitude −85 to 85 and longitude −180 to 180.')
        return
      }
      mapRef.current?.setView([lat, lon], 13)
      setMessage('Location found. Draw the actual field boundary here.')
      return
    }
    if (value.length < 3) {
      setMessage('Enter at least three characters or latitude, longitude.')
      return
    }
    setSearching(true)
    searchController.current?.abort()
    const controller = new AbortController()
    searchController.current = controller
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(value)}`,
        { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) },
      )
      if (!response.ok) throw new Error()
      const results: { lat: string; lon: string }[] = await response.json()
      const top = results[0]
      if (top && Number.isFinite(Number(top.lat)) && Number.isFinite(Number(top.lon))) {
        mapRef.current?.setView([Number(top.lat), Number(top.lon)], 13)
        setMessage('Location found. Draw your field to select it.')
      } else setMessage('No location found. Try coordinates or a nearby city.')
    } catch {
      if (!controller.signal.aborted)
        setMessage('Search is unavailable. Enter latitude, longitude or use a demo location.')
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }
  return (
    <section className="panel field-panel" aria-label="Field boundary map">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">01 / YOUR LAND</span>
          <h2>
            <MapPin size={18} /> Choose your field
          </h2>
        </div>
        <select
          aria-label="Choose a demo location"
          value=""
          onChange={(e) => {
            const loc = DEMO_LOCATIONS[Number(e.target.value)]
            loadDemo(loc.lat, loc.lon, loc.name)
            setMessage('Example boundary and synthetic climate loaded.')
          }}
        >
          <option value="" disabled>
            Try a demo location
          </option>
          {DEMO_LOCATIONS.map((l, i) => (
            <option key={l.name} value={i}>
              {l.name}
            </option>
          ))}
        </select>
      </div>
      <div className="map-toolbar">
        <form onSubmit={locate}>
          <Search size={16} />
          <input
            aria-label="Search location or coordinates"
            placeholder="City or latitude, longitude"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn small" disabled={searching}>
            {searching ? 'Finding…' : 'Locate'}
          </button>
        </form>
        <div className="segmented" aria-label="Map layer">
          <button aria-pressed={layer === 'osm'} onClick={() => changeLayer('osm')}>
            Street
          </button>
          <button aria-pressed={layer === 'satellite'} onClick={() => changeLayer('satellite')}>
            <Layers size={13} /> NASA imagery
          </button>
        </div>
      </div>
      <div className="map-wrap">
        <div
          ref={element}
          className="field-map"
          aria-label="Interactive map: use drawing tools to select a field"
        />
        {tileErrors[layer] && (
          <div className="map-notice" role="status">
            {layer === 'satellite'
              ? 'NASA imagery is unavailable. Switch to Street view; boundary drawing and calculations still work.'
              : 'Street map tiles are unavailable. Boundary drawing and calculations still work.'}
          </div>
        )}
      </div>
      {layer === 'satellite' && (
        <p className="caption inset">
          MODIS Terra surface reflectance · 1 May 2024 · coarse regional imagery enlarged at field
          zoom. No within-field analysis.
        </p>
      )}
      <div className="map-footer">
        <div>
          {field ? (
            <>
              <strong>{field.areaHectares.toFixed(2)} ha</strong>
              <span className="muted"> · {field.areaAcres.toFixed(2)} acres</span>
              <div className="caption">
                {formatCoordinates(field.center.lat, field.center.lng)} · calculated boundary area
              </div>
            </>
          ) : (
            <span className="muted">Draw a polygon to begin.</span>
          )}
        </div>
        <div className="button-row">
          <button
            className="btn small"
            onClick={() => {
              if (mapRef.current) {
                new L.Draw.Polygon(mapRef.current as L.DrawMap, {
                  allowIntersection: false,
                  shapeOptions: { color: '#315b41' },
                }).enable()
              }
            }}
          >
            <Pencil size={14} /> Draw
          </button>
          <button
            className="icon-btn"
            aria-label="Clear field boundary"
            disabled={!field}
            onClick={() => setField(null)}
          >
            <Trash2 size={16} />
          </button>
          <button
            className="btn primary"
            onClick={() => void loadLiveData()}
            disabled={!field || loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Loading data…' : 'Load NASA data'}
          </button>
        </div>
      </div>
      {message && (
        <p className="caption inset" role="status">
          {message}
        </p>
      )}
      <p className="caption inset">
        Draw, edit or remove a polygon with the map tools. Its centroid selects one NASA climate
        grid cell; the boundary is not a satellite measurement.
      </p>
    </section>
  )
}

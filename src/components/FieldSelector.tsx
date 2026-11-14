import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { MapPin, Search, Pencil, Trash2, RefreshCw, Layers, Check } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { createField, formatCoordinates, getFieldScaleWarning } from '../lib/geometry'
import { DEMO_LOCATIONS } from '../lib/demoLocations'
const fieldKey = (field: NonNullable<ReturnType<typeof useAppStore.getState>['field']>) =>
  `${field.center.lat.toFixed(6)},${field.center.lng.toFixed(6)},${field.areaHectares.toFixed(3)}`
export function FieldSelector() {
  const element = useRef<HTMLDivElement>(null),
    mapRef = useRef<L.Map | null>(null),
    drawnRef = useRef<L.FeatureGroup | null>(null)
  const centroidRef = useRef<L.CircleMarker | null>(null)
  const queryInput = useRef<HTMLInputElement>(null)
  const layers = useRef<{ osm: L.TileLayer; satellite: L.TileLayer } | null>(null)
  const searchController = useRef<AbortController | null>(null)
  const { field, nasaData, loading, setField, fetchData, loadDemo } = useAppStore()
  const [layer, setLayer] = useState<'osm' | 'satellite'>('osm'),
    [tileErrors, setTileErrors] = useState({ osm: false, satellite: false })
  const [query, setQuery] = useState(''),
    [searching, setSearching] = useState(false),
    [message, setMessage] = useState('')
  const [confirmedFieldKey, setConfirmedFieldKey] = useState<string | null>(() => {
    const state = useAppStore.getState()
    return state.field && state.nasaData ? fieldKey(state.field) : null
  })
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
        const nextField = createField(
          (polygon.getLatLngs()[0] as L.LatLng[]).map((p) => ({ lat: p.lat, lng: p.lng })),
        )
        setField(nextField)
        setConfirmedFieldKey(null)
        setMessage('Boundary saved. Confirm it is one farm before loading NASA data.')
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
      setConfirmedFieldKey(null)
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
      centroidRef.current = null
    }
  }, [setField])
  useEffect(() => {
    const map = mapRef.current,
      drawn = drawnRef.current
    if (!map || !drawn) return
    drawn.clearLayers()
    centroidRef.current?.remove()
    centroidRef.current = null
    if (field) {
      const polygon = L.polygon(field.coordinates, {
        color: '#315b41',
        weight: 3,
        fillColor: '#709a5c',
        fillOpacity: 0.22,
      }).addTo(drawn)
      centroidRef.current = L.circleMarker([field.center.lat, field.center.lng], {
        radius: 7,
        color: '#fffdf4',
        weight: 3,
        fillColor: '#b56f32',
        fillOpacity: 1,
        className: 'nasa-query-point',
      })
        .bindTooltip('NASA query point', {
          permanent: true,
          direction: 'top',
          offset: [0, -8],
          className: 'nasa-query-label',
        })
        .addTo(map)
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
  const startDrawing = () => {
    if (!mapRef.current) return
    new L.Draw.Polygon(mapRef.current as L.DrawMap, {
      allowIntersection: false,
      shapeOptions: { color: '#315b41' },
    }).enable()
  }
  const currentFieldKey = field ? fieldKey(field) : null
  const fieldConfirmed = Boolean(currentFieldKey && confirmedFieldKey === currentFieldKey)
  const loadLiveData = async () => {
    if (!fieldConfirmed) {
      setMessage('Confirm that this boundary represents one farm or managed field before loading.')
      return
    }
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
      const replacedField = Boolean(useAppStore.getState().field)
      if (replacedField) {
        setConfirmedFieldKey(null)
        setField(null)
      }
      mapRef.current?.setView([lat, lon], 13)
      setMessage(
        replacedField
          ? 'Location found. The previous field and results were cleared. Draw the actual field boundary here.'
          : 'Location found. Draw the actual field boundary here.',
      )
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
        const replacedField = Boolean(useAppStore.getState().field)
        if (replacedField) {
          setConfirmedFieldKey(null)
          setField(null)
        }
        mapRef.current?.setView([Number(top.lat), Number(top.lon)], 13)
        setMessage(
          replacedField
            ? 'Location found. The previous field and results were cleared. Draw your field to select it.'
            : 'Location found. Draw your field to select it.',
        )
      } else setMessage('No location found. Try coordinates or a nearby city.')
    } catch {
      if (!controller.signal.aborted)
        setMessage('Search is unavailable. Enter latitude, longitude or use a demo location.')
    } finally {
      if (!controller.signal.aborted) setSearching(false)
    }
  }
  const climateReady = nasaData?.kind === 'live' || nasaData?.kind === 'imported'
  const startedFinding = Boolean(query.trim() || field)
  const scaleWarning = field ? getFieldScaleWarning(field) : null
  return (
    <section id="field-selector" className="panel field-panel" aria-label="Field boundary map">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">START HERE / YOUR LAND</span>
          <h2>
            <MapPin size={18} /> Choose your field
          </h2>
          <p className="field-intro">
            Search anywhere in the world, trace the real boundary, then bring in NASA climate data.
          </p>
        </div>
        <select
          aria-label="Choose a demo location"
          value=""
          onChange={(e) => {
            const loc = DEMO_LOCATIONS[Number(e.target.value)]
            loadDemo(loc.lat, loc.lon, loc.name)
            const demo = useAppStore.getState().field
            setConfirmedFieldKey(demo ? fieldKey(demo) : null)
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
      <div className="field-progress" aria-label="Field setup progress">
        <button
          type="button"
          className={startedFinding ? 'done' : 'active'}
          aria-current={!startedFinding ? 'step' : undefined}
          onClick={() => queryInput.current?.focus()}
        >
          <span className="step-index">{startedFinding ? <Check size={14} /> : '1'}</span>
          <span>
            <strong>Find a place</strong>
            <small>City or coordinates</small>
          </span>
        </button>
        <button
          type="button"
          className={field ? 'done' : startedFinding ? 'active' : ''}
          aria-current={startedFinding && !field ? 'step' : undefined}
          onClick={startDrawing}
        >
          <span className="step-index">{field ? <Check size={14} /> : '2'}</span>
          <span>
            <strong>Draw the boundary</strong>
            <small>
              {field ? `${field.areaHectares.toFixed(2)} hectares selected` : 'Outline the field'}
            </small>
          </span>
        </button>
        <button
          type="button"
          className={climateReady ? 'done' : field ? 'active' : ''}
          aria-current={field && !climateReady ? 'step' : undefined}
          disabled={!field || !fieldConfirmed || loading}
          onClick={() => void loadLiveData()}
        >
          <span className="step-index">{climateReady ? <Check size={14} /> : '3'}</span>
          <span>
            <strong>{loading ? 'Loading NASA data…' : 'Load NASA data'}</strong>
            <small>
              {climateReady
                ? 'Climate is ready'
                : field && !fieldConfirmed
                  ? 'Confirm the farm boundary below'
                  : 'Build the field baseline'}
            </small>
          </span>
        </button>
      </div>
      <div className="map-toolbar">
        <form onSubmit={locate}>
          <Search size={16} />
          <input
            ref={queryInput}
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
      {field && (
        <label className="field-confirmation">
          <input
            type="checkbox"
            checked={fieldConfirmed}
            onChange={(event) =>
              setConfirmedFieldKey(event.target.checked && currentFieldKey ? currentFieldKey : null)
            }
          />
          <span>
            <strong>Confirm farm boundary</strong>
            This polygon represents one farm or managed field—not a city, district or country.
          </span>
        </label>
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
          <button className="btn small" onClick={startDrawing}>
            <Pencil size={14} /> Draw
          </button>
          <button
            className="icon-btn"
            aria-label="Clear field boundary"
            disabled={!field}
            onClick={() => {
              setConfirmedFieldKey(null)
              setField(null)
            }}
          >
            <Trash2 size={16} />
          </button>
          <button
            className="btn primary"
            onClick={() => void loadLiveData()}
            disabled={!field || !fieldConfirmed || loading}
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
      {scaleWarning && (
        <p className="field-scale-warning" role="status">
          {scaleWarning}
        </p>
      )}
      <p className="caption inset">
        The orange marker is the only point sent to NASA POWER. Climate represents its regional 0.5°
        × 0.625° grid cell—not an average across the polygon or a field measurement.
      </p>
    </section>
  )
}

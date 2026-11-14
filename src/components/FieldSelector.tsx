import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import { MapPin, Search, Pencil, Trash2, RefreshCw, Layers, Check, X } from 'lucide-react'
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
  const editHandlerRef = useRef<L.EditToolbar.Edit | null>(null)
  const queryInput = useRef<HTMLInputElement>(null)
  const layers = useRef<{ osm: L.TileLayer; satellite: L.TileLayer } | null>(null)
  const searchController = useRef<AbortController | null>(null)
  const { field, nasaData, loading, setField, fetchData, loadDemo } = useAppStore()
  const [layer, setLayer] = useState<'osm' | 'satellite'>('osm'),
    [tileErrors, setTileErrors] = useState({ osm: false, satellite: false })
  const [query, setQuery] = useState(''),
    [searching, setSearching] = useState(false),
    [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
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
    map.on(L.Draw.Event.CREATED, (e) => updatePolygon((e as unknown as { layer: L.Polygon }).layer))
    map.on(L.Draw.Event.EDITED, (e) =>
      (e as unknown as { layers: L.LayerGroup }).layers.eachLayer((l) =>
        updatePolygon(l as L.Polygon),
      ),
    )
    const resize = new ResizeObserver(() => map.invalidateSize())
    resize.observe(element.current)
    return () => {
      resize.disconnect()
      searchController.current?.abort()
      editHandlerRef.current?.disable()
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
    setMessage('Click around the field edge, then click the first point to finish.')
  }
  const redrawBoundary = () => {
    editHandlerRef.current?.disable()
    editHandlerRef.current = null
    setEditing(false)
    drawnRef.current?.clearLayers()
    centroidRef.current?.remove()
    centroidRef.current = null
    setConfirmedFieldKey(null)
    setField(null)
    startDrawing()
  }
  const startEditing = () => {
    if (!mapRef.current || !drawnRef.current || !field) return
    const handler = new L.EditToolbar.Edit(mapRef.current as L.DrawMap, {
      featureGroup: drawnRef.current,
      poly: { allowIntersection: false },
    })
    editHandlerRef.current = handler
    handler.enable()
    setEditing(true)
    setMessage('Drag the boundary corners, then choose Save boundary.')
  }
  const saveEditing = () => {
    editHandlerRef.current?.save()
    editHandlerRef.current?.disable()
    editHandlerRef.current = null
    setEditing(false)
  }
  const cancelEditing = () => {
    editHandlerRef.current?.revertLayers()
    editHandlerRef.current?.disable()
    editHandlerRef.current = null
    setEditing(false)
    setMessage('Boundary edits cancelled.')
  }
  const clearBoundary = () => {
    editHandlerRef.current?.disable()
    editHandlerRef.current = null
    setEditing(false)
    setConfirmedFieldKey(null)
    setField(null)
    setMessage('Boundary cleared. Find a location and draw one farm field.')
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
      <div className="field-workspace">
        <aside className="field-guide">
          <div className="field-heading">
            <span className="eyebrow">START HERE / YOUR LAND</span>
            <h2>
              <MapPin size={19} /> Choose your field
            </h2>
            <p>Find the farm, trace one field, then load its regional NASA climate.</p>
          </div>

          <ol className="field-steps" aria-label="Field setup progress">
            <li
              className={startedFinding ? 'done' : 'active'}
              aria-current={!startedFinding ? 'step' : undefined}
            >
              <span className="step-index">{startedFinding ? <Check size={14} /> : '1'}</span>
              <span>
                <strong>Find the farm</strong>
                <small>Search, enter coordinates or move the map</small>
              </span>
            </li>
            <li
              className={field ? 'done' : startedFinding ? 'active' : ''}
              aria-current={startedFinding && !field ? 'step' : undefined}
            >
              <span className="step-index">{field ? <Check size={14} /> : '2'}</span>
              <span>
                <strong>Outline one field</strong>
                <small>Click each corner and close the shape</small>
              </span>
            </li>
            <li
              className={climateReady ? 'done' : field ? 'active' : ''}
              aria-current={field && !climateReady ? 'step' : undefined}
            >
              <span className="step-index">{climateReady ? <Check size={14} /> : '3'}</span>
              <span>
                <strong>{climateReady ? 'Climate ready' : 'Confirm and load'}</strong>
                <small>NASA POWER uses the marked centre point</small>
              </span>
            </li>
          </ol>

          <div className="location-tools">
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
                {searching ? 'Finding…' : 'Find'}
              </button>
            </form>
            <label className="demo-picker">
              <span>Or open a labelled example</span>
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
                  Choose an example field…
                </option>
                {DEMO_LOCATIONS.map((l, i) => (
                  <option key={l.name} value={i}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-selection map-footer">
            {field ? (
              <div className="field-stats">
                <span className="selection-label">
                  <Check size={13} /> FIELD SELECTED
                </span>
                <strong>{field.areaHectares.toFixed(2)} ha</strong>
                <span className="muted"> · {field.areaAcres.toFixed(2)} acres</span>
                <div className="caption">
                  {formatCoordinates(field.center.lat, field.center.lng)}
                </div>
              </div>
            ) : (
              <div className="field-empty">
                <strong>No field selected</strong>
                <span>Move to the farm, then start drawing.</span>
              </div>
            )}

            {field && (
              <label className="field-confirmation">
                <input
                  type="checkbox"
                  checked={fieldConfirmed}
                  onChange={(event) =>
                    setConfirmedFieldKey(
                      event.target.checked && currentFieldKey ? currentFieldKey : null,
                    )
                  }
                />
                <span>
                  <strong>This outline is one farm field</strong>
                  Not a city, district, province or country.
                </span>
              </label>
            )}

            <div className="field-actions">
              {editing ? (
                <>
                  <button className="btn primary" onClick={saveEditing}>
                    <Check size={15} /> Save boundary
                  </button>
                  <button className="btn small" onClick={cancelEditing}>
                    <X size={15} /> Cancel
                  </button>
                </>
              ) : field ? (
                <>
                  <div className="boundary-actions">
                    <button className="btn small" onClick={startEditing}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button className="btn small" onClick={redrawBoundary}>
                      Redraw
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Clear field boundary"
                      title="Clear field"
                      onClick={clearBoundary}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <button
                    className="btn primary load-field-data"
                    onClick={() => void loadLiveData()}
                    disabled={!fieldConfirmed || loading}
                  >
                    <RefreshCw size={15} className={loading ? 'spin' : ''} />
                    {loading ? 'Loading data…' : 'Load NASA data'}
                  </button>
                </>
              ) : (
                <button className="btn primary draw-field" onClick={startDrawing}>
                  <Pencil size={15} /> Draw field boundary
                </button>
              )}
            </div>
          </div>

          {message && (
            <p className="field-message" role="status">
              {message}
            </p>
          )}
          {scaleWarning && (
            <p className="field-scale-warning" role="status">
              {scaleWarning}
            </p>
          )}
        </aside>

        <div className="field-map-column">
          <div className="map-titlebar">
            <div>
              <strong>{field ? 'Your field boundary' : 'Interactive field map'}</strong>
              <span>{field ? 'Orange dot = NASA query point' : 'Drag to move · +/− to zoom'}</span>
            </div>
            <div className="segmented" aria-label="Map layer">
              <button aria-pressed={layer === 'osm'} onClick={() => changeLayer('osm')}>
                Map
              </button>
              <button aria-pressed={layer === 'satellite'} onClick={() => changeLayer('satellite')}>
                <Layers size={13} /> NASA satellite
              </button>
            </div>
          </div>
          <div className="map-wrap">
            <div
              ref={element}
              className="field-map"
              aria-label="Interactive map: use drawing tools to select a field"
            />
            {!field && (
              <div className="map-coach">
                <Pencil size={14} />
                <span>
                  Choose <strong>Draw field boundary</strong>, then click each corner of the field.
                </span>
              </div>
            )}
            {tileErrors[layer] && (
              <div className="map-notice" role="status">
                {layer === 'satellite'
                  ? 'NASA satellite tiles are unavailable. Switch to Map; drawing still works.'
                  : 'Map tiles are unavailable. Boundary drawing and calculations still work.'}
              </div>
            )}
          </div>
          {layer === 'satellite' && (
            <p className="satellite-note">
              NASA GIBS · MODIS Terra surface reflectance · 1 May 2024 · regional context only
            </p>
          )}
          <details className="field-explainer">
            <summary>How does the field connect to NASA data?</summary>
            <p>
              The polygon calculates area and its centre. Only the orange centre point is sent to
              NASA POWER, which returns a regional 0.5° × 0.625° climate grid cell—not a field
              sensor or an average of every point inside the boundary.
            </p>
          </details>
        </div>
      </div>
    </section>
  )
}

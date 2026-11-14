import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })

// Leaflet Draw is a legacy plugin that reads `globalThis.L` while its module is evaluated.
// Expose Leaflet before importing the application so production chunk ordering is deterministic.
;(globalThis as typeof globalThis & { L: typeof L }).L = L

const container = document.getElementById('root')
if (!container) throw new Error('SoilSight could not find its application container.')
const root = ReactDOM.createRoot(container)

void import('./App')
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error('SoilSight failed to start:', error)
    root.render(
      <main className="startup-error" role="alert">
        <h1>SoilSight could not start</h1>
        <p>Reload the page. If this continues, the deployment needs to be rebuilt.</p>
        <button className="btn primary" onClick={() => window.location.reload()}>
          Reload SoilSight
        </button>
      </main>,
    )
  })

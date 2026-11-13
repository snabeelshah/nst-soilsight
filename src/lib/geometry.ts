import type { FieldPolygon, LatLng } from '../types'
export function createField(coordinates: LatLng[]): FieldPolygon {
  if (
    coordinates.length < 3 ||
    coordinates.some(
      (p) =>
        !Number.isFinite(p.lat) ||
        !Number.isFinite(p.lng) ||
        Math.abs(p.lat) > 85 ||
        Math.abs(p.lng) > 180,
    )
  )
    throw new Error('Draw at least three valid points between 85°S and 85°N.')
  if (Math.max(...coordinates.map((p) => p.lng)) - Math.min(...coordinates.map((p) => p.lng)) > 180)
    throw new Error(
      'Fields crossing the date line are not supported. Draw within one side of the map.',
    )
  const cross = (a: LatLng, b: LatLng, c: LatLng) =>
    (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng)
  const onSegment = (a: LatLng, b: LatLng, p: LatLng) =>
    Math.abs(cross(a, b, p)) < 1e-14 &&
    p.lng >= Math.min(a.lng, b.lng) &&
    p.lng <= Math.max(a.lng, b.lng) &&
    p.lat >= Math.min(a.lat, b.lat) &&
    p.lat <= Math.max(a.lat, b.lat)
  for (let i = 0; i < coordinates.length; i++) {
    const a = coordinates[i],
      b = coordinates[(i + 1) % coordinates.length]
    if (a.lat === b.lat && a.lng === b.lng)
      throw new Error('Repeated boundary point. Redraw the field.')
    for (let j = i + 2; j < coordinates.length; j++) {
      if (i === 0 && j === coordinates.length - 1) continue
      const c = coordinates[j],
        d = coordinates[(j + 1) % coordinates.length]
      if (
        (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
        onSegment(a, b, c) ||
        onSegment(a, b, d) ||
        onSegment(c, d, a) ||
        onSegment(c, d, b)
      )
        throw new Error('Boundary edges intersect. Draw a simple, non-crossing polygon.')
    }
  }
  const rad = Math.PI / 180
  let spherical = 0,
    twiceArea = 0,
    latSum = 0,
    lngSum = 0
  const origin = coordinates[0]
  for (let i = 0; i < coordinates.length; i++) {
    const a = coordinates[i],
      b = coordinates[(i + 1) % coordinates.length]
    spherical += (b.lng - a.lng) * rad * (2 + Math.sin(a.lat * rad) + Math.sin(b.lat * rad))
    const ax = a.lng - origin.lng,
      ay = a.lat - origin.lat,
      bx = b.lng - origin.lng,
      by = b.lat - origin.lat
    const cross = ax * by - bx * ay
    twiceArea += cross
    lngSum += (ax + bx) * cross
    latSum += (ay + by) * cross
  }
  const areaHectares = Math.abs((spherical * 6371008.8 ** 2) / 2) / 10000
  if (!Number.isFinite(areaHectares) || areaHectares < 0.001 || Math.abs(twiceArea) < 1e-12)
    throw new Error('This boundary has no measurable area. Draw a larger polygon.')
  return {
    coordinates,
    center: {
      lat: origin.lat + latSum / (3 * twiceArea),
      lng: origin.lng + lngSum / (3 * twiceArea),
    },
    areaHectares,
    areaAcres: areaHectares * 2.47105381,
  }
}
export function demoField(lat: number, lon: number) {
  const dLat = 0.0022,
    dLng = dLat / Math.cos((lat * Math.PI) / 180)
  return createField([
    { lat: lat - dLat, lng: lon - dLng },
    { lat: lat - dLat, lng: lon + dLng },
    { lat: lat + dLat, lng: lon + dLng },
    { lat: lat + dLat, lng: lon - dLng },
  ])
}
export const formatCoordinates = (lat: number, lng: number) =>
  `${Math.abs(lat).toFixed(4)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lng).toFixed(4)}°${lng < 0 ? 'W' : 'E'}`

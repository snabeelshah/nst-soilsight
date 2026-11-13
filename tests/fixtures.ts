export function climateResponse() {
  const names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  const values: Record<string, number> = {
    T2M_MIN: 15,
    T2M_MAX: 30,
    T2M: 22,
    PRECTOTCORR: 2,
    GWETROOT: 0.4,
    GWETPROF: 0.5,
  }
  return {
    header: { start: '20010101', end: '20201231', fill_value: -999 },
    parameters: { PRECTOTCORR: { units: 'mm/day' } },
    properties: {
      parameter: Object.fromEntries(
        Object.entries(values).map(([key, v]) => [
          key,
          Object.fromEntries(names.map((m) => [m, v])),
        ]),
      ),
    },
  }
}
export function soilResponse() {
  const values: Record<string, [number, number]> = {
    phh2o: [65, 10],
    soc: [120, 10],
    clay: [250, 10],
    sand: [400, 10],
    silt: [350, 10],
    cec: [150, 10],
    nitrogen: [120, 100],
  }
  return {
    properties: {
      layers: Object.entries(values).map(([name, [mean, d_factor]]) => ({
        name,
        unit_measure: { d_factor },
        depths: ['0-5cm', '5-15cm', '15-30cm'].map((label) => ({ label, values: { mean } })),
      })),
    },
  }
}

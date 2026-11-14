# SoilSight

**Earth data. Farm wisdom.** An explainable farm-planning prototype for the NASA Space Apps challenge. Draw a field, request NASA POWER climate, compare three crop rotations, change priorities, and explore climate sensitivity. Public-data features run in the browser; authenticated Earthdata products use a small server boundary so credentials never enter the browser bundle.

## Run locally

Use Node.js 24 LTS (22.12+ also satisfies the toolchain).

```sh
npm ci
npm run server
```

In a second terminal:

```sh
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

```sh
npm run check       # ESLint, calculation/data tests, TypeScript, production bundle
npm run test:e2e    # Chromium browser journeys; external APIs are mocked
npm run build
npm run preview
```

Playwright uses `/usr/bin/chromium` when available. Otherwise run `npx playwright install --with-deps chromium` first. Tests use a separate Vite server on port 4173; stop another process on that port before testing. GitHub Actions runs the checks and browser tests on every push and pull request.

A static host can still serve the existing public POWER, SoilGrids and map experience from `dist/`. Authenticated SMAP, GPM, SRTM and ECOSTRESS work will require deploying the `server/` routes or equivalent serverless functions. This repository does not include a Gemini integration. Never put Earthdata or Gemini credentials in a `VITE_*` variable: browser bundles expose them.

## NASA Earthdata setup

1. Create a NASA Earthdata Login and generate a bearer token.
2. Copy `.env.example` to `.env` locally.
3. Set `EARTHDATA_TOKEN` in `.env` or in the hosting platform's server-side secret manager.
4. Run `npm run server`, then request `http://127.0.0.1:3001/api/earthdata/status` to confirm configuration.

Do not paste the token into source code, chat, screenshots or GitHub. The initial server route reports only whether a token is configured; GPM and SMAP product adapters are the next implementation step.

## What works

- Leaflet field drawing, rectangle selection, boundary editing/deletion, spherical area and centroid. Changes invalidate old results and abort obsolete requests.
- Location lookup through Nominatim, or offline latitude/longitude positioning. Search moves the map; it never invents a farm boundary.
- NASA POWER climatology: temperature, precipitation, root/profile soil wetness, source links and provenance. Invalid/fill values do not become plausible climate data.
- Latest available NASA POWER daily context: seven- and thirty-day rainfall, daily mean temperature and land-surface wetness. It is explicitly not labelled real-time weather or a forecast.
- Three comparable plans: an editable farmer-entered current rotation, Soil-first and Water-saver. Alternative annual candidates are evaluated over all twelve possible starting months, using seasonal rather than whole-year suitability.
- Six priority sliders, normalized weights, live ranking and visible score contributions. All-zero weights produce an equal-weight comparison.
- A twelve-month climate risk calendar. Thresholds are visible; it does not issue forecasts or flood alerts.
- Monthly irrigation estimates inside the planner. The same calculation drives every displayed water gap and export.
- Climate sensitivity testing of the **same crops and planting windows**, with changed scores and water gaps.
- ISRIC SoilGrids topsoil estimates with a clearly labelled JSON example fallback. Three standard depth layers are combined by thickness; missing values never become zeros.
- A printable, exportable action plan. JSON exports preserve inputs, boundary, priorities, provenance and all three plans.
- A deterministic field advisor explaining current numbers. It is explicitly template-based, not Gemini.
- Real NASA historical records with rainfall/temperature regression and anomaly screening; no fabricated fallback history.
- Urdu navigation, crop names and key crop explanations, RTL layout and device-dependent read-aloud. Detailed technical tables and methods remain English.
- Responsive layouts, keyboard-accessible controls, import validation, error boundaries and explicit service-error states.

## Data honesty

The app opens without a selected field or calculated results. Choosing a demo location is an explicit operation and loads **synthetic demonstration climate**, not NASA observations. Click **Load NASA data** after drawing a field to request real modelled climate for its centre. A failed request never upgrades demo data to live data; existing results keep their provenance label. Editing or clearing the field removes old calculations immediately.

- **Observed:** reserved for documented direct measurements; the app currently makes no field-observation claim.
- **Modelled:** live NASA POWER reanalysis, regional grid data, not a field sensor or weather forecast.
- **Estimated:** SoilGrids, synthetic examples, unverified imports, crop traits, scoring, water calculations, scenarios and plans.

The crop library contains illustrative profiles, **not a verified FAO EcoCrop import**. Market and nitrogen values are prototype assumptions, not local prices, yield predictions or fertiliser prescriptions. Independent crop and cultivar validation is outstanding. See [methodology](docs/METHODOLOGY.md) and the in-app Sources & methods view.

## External services

Allow these HTTPS hosts in the cloud environment’s network settings:

| Purpose                  | Hosts                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------- |
| NASA climate and history | `power.larc.nasa.gov`                                                              |
| Soil estimates           | `rest.isric.org`                                                                   |
| NASA imagery             | `gibs.earthdata.nasa.gov`                                                          |
| Street tiles             | `a.tile.openstreetmap.org`, `b.tile.openstreetmap.org`, `c.tile.openstreetmap.org` |
| Location lookup          | `nominatim.openstreetmap.org`                                                      |
| Dependency installation  | `registry.npmjs.org` and platform package-manager presets                          |

NASA GIBS uses MODIS Terra surface reflectance dated **1 May 2024**, a coarse regional layer overzoomed at field scale. It is not a current vegetation-health diagnosis and is not used to calculate recommendations. Map drawing works when tiles are unavailable. Leaflet marker assets are bundled locally; web fonts are not required.

Public API availability, CORS policy, rate limits and institutional network rules can affect live retrieval. The app reports failures. Browser integration tests use clearly synthetic fixtures to validate client contracts and failure paths; they do **not** prove live provider availability. Live requests in the onboarding environment were blocked by its active destination policy during development. The required domains were saved in the environment draft and require applying in settings.

## Import format

Use the in-app example download for a full JSON template. Supply a JSON object with a `monthly` array (or the array itself), or CSV with these exact columns:

```csv
month,tempMin,tempMax,tempAvg,rainfall
1,8,22,15,35
```

The file must contain exactly **12 distinct months**, 1 through 12. Temperatures are °C; rainfall is **mm per month**. Optional `soilMoistureRoot` and `soilMoistureProf` values are dimensionless 0–1. JSON may include `lat` and `lon`; if present they must match the selected field within 0.01°. Derived totals and ET₀ are recalculated, never trusted from the file. Maximum file size: 1 MB. This normalized format is not the raw NASA CSV format, and imports are labelled as unverified estimates.

## Challenge-resource alignment

The official Field Shift resource list includes NASA POWER, SMAP, GPM IMERG, MODIS, Landsat/HLS, ECOSTRESS, GRACE/GRACE-FO, SRTM and GEDI. SoilSight uses NASA POWER as its core quantitative source and MODIS through NASA GIBS as a contextual map layer. The Sources & methods view identifies every other resource as a future evidence layer; the app never implies that an unimplemented dataset affects a score. SoilGrids and the illustrative crop library are complementary non-NASA inputs.

The comparison includes the farmer's current rotation, as requested by the challenge. The opening current rotation is demo input and must be replaced with the farmer's actual crops and approximate sowing months before interpreting the comparison.

## Challenge demonstration

See [the demo script](docs/DEMO.md) for a concise walkthrough and a submission checklist. No official challenge brief or judging criteria have been independently verified in this environment; confirm the current requirements on the [NASA Space Apps website](https://www.spaceappschallenge.org/).

## Structure

- `src/api/`: provider requests, response validation and labelled demo inputs.
- `src/lib/`: geometry, seasonal crop screening, scores, water balance, risk, history, imports and explanations.
- `src/store/`: field state and abort-safe request lifecycle.
- `src/components/`: responsive dashboard views; larger views are loaded on demand.
- `tests/`: data/calculation regressions and browser journeys.

The prototype is a decision-support conversation starter. Review local planting windows, cultivars, water access and soil tests with an agronomist before acting.

# Methods, assumptions and open validation

## Geography

Spherical area uses radius 6,371,008.8 m and the polygon’s latitude/longitude vertices; acres = hectares × 2.47105381. The centroid is a planar polygon centroid in locally translated coordinates, suitable for small farm boundaries. Very large polygons, concave centroids outside the polygon, poles beyond ±85° and date-line-crossing fields are limitations; date-line crossings and degenerate boundaries are rejected. NASA requests use the centroid rounded to four decimal places. The app does not perform spatial averaging over the polygon or within-field analysis.

## NASA POWER

Climatology requests use `T2M_MIN,T2M_MAX,T2M,PRECTOTCORR,GWETROOT,GWETPROF`, community `AG`. Named monthly keys JAN–DEC and numeric 01–12 are supported. Core climate values must be finite, physically plausible and not fill values. Unavailable wetness is shown as unavailable. Temperature extrema are monthly means of daily extrema, not extremes observed in the month. The response period and retrieval time travel with the dataset.

Recent-context requests use the POWER daily endpoint for `T2M,PRECTOTCORR,GWETROOT,GWETPROF`. SoilSight requests a 45-day window ending two UTC days before retrieval, filters incomplete/fill-value dates, and summarizes the last 7 and up to 30 complete returned days. It requires at least seven complete days. These regional model values provide current context only: they do not replace the climatology in rotation scoring and are not presented as real-time observations or forecasts.

Precipitation rate (mm/day) is multiplied by the standard calendar month's days; February uses 28 for climatology. Annual mean temperature is day-weighted. Wetness indices are dimensionless, not measured volumetric water content. Meteorological grid resolution is approximately 0.5° latitude × 0.625° longitude, far coarser than an individual field.

History comes from the **monthly** endpoint, not a nonexistent annual temporal endpoint. Monthly rates are integrated using actual calendar days, including leap years. All months must exist for each selected year. Fifteen complete years ending at current year − 2 provide publication lag. Missing records stop the analysis. Centred ordinary least squares gives rainfall and temperature slopes; rainfall anomalies are values outside ±1.5 population standard deviations of the displayed period mean. These are descriptive results, with no significance or attribution claim.

## Water estimates

FAO-56 Hargreaves:

`ET₀(day) = 0.0023 × 0.408 × Ra(MJ/m²/day) × (Tmean + 17.8) × sqrt(Tmax − Tmin)`

The 0.408 factor converts radiation to equivalent water depth. Extraterrestrial radiation is computed from latitude and mid-month day of year; polar sunrise/sunset arguments are clamped. Negative ET₀ is clamped to zero, and daily ET₀ is multiplied by month length.

`Crop need = ET₀ × approximate Kc × stage factor`

Illustrative mid-season Kc values are in `irrigationPlanner.ts`; first/last planted months use factors 0.55/0.75. They are simplified coefficients, not validated cultivar-specific growth curves. Effective rainfall is assumed to be 80% of rainfall in every region. Net gap = max(0, crop need − effective rain), calculated **per month** and then summed. Surplus is not banked across months. Unplanted months have zero crop irrigation demand. Volume = net gap (mm) × area (ha) × 10 m³. Soil storage, irrigation efficiency, runoff, paddy percolation and salinity are not represented, so the output is not a watering schedule or a gross withdrawal estimate.

## Crop screening and rotation assembly

The existing prototype crop library is retained as illustrative data. It is not a verified EcoCrop dataset. Regional season labels and climate-zone names are not used to select dates. Perennials and fallow are excluded from annual rotations.

For each annual crop, duration = ceil(mean growing days / 30.4), in whole months. Evaluate all 12 start months and allow year wrapping. Temperature fit is evaluated in each occupied month: outside absolute mean-temperature limits scores zero; otherwise distance from the optimal interval costs 6 points/°C and mean-daily-extreme violations cost 7 points/°C. Values are clamped to 0–100 and averaged across the season.

Rainfall adequacy = 100 × (1 − seasonal net gap / seasonal crop water need), clamped. Soil fit is a pH-range heuristic (35 points per pH unit outside the range); without actual SoilGrids retrieval, a neutral 60/100 is used. Suitability = 60% temperature + 25% rainfall adequacy + 15% soil. Candidates require temperature fit ≥55 and suitability ≥45. Irrigation-dependent crops can still qualify, and their water gaps remain explicit.

The three comparison plans are:

- Farmer's current rotation: entered crops and sowing months are evaluated as-is, without optimizing the sequence.
- Soil-first: 55% suitability + 25 points for N-fixing crops + 20% organic-matter trait.
- Water-saver: 50% suitability + 20% drought-tolerance trait + 30% inverse per-month irrigation gap.

Each generated alternative selects at most three crops, without overlapping calendar months or repeated crop families. The current rotation may reveal overlaps because it represents farmer input rather than an optimized plan. The alternatives are not a global optimization and do not model transition days, labour constraints, cultivar availability or multi-year disease cycles. Plans can converge. Sites with no feasible generated candidate yield empty alternatives with zero scores rather than an invented recommendation.

## Scoring

Trait averages are weighted by each crop's seasonal suitability. Soil health combines organic-matter and legume traits; nitrogen criterion is the suitability-weighted legume share; market potential uses an illustrative index. Erosion control combines cover traits with the fraction of months planted. Water conservation penalizes average monthly irrigation gap and is scaled by average suitability. Risk diversity is 75% average suitability plus 25% crop-family diversity (up to three families).

Farmer weights are clamped to 0–100 and normalized. All zero produces equal weights. The displayed overall score is the actual weighted sum used to sort plans; the interface shows each contribution. Scores are estimated comparison indices, not success probabilities, guaranteed savings or income forecasts. Nitrogen figures from the prototype library are not turned into fertiliser rates.

## Climate stress

Add the same temperature delta to all monthly temperatures; multiply rain by `1 + percentage/100`; recompute ET₀, suitability, gaps and scores. Keep the **same crops and dates**, the same soil and the same priorities. This is a sensitivity experiment, not a forecast or an IPCC scenario; no future time horizon, CO₂ effect or change in extremes is simulated.

## Soil and risk

SoilGrids queries repeat the `property` and `depth` parameters for the standard 0–5, 5–15 and 15–30 cm layers. A thickness-weighted mean is converted with the API's unit conversion factors. Texture g/kg is converted to percent; pH/10, SOC/10 (g/kg), CEC/10 (cmol(c)/kg), nitrogen/100 (g/kg). Missing values are rejected. The fallback is a bundled example JSON, not a guessed soil profile at the selected coordinates. SoilGrids is provided by ISRIC, not NASA.

Risk thresholds are explicit in the app and code. They screen cold, heat, rainfall deficit and excess precipitation. A low signal does not establish safety; monthly averages hide extremes. Monthly precipitation cannot predict flooding or establish soil field capacity. These outputs are planning attention levels, not alerts.

## Validation still needed

- Field and cultivar-specific crop ranges, validated market indices and management constraints.
- Validation against measured ET₀, local effective rain and soil water balance.
- Live provider contract checks after network access is enabled; current integration fixtures are synthetic.
- Official challenge brief and data-resource alignment.
- Urdu terminology review and voice testing on the actual presentation device.

## Authoritative references

- [NASA POWER API](https://power.larc.nasa.gov/docs/services/api/)
- [NASA GIBS API](https://nasa-gibs.github.io/gibs-api-docs/)
- [ISRIC SoilGrids](https://docs.isric.org/globaldata/soilgrids/)
- [FAO Irrigation and Drainage Paper 56](https://www.fao.org/4/x0490e/x0490e00.htm)
- [FAO EcoCrop context](https://gaez.fao.org/pages/ecocrop)

These references explain the underlying data and concepts. They do not certify this prototype’s curated crop entries or heuristic scoring.

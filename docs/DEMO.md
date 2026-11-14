# A three-minute SoilSight demo

1. **The field (30 seconds).** Explain that the opening workspace is clearly labelled synthetic. Draw or edit a field, show the calculated hectares and centre, then load NASA climate. If the service is unavailable, explicitly use a demo and keep its estimated label visible. Do not present synthetic data as NASA observations.
2. **The evidence (30 seconds).** Open NASA climate and point to monthly temperature, rainfall and soil wetness, the source link and the coarse grid resolution. Open the risk calendar and explain that it identifies seasonal planning windows, not forecasts.
3. **The decision (60 seconds).** Open the crop planner. Replace the labelled demo current rotation with the farmer's crops and sowing months. Compare Current rotation, Soil-first and Water-saver, then change priorities. Expand “Why this score?” to show normalized weights and contributions. Compare planting windows and monthly irrigation gaps. Call out the unvalidated crop traits and local knowledge gaps.
4. **The stress test (30 seconds).** Raise temperature and reduce rainfall. Show that the same crops and dates are being compared, while gaps, scores and ranking can change. These are hypothetical changes, not a climate projection.
5. **The next step (30 seconds).** Open the action plan, export its provenance-bearing JSON, and use the field advisor to explain the water gap. Finish on the expert-review banner: local agronomy and soil testing remain essential.

## Before presenting

- Read the official challenge brief and verify that the chosen NASA resources meet its requirements.
- Test live NASA POWER, ISRIC, OpenStreetMap and NASA GIBS access on the presentation network.
- Keep the labelled demo available for a network outage.
- Review crop assumptions with someone familiar with the demo region.
- Test Urdu layout, terminology and device voices if using them. Technical methods are still in English.
- Check desktop and phone layouts; run `npm run check` and `npm run test:e2e`.
- Deploy the static `dist/` build to your chosen host and test that actual deployed build before sharing a public link.
- Add team members, project video and the final official challenge link to the submission. This repository does not claim an official NASA endorsement.

## Honest stretch-feature positioning

The current advisor is deterministic and grounded in in-memory values. Gemini remains optional and would require a server endpoint, secure secret storage, grounding checks and explicit failure behavior. It is not implemented as a fake AI feature. Historical trends compute from actual returned NASA records and remain unavailable when records cannot be fetched.

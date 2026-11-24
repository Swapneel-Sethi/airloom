# Competitive gap analysis

Airloom versus typical consumer air quality apps (dashboard-first AQI apps, weather-with-AQI tabs, purifier companion apps).

## Typical competitor approach

- One number: current AQI for the city or nearest station.
- Color-coded health advisory printed for a whole city.
- Generic guidance: "stay indoors", "wear a mask".
- No household context, no hour-by-hour decision, no trade-offs.
- Often no stated data source; live vs cached not distinguished.
- Charts are decorative; recommendations don't cite data.

## Airloom differentiation

| Dimension | Typical competitor | Airloom |
|---|---|---|
| Core unit | AQI number | Six-block daily plan with actions |
| Context | City-wide | Household, commute, indoor setup |
| Timing | Current reading only | Hourly forecast, two-hour low/high windows |
| Decision support | Generic advisory | Specific: move run to 17:00, take metro, keep windows closed |
| Provenance | Often unstated | live / cached / demo label on every reading |
| Transparency | Black-box advice | Every recommendation shows why, data used, basis |
| AI | Generative chat with invented numbers | Grounded copilot with Zod schema + deterministic fallback |
| Exposure | AQI as health proxy | Exposure proxy (PM2.5 × hours × mode), labeled as planning estimate |
| Emissions | Not addressed | Per-mode CO2 estimates with stated factors |
| Indoor | Not addressed | Infiltration estimate + ventilation windows |

## Gap Airloom closes

Most apps tell you the air is bad. Airloom tells you what to do about it today, when to do it, why, and how confident to be. It exposes its calculations instead of hiding them behind a single index, and it never presents seeded data as live.

## Limitations (stated)

- City-grid model, not doorstep air; street-level differences inside a city can be large.
- Exposure proxy is not inhaled dose and not a health risk estimate.
- Forecast beyond 24 hours carries more uncertainty; each block shows confidence.
- Indoor estimate is a model, not a sensor reading.

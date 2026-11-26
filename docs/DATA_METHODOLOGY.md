# Data methodology

Airloom's data sources, calculations, and stated limits.

## Sources

- Open-Meteo air quality API: `https://air-quality-api.open-meteo.com/v1/air-quality` - hourly PM2.5, PM10, NO2, SO2, O3, CO, AQI (CAMS model) for a coordinate.
- Open-Meteo forecast API: `https://api.open-meteo.com/v1/forecast` - temperature, humidity, wind speed, precipitation probability, weather code.
- Open-Meteo geocoding API: `https://geocoding-api.open-meteo.com/v1/search` - city search and reverse geocode.

All endpoints are public; no API key required. Data is fetched server-side in API routes and never exposed to the browser as raw credentials.

## AQI

Computed only from PM2.5 and PM10 using US EPA breakpoints, interpolated per pollutant, dominant sub index becomes the AQI.

**PM2.5 breakpoints (US EPA, revised February 2024):** 0-9.0 → 0-50, 9.1-35.4 → 51-100, 35.5-55.4 → 101-150, 55.5-125.4 → 151-200, 125.5-225.4 → 201-300, 225.5-325.4 → 301-500. Source: US EPA AQS AQI Breakpoints (aqs.epa.gov), 2024 revision aligned with the tightened PM2.5 annual NAAQS.

**PM10 breakpoints (unchanged):** 0-54 → 0-50, 55-154 → 51-100, 155-254 → 101-150, 255-354 → 151-200, 355-424 → 201-300, 425-604 → 301-500.

Categories: good ≤50, moderate 51-100, elevated 101-150, high 151-200, very-high 201-300, severe 301-500.

**Important:** The AQI is computed from hourly model concentrations, not from official 24-hour station averages. The result is a planning estimate, not a regulatory AQI measurement. The UI labels hourly AQI as a "planning estimate" wherever it appears.

NO2, SO2, O3, CO are shown against WHO 2021 guideline values as multiples of guideline, not folded into AQI.

## Exposure proxy

Exposure proxy = PM2.5 × hours × mode factor, units µg/m³·h. A planning estimate for comparing timing and mode, not inhaled dose and not a health risk estimate. Commute mode factors: walk 1.0, cycle 1.25, transit 0.65, two-wheeler 1.1, car 0.45, remote 0.08.

## Emission factors

Per passenger km: car 0.17 kg CO2/km, transit 0.103, two-wheeler 0.085, walk/cycle/remote 0. Stated as planning values, not life-cycle audit.

## Indoor model

Indoor PM2.5 = outdoor PM2.5 × infiltration factor. Base factor 0.62; natural ventilation 0.8; mechanical 0.45; purifier multiplies by 0.38. Cooking bump: daily +18, sometimes +9, rarely +3 µg/m³. Ventilation window = best two-hour window below 30 µg/m³. A planning model, not a sensor reading.

## Demo data

Five seeded cities (Delhi, Mumbai, Bengaluru, Kolkata, Lucknow) built from a fixed diurnal PM2.5 curve. Labelled "Demo scenario" wherever shown. Never mixed with live data. Default profile is Delhi demo so `/dashboard` looks complete immediately.

## Caching and staleness

`/api/environment` returns `cache-control: no-store` for live/demo. `/api/locations` is cached `public, s-maxage=86400`. On provider failure, the client keeps the last reading and labels it cached with freshness in minutes. Stale fallback is shown, never invented.

## Limits stated in-app

- City-grid model, not doorstep air; street-level differences inside a city can be large.
- Exposure proxy is concentration × time; not inhaled dose, not a health risk estimate.
- Forecast beyond 24 hours carries more uncertainty; each block shows confidence.
- Indoor estimate depends on building age, gaps, cooking, occupancy; a low-cost indoor sensor is the only way to measure it.
- AQI uses hourly model concentrations, not a 24-hour station average.

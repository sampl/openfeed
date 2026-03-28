# open-meteo plugin

Fetches current weather and hourly forecast data from the [Open-Meteo API](https://open-meteo.com).

## Supported URLs

Any URL beginning with `api.open-meteo.com`. Build a URL at https://open-meteo.com/en/docs with the parameters you need, including `latitude`, `longitude`, `current_weather=true`, and `hourly` fields.

## Options

Any key/value pair in the source `options` object is appended to the API URL as a query parameter. This lets you pass any Open-Meteo parameter without modifying the base URL.

Common options:

| Option | Values | Description |
|--------|--------|-------------|
| `temperature_unit` | `fahrenheit` | Returns temperatures in °F instead of °C |
| `wind_speed_unit` | `mph`, `kn` | Changes wind speed units (default: `km/h`) |
| `precipitation_unit` | `inch` | Changes precipitation units (default: `mm`) |

## Example config

```yaml
- name: Brooklyn Weather
  url: https://api.open-meteo.com/v1/forecast?latitude=40.6782&longitude=-73.9442&current_weather=true&hourly=temperature_2m,precipitation_probability
  maxItems: 1
  expirationDays: 1
  options:
    temperature_unit: fahrenheit
    wind_speed_unit: mph
```

## Render output

Produces a single `richText` item per fetch with a summary like:

> Currently 72°F, Partly cloudy. Wind: 12 mph. High: 80°F, Low: 65°F. Precipitation probability (next 6h): 20%.

The item URL includes a date stamp so each day's fetch produces a unique item. Combined with `expirationDays: 1`, yesterday's weather is automatically expired on the next fetch.

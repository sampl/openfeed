import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";

interface CurrentWeather {
  temperature_2m: number;
  wind_speed_10m: number;
  weather_code: number;
  time: string;
}

interface HourlyData {
  time: string[];
  temperature_2m: number[];
  precipitation_probability: number[];
}

interface OpenMeteoResponse {
  current: CurrentWeather;
  hourly: HourlyData;
}

const WMO_CODE_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Drizzle", 53: "Drizzle", 55: "Drizzle",
  61: "Rain", 63: "Rain", 65: "Rain",
  71: "Snow", 73: "Snow", 75: "Snow",
  80: "Rain showers", 81: "Rain showers", 82: "Rain showers",
  95: "Thunderstorm",
};

const describeWeatherCode = (code: number): string =>
  WMO_CODE_DESCRIPTIONS[code] ?? `Weather code ${code}`;

const deriveLocationName = (sourceUrl: string): string => {
  try {
    const params = new URL(sourceUrl).searchParams;
    const lat = parseFloat(params.get("latitude") ?? "");
    const lon = parseFloat(params.get("longitude") ?? "");
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat - 40.67) < 0.1 && Math.abs(lon - -73.94) < 0.1) {
      return "Brooklyn Weather";
    }
  } catch {
    // Malformed URL
  }
  return "Current Weather";
};

const applyOptions = (url: string, options?: Record<string, unknown>): string => {
  if (!options || Object.keys(options).length === 0) return url;
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(options)) {
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
};

const isFahrenheit = (fetchUrl: string): boolean =>
  new URL(fetchUrl).searchParams.get("temperature_unit") === "fahrenheit";

const buildSummary = (data: OpenMeteoResponse, fahrenheit: boolean): string => {
  const { temperature_2m, wind_speed_10m, weather_code } = data.current;
  const description = describeWeatherCode(weather_code);
  const tempUnit = fahrenheit ? "°F" : "°C";
  const windUnit = fahrenheit ? "mph" : "km/h";

  const dayTemps = (data.hourly?.temperature_2m ?? []).slice(0, 24).filter((t) => typeof t === "number");
  const high = dayTemps.length > 0 ? Math.max(...dayTemps) : null;
  const low = dayTemps.length > 0 ? Math.min(...dayTemps) : null;
  const next6HourPrecip = (data.hourly?.precipitation_probability ?? []).slice(0, 6).filter((p) => typeof p === "number");
  const maxPrecipChance = next6HourPrecip.length > 0 ? Math.max(...next6HourPrecip) : null;

  let text = `Currently ${temperature_2m}${tempUnit}, ${description}. Wind: ${wind_speed_10m} ${windUnit}.`;
  if (high !== null && low !== null) text += ` High: ${high}${tempUnit}, Low: ${low}${tempUnit}.`;
  if (maxPrecipChance !== null) text += ` Precipitation probability (next 6h): ${maxPrecipChance}%.`;

  return text;
};

const openMeteoPlugin: BackendFeedPlugin = {
  name: "open-meteo",

  canHandle: (sourceUrl) => sourceUrl.includes("api.open-meteo.com"),

  listItems: async (sourceUrl, fetchFn, _context, options): Promise<readonly PluginAS2Object[]> => {
    const fetchUrl = applyOptions(sourceUrl, options);
    const response = await fetchFn(fetchUrl);
    const data = (await response.json()) as OpenMeteoResponse;

    const fahrenheit = isFahrenheit(fetchUrl);
    const summary = buildSummary(data, fahrenheit);
    const _locationName = deriveLocationName(sourceUrl);
    const dateStamp = new Date().toISOString().slice(0, 10);

    return [{
      type: "Note",
      // Notes omit name — content is the weather summary
      content: summary,
      mediaType: "text/plain",
      url: `${sourceUrl}#${dateStamp}`,
      published: new Date(),
    }];
  },
};

export default openMeteoPlugin;

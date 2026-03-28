import { readFileSync } from "fs";
import yaml from "js-yaml";
import type { TimeLimitEntry } from "../connectors/types.js";

export type FetchMode = "append" | "replace";

// TimeLimitConfig is the same shape as the shared TimeLimitEntry.
export type TimeLimitConfig = TimeLimitEntry;

export interface SourceConfig {
  readonly name: string;
  readonly url: string;
  readonly fetchMode?: FetchMode;
  readonly plugin?: string;
  readonly options?: Record<string, unknown>;
  readonly maxItems?: number;
  readonly maxAgeDays?: number;
  readonly expirationDays?: number;
}

export interface FeedConfig {
  readonly name: string;
  readonly sources: readonly SourceConfig[];
  readonly timeLimit?: TimeLimitConfig;
  readonly maxItems?: number;
  readonly maxAgeDays?: number;
  // Optional cron expression to override the global schedule for this feed only
  readonly schedule?: string;
  readonly expirationDays?: number;
}

export interface UserConfig {
  readonly port: number;
  readonly schedule: string;
  readonly feeds: readonly FeedConfig[];
  readonly timeLimit?: TimeLimitConfig;
  readonly maxItems?: number;
  readonly maxAgeDays?: number;
  readonly expirationDays?: number;
}

export const loadConfig = (configPath: string): UserConfig => {
  let raw: string;
  try {
    raw = readFileSync(configPath, "utf-8");
  } catch (error) {
    throw new Error(`[openfeed] Could not read config file at "${configPath}": ${String(error)}`);
  }

  const parsed = yaml.load(raw) as Record<string, unknown>;

  if (parsed == null || typeof parsed !== "object") {
    throw new Error(`[openfeed] Config file "${configPath}" must be a YAML object`);
  }

  if (!Array.isArray(parsed.feeds) || parsed.feeds.length === 0) {
    throw new Error(`[openfeed] Config must include a non-empty "feeds" array`);
  }

  const parseSource = (source: unknown, index: number, feedIndex: number): SourceConfig => {
    if (source == null || typeof source !== "object") {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}] must be an object`);
    }
    const s = source as Record<string, unknown>;
    if (typeof s.name !== "string" || s.name.trim() === "") {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}] must have a non-empty "name" string`);
    }
    if (typeof s.url !== "string" || s.url.trim() === "") {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}] must have a non-empty "url" string`);
    }
    if (s.fetchMode !== undefined && s.fetchMode !== "append" && s.fetchMode !== "replace") {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}].fetchMode must be "append" or "replace"`);
    }
    if (s.plugin !== undefined && typeof s.plugin !== "string") {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}].plugin must be a string`);
    }
    if (s.maxItems !== undefined && (typeof s.maxItems !== "number" || s.maxItems < 1)) {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}].maxItems must be a positive number`);
    }
    if (s.maxAgeDays !== undefined && (typeof s.maxAgeDays !== "number" || s.maxAgeDays < 1)) {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}].maxAgeDays must be a positive number`);
    }
    if (s.expirationDays !== undefined && (typeof s.expirationDays !== "number" || s.expirationDays <= 0)) {
      throw new Error(`[openfeed] feeds[${feedIndex}].sources[${index}].expirationDays must be a positive number`);
    }
    return {
      name: s.name,
      url: s.url,
      fetchMode: s.fetchMode as FetchMode | undefined,
      plugin: typeof s.plugin === "string" ? s.plugin : undefined,
      options: (s.options != null && typeof s.options === "object") ? s.options as Record<string, unknown> : undefined,
      maxItems: typeof s.maxItems === "number" ? Math.floor(s.maxItems) : undefined,
      maxAgeDays: typeof s.maxAgeDays === "number" ? Math.floor(s.maxAgeDays) : undefined,
      expirationDays: typeof s.expirationDays === "number" ? s.expirationDays : undefined,
    };
  };

  const parseTimeLimit = (raw: unknown): TimeLimitConfig | undefined => {
    if (raw == null) return undefined;
    if (typeof raw !== "object") return undefined;
    const t = raw as Record<string, unknown>;
    const daily = typeof t.daily === "number" && t.daily >= 1 ? t.daily : undefined;
    const weekly = typeof t.weekly === "number" && t.weekly >= 1 ? t.weekly : undefined;
    return (daily != null || weekly != null) ? { daily, weekly } : undefined;
  };

  const feeds: FeedConfig[] = parsed.feeds.map((feed: unknown, feedIndex: number) => {
    if (feed == null || typeof feed !== "object") {
      throw new Error(`[openfeed] feeds[${feedIndex}] must be an object`);
    }
    const f = feed as Record<string, unknown>;
    if (typeof f.name !== "string" || f.name.trim() === "") {
      throw new Error(`[openfeed] feeds[${feedIndex}] must have a non-empty "name" string`);
    }
    if (!Array.isArray(f.sources)) {
      throw new Error(`[openfeed] feeds[${feedIndex}] must have a "sources" array`);
    }
    const feedMaxItems = typeof f.maxItems === "number" && f.maxItems >= 1 ? Math.floor(f.maxItems) : undefined;
    const feedMaxAgeDays = typeof f.maxAgeDays === "number" && f.maxAgeDays >= 1 ? Math.floor(f.maxAgeDays) : undefined;
    const feedExpirationDays = typeof f.expirationDays === "number" && f.expirationDays > 0
      ? f.expirationDays
      : undefined;
    return {
      name: f.name,
      sources: f.sources.map((s: unknown, i: number) => parseSource(s, i, feedIndex)),
      timeLimit: parseTimeLimit(f.timeLimit),
      maxItems: feedMaxItems,
      maxAgeDays: feedMaxAgeDays,
      schedule: typeof f.schedule === "string" && f.schedule.trim() !== "" ? f.schedule : undefined,
      expirationDays: feedExpirationDays,
    };
  });

  const port =
    typeof parsed.port === "number" ? parsed.port : 3000;

  const schedule =
    typeof parsed.schedule === "string" && parsed.schedule.trim() !== ""
      ? parsed.schedule
      : "0 7 * * *";

  const timeLimit = parseTimeLimit(parsed.timeLimit);

  const globalMaxItems = typeof parsed.maxItems === "number" && parsed.maxItems >= 1 ? Math.floor(parsed.maxItems) : undefined;
  const globalMaxAgeDays = typeof parsed.maxAgeDays === "number" && parsed.maxAgeDays >= 1 ? Math.floor(parsed.maxAgeDays) : undefined;

  const expirationDays = typeof parsed.expirationDays === "number" && parsed.expirationDays > 0
    ? parsed.expirationDays
    : undefined;

  return { port, schedule, feeds, timeLimit, maxItems: globalMaxItems, maxAgeDays: globalMaxAgeDays, expirationDays };
};

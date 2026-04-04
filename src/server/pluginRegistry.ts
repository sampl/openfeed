import youtubeRss from "../connectors/youtube/index.js";
import buttondown from "../connectors/buttondown/index.js";
import substackRss from "../connectors/substack/index.js";
import reddit from "../connectors/reddit/index.js";
import rss from "../connectors/rss/index.js";
import instagramFirecrawl from "../connectors/instagram/index.js";
import openMeteo from "../connectors/open-meteo/index.js";
import hackerNews from "../connectors/hacker-news/index.js";
import devTo from "../connectors/dev-to/index.js";
import bluesky from "../connectors/bluesky/index.js";
import cnn from "../connectors/cnn/index.js";
import washingtonPost from "../connectors/washington-post/index.js";
import wallStreetJournal from "../connectors/wall-street-journal/index.js";
import politico from "../connectors/politico/index.js";
import associatedPress from "../connectors/associated-press/index.js";
import reuters from "../connectors/reuters/index.js";
import alJazeera from "../connectors/al-jazeera/index.js";
import theNewYorker from "../connectors/new-yorker/index.js";
import espn from "../connectors/espn/index.js";
import medium from "../connectors/medium/index.js";
import centcom from "../connectors/centcom/index.js";
import podcasts from "../connectors/podcasts/index.js";
import nytCrossword from "../connectors/nyt-crossword/index.js";
import googleCalendar from "../connectors/google-calendar/index.js";
import gmail from "../connectors/gmail/index.js";
import wordle from "../connectors/wordle/index.js";
import tiktok from "../connectors/tiktok/index.js";
import github from "../connectors/github/index.js";
import defaultPlugin from "../connectors/default/index.js";
import type { BackendFeedPlugin } from "../connectors/types.js";
import { readdirSync, statSync } from "fs";
import path from "path";

// Plugins are checked in order — the first plugin whose canHandle() returns true wins.
// ORDER IS SIGNIFICANT: more specific matchers must precede broader/generic ones.
//   • Platform plugins (youtube, reddit, …) must precede the generic `rss` parser.
//   • Within nytimes.com, `wordle` must precede `nyt-crossword` (both match the domain).
//   • `rss` must precede `default` — it catches any valid RSS/Atom feed URL.
//   • `default` always matches and must be last; it acts as the 404-fallback.
const BUILTIN_PLUGINS: readonly BackendFeedPlugin[] = [
  // --- Platform / service-specific plugins ---
  youtubeRss,
  buttondown,
  substackRss,
  reddit,
  instagramFirecrawl,
  openMeteo,
  hackerNews,
  devTo,
  bluesky,
  tiktok,
  github,
  googleCalendar,
  gmail,

  // --- Specific news-site plugins (before the generic RSS parser) ---
  cnn,
  washingtonPost,
  wallStreetJournal,
  politico,
  associatedPress,
  reuters,
  alJazeera,
  theNewYorker,
  espn,
  medium,
  centcom,
  podcasts,

  // --- nytimes.com (wordle first — both plugins match the same domain) ---
  wordle,
  nytCrossword,

  // --- Generic fallbacks (most specific first) ---
  rss,           // handles any valid RSS/Atom feed URL
  defaultPlugin, // always matches; signals the source cannot be handled
];

// Mutable registry — external connectors are prepended before built-ins at startup.
let registry: BackendFeedPlugin[] = [...BUILTIN_PLUGINS];

/**
 * Validates that a dynamically loaded module default export looks like a BackendFeedPlugin.
 */
const isValidPlugin = (value: unknown): value is BackendFeedPlugin =>
  value != null &&
  typeof value === "object" &&
  typeof (value as Record<string, unknown>).name === "string" &&
  typeof (value as Record<string, unknown>).canHandle === "function" &&
  typeof (value as Record<string, unknown>).listItems === "function";

/**
 * Dynamically imports a single connector from an npm package name or a file path.
 * File paths starting with "." or "/" are resolved relative to `baseDir`.
 */
const importConnector = async (specifier: string, baseDir: string): Promise<BackendFeedPlugin> => {
  const isFilePath = specifier.startsWith(".") || specifier.startsWith("/");
  const resolved = isFilePath ? path.resolve(baseDir, specifier) : specifier;

  let mod: unknown;
  try {
    mod = await import(resolved);
  } catch (err) {
    throw new Error(
      `[openfeed] Failed to load connector "${specifier}": ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const plugin = (mod as Record<string, unknown>).default;
  if (!isValidPlugin(plugin)) {
    throw new Error(
      `[openfeed] Connector "${specifier}" does not export a valid BackendFeedPlugin as its default export. ` +
        `Expected an object with name (string), canHandle (function), and listItems (function).`
    );
  }
  return plugin;
};

/**
 * Loads external connectors from npm package names / file paths and/or a directory,
 * then prepends them to the registry so they take priority over built-ins.
 *
 * Call this once at startup before starting the server or running a fetch.
 *
 * @param connectors - npm package names or relative/absolute JS file paths.
 * @param connectorsDir - Directory to auto-scan for connector modules.
 * @param baseDir - Base directory for resolving relative paths (typically the config file's directory).
 */
export const loadExternalConnectors = async (
  connectors: readonly string[] = [],
  connectorsDir: string | undefined,
  baseDir: string,
): Promise<void> => {
  const external: BackendFeedPlugin[] = [];

  // 1. Explicitly listed connectors (npm packages or file paths)
  for (const specifier of connectors) {
    const plugin = await importConnector(specifier, baseDir);
    external.push(plugin);
    console.log(`[openfeed] Loaded external connector: ${plugin.name} (from "${specifier}")`);
  }

  // 2. Auto-scan connectorsDir for *.js / *.mjs files and */index.js subdirectories
  if (connectorsDir != null) {
    const dir = path.resolve(baseDir, connectorsDir);
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      throw new Error(`[openfeed] connectorsDir "${connectorsDir}" could not be read (resolved to "${dir}")`);
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      const stat = statSync(entryPath);

      let filePath: string | null = null;
      if (stat.isDirectory()) {
        const indexPath = path.join(entryPath, "index.js");
        try { statSync(indexPath); filePath = indexPath; } catch { /* no index.js */ }
      } else if (entry.endsWith(".js") || entry.endsWith(".mjs")) {
        filePath = entryPath;
      }

      if (filePath == null) continue;

      const plugin = await importConnector(filePath, baseDir);
      external.push(plugin);
      console.log(`[openfeed] Loaded connector from directory: ${plugin.name} (from "${filePath}")`);
    }
  }

  if (external.length === 0) return;

  // Prepend external connectors before built-ins (excluding the default fallback),
  // then append built-ins with the default fallback last.
  const builtinsWithoutDefault = BUILTIN_PLUGINS.filter((p) => p.name !== "default");
  registry = [...external, ...builtinsWithoutDefault, defaultPlugin];
};

/**
 * Returns the plugin that should handle `sourceUrl`.
 * If `connectorName` is provided (from the user's YAML config) the named connector is used directly;
 * otherwise the first plugin in the registry whose canHandle() returns true is used.
 */
export const resolvePlugin = (sourceUrl: string, connectorName?: string): BackendFeedPlugin => {
  if (connectorName != null) {
    const forced = registry.find((p) => p.name === connectorName);
    if (forced == null) {
      const available = registry.map((p) => p.name).join(", ");
      throw new Error(`Unknown connector: "${connectorName}". Available connectors: ${available}`);
    }
    return forced;
  }
  return registry.find((plugin) => plugin.canHandle(sourceUrl)) ?? defaultPlugin;
};

/** Returns all currently registered connectors (built-in + external). */
export const listConnectors = (): readonly BackendFeedPlugin[] => registry;

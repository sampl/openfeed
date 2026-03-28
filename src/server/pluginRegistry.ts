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

// Plugins are checked in order — the first plugin whose canHandle() returns true wins.
// ORDER IS SIGNIFICANT: more specific matchers must precede broader/generic ones.
//   • Platform plugins (youtube, reddit, …) must precede the generic `rss` parser.
//   • Within nytimes.com, `wordle` must precede `nyt-crossword` (both match the domain).
//   • `rss` must precede `default` — it catches any valid RSS/Atom feed URL.
//   • `default` always matches and must be last; it acts as the 404-fallback.
const PLUGINS: readonly BackendFeedPlugin[] = [
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

/**
 * Returns the plugin that should handle `sourceUrl`.
 * If `pluginName` is provided (from the user's YAML config) the named plugin is used directly;
 * otherwise the first plugin in PLUGINS whose canHandle() returns true is used.
 */
export const resolvePlugin = (sourceUrl: string, pluginName?: string): BackendFeedPlugin => {
  if (pluginName != null) {
    const forced = PLUGINS.find((p) => p.name === pluginName);
    if (forced == null) throw new Error(`Unknown plugin: "${pluginName}"`);
    return forced;
  }
  return PLUGINS.find((plugin) => plugin.canHandle(sourceUrl)) ?? defaultPlugin;
};

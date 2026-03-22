import youtubeRss from "../plugins/youtube-rss/index.js";
import buttondown from "../plugins/buttondown/index.js";
import substackRss from "../plugins/substack-rss/index.js";
import reddit from "../plugins/reddit/index.js";
import rss from "../plugins/rss/index.js";
import instagramFirecrawl from "../plugins/instagram-firecrawl/index.js";
import openMeteo from "../plugins/open-meteo/index.js";
import hackerNews from "../plugins/hacker-news/index.js";
import devTo from "../plugins/dev-to/index.js";
import bluesky from "../plugins/bluesky/index.js";
import cnn from "../plugins/cnn/index.js";
import washingtonPost from "../plugins/washington-post/index.js";
import wallStreetJournal from "../plugins/wall-street-journal/index.js";
import politico from "../plugins/politico/index.js";
import associatedPress from "../plugins/associated-press/index.js";
import reuters from "../plugins/reuters/index.js";
import alJazeera from "../plugins/al-jazeera/index.js";
import theNewYorker from "../plugins/the-new-yorker/index.js";
import espn from "../plugins/espn/index.js";
import medium from "../plugins/medium/index.js";
import centcom from "../plugins/centcom/index.js";
import podcasts from "../plugins/podcasts/index.js";
import nytCrossword from "../plugins/nyt-crossword/index.js";
import googleCalendar from "../plugins/google-calendar/index.js";
import gmail from "../plugins/gmail/index.js";
import wordle from "../plugins/wordle/index.js";
import tiktok from "../plugins/tiktok/index.js";
import github from "../plugins/github/index.js";
import defaultPlugin from "../plugins/default/index.js";
import type { BackendFeedPlugin } from "../plugins/types.js";

// Plugins are checked in order — first match wins.
// More specific domain matchers must come before broader ones.
// default plugin always matches, so it must be last.
const PLUGINS: readonly BackendFeedPlugin[] = [
  youtubeRss,
  buttondown,
  substackRss,
  reddit,
  instagramFirecrawl,
  openMeteo,
  hackerNews,
  devTo,
  bluesky,
  // Specific news sites before the generic rss plugin
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
  // nytimes.com — wordle must come before nyt-crossword (both check nytimes.com)
  wordle,
  nytCrossword,
  googleCalendar,
  gmail,
  tiktok,
  github,
  // Generic RSS parser — catches feed URLs that don't match a specific plugin
  rss,
  defaultPlugin,
];

export const resolvePlugin = (sourceUrl: string, pluginName?: string): BackendFeedPlugin => {
  if (pluginName != null) {
    const forced = PLUGINS.find((p) => p.name === pluginName);
    if (forced == null) throw new Error(`Unknown plugin: "${pluginName}"`);
    return forced;
  }
  return PLUGINS.find((plugin) => plugin.canHandle(sourceUrl)) ?? defaultPlugin;
};

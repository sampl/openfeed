import type { BackendFeedPlugin, PluginFeedItem } from "../types.js";
import { FeedError } from "../types.js";

interface NytPuzzle {
  puzzle_id: number;
  print_date: string;
  title: string | null;
  publish_type: string;
}

interface NytPuzzlesResponse {
  results: NytPuzzle[];
}

const nytCrosswordPlugin: BackendFeedPlugin = {
  name: "nyt-crossword",

  canHandle: (sourceUrl) =>
    sourceUrl.includes("nytimes.com") && sourceUrl.includes("crossword"),

  listItems: async (sourceUrl, fetchFn, options) => {
    const apiKey = options?.apiKey;
    if (typeof apiKey !== "string" || !apiKey) {
      throw new FeedError(
        "NYT Crossword requires an API key. See readme for setup.",
        "missing_credential"
      );
    }

    const limit = typeof options?.limit === "number" ? options.limit : 7;

    const apiUrl = `https://www.nytimes.com/svc/crosswords/v3/36569100/puzzles.json?publish_type=daily&sort_order=desc&sort_by=print_date&limit=${limit}`;

    const response = await fetchFn(apiUrl, {
      headers: { "nyt-s": apiKey },
    });

    if (!response.ok) {
      const code = response.status === 401 || response.status === 403 ? "auth_error" : response.status === 429 ? "rate_limited" : "network_error";
      throw new FeedError(`NYT Crossword API returned HTTP ${response.status}`, code);
    }

    const data = (await response.json()) as NytPuzzlesResponse;

    return data.results.map((puzzle): PluginFeedItem => {
      const title = puzzle.title ?? `NYT Crossword - ${puzzle.print_date}`;
      const url = `https://www.nytimes.com/crosswords/game/daily/${puzzle.print_date}`;

      return {
        sourceName: "NYT Crossword",
        sourceUrl,
        title,
        url,
        publishedAt: new Date(puzzle.print_date),
        renderData: {
          richText: { text: title },
        },
      };
    });
  },
};

export default nytCrosswordPlugin;

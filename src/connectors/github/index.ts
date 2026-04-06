import type { BackendFeedPlugin, PluginAS2Object } from "../types.js";
import { FeedError } from "../types.js";

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  created_at: string;
  user: { login: string };
  state: string;
}

const extractOwnerRepo = (sourceUrl: string): { owner: string; repo: string } => {
  const match = sourceUrl.match(/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!match?.[1] || !match[2]) throw new FeedError(`Could not parse owner/repo from URL: ${sourceUrl}`, "invalid_config");
  return { owner: match[1], repo: match[2] };
};

const githubPlugin: BackendFeedPlugin = {
  name: "github",

  canHandle: (sourceUrl) => /github\.com\/[^/?#]+\/[^/?#]+/.test(sourceUrl),

  listItems: async (sourceUrl, fetchFn, _context, options = {}): Promise<readonly PluginAS2Object[]> => {
    const { owner, repo } = extractOwnerRepo(sourceUrl);
    const limit = typeof options.limit === "number" ? options.limit : 10;

    const params = new URLSearchParams({
      state: "open",
      sort: "created",
      direction: "desc",
      per_page: String(limit),
    });

    const fetchUrl = `https://api.github.com/repos/${owner}/${repo}/issues?${params.toString()}`;

    const response = await fetchFn(fetchUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "openfeed/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    } as RequestInit);

    if (!response.ok) {
      const code = response.status === 404 ? "source_not_found"
        : (response.status === 401 || response.status === 403) ? "auth_error"
        : response.status === 429 ? "rate_limited"
        : "network_error";
      throw new FeedError(`GitHub API error: ${response.status} ${response.statusText}`, code);
    }

    const issues = (await response.json()) as GitHubIssue[];

    return issues.map((issue): PluginAS2Object => ({
      type: "Article",
      name: `#${issue.number}: ${issue.title}`,
      summary: issue.body != null ? issue.body.slice(0, 300) || undefined : undefined,
      url: issue.html_url,
      published: new Date(issue.created_at),
    }));
  },
};

export default githubPlugin;

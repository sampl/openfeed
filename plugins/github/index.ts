import type { BackendFeedPlugin, NewFeedItem } from "../types.js";
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

// Extract owner and repo from a github.com/{owner}/{repo} URL
const extractOwnerRepo = (sourceUrl: string): { owner: string; repo: string } => {
  const match = sourceUrl.match(/github\.com\/([^/?#]+)\/([^/?#]+)/i);
  if (!match?.[1] || !match[2]) throw new FeedError(`Could not parse owner/repo from URL: ${sourceUrl}`, "invalid_config");
  return { owner: match[1], repo: match[2] };
};

const githubPlugin: BackendFeedPlugin = {
  name: "github",

  // Matches github.com/{owner}/{repo} — requires at least two path segments
  canHandle: (sourceUrl) => /github\.com\/[^/?#]+\/[^/?#]+/.test(sourceUrl),

  listItems: async (sourceUrl, fetchFn, options = {}): Promise<readonly NewFeedItem[]> => {
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
        "User-Agent": "open-feed/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    } as RequestInit);

    if (!response.ok) {
      const code = response.status === 404 ? "source_not_found" : response.status === 401 || response.status === 403 ? "auth_error" : response.status === 429 ? "rate_limited" : "network_error";
      throw new FeedError(`GitHub API error: ${response.status} ${response.statusText}`, code);
    }

    const issues = (await response.json()) as GitHubIssue[];
    const sourceName = `${owner}/${repo}`;

    return issues.map((issue): NewFeedItem => ({
      sourceName,
      sourceUrl,
      title: `#${issue.number}: ${issue.title}`,
      description: issue.body != null ? issue.body.slice(0, 300) || undefined : undefined,
      url: issue.html_url,
      publishedAt: new Date(issue.created_at),
      renderData: {
        richText: {
          text: issue.body ?? issue.title,
        },
      },
    }));
  },
};

export default githubPlugin;

import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Badge, Banner, ErrorState, PageSpinner } from "../ui_components";
import { fetchRuns } from "../apiClient";
import type { FetchRun, FeedErrorCode } from "../apiClient";
import { SourceErrorRow } from "../components/SourceErrorRow";
import { formatDateTimeDetailed } from "../utils/format";
import styles from "./RunDetailPage.module.css";

const ERROR_CODE_LABELS: Record<FeedErrorCode, string> = {
  source_not_found: "Source not found",
  item_not_found: "Item not found",
  parse_error: "Could not parse content",
  invalid_config: "Configuration error",
  missing_credential: "Missing credential",
  auth_error: "Authentication failed",
  rate_limited: "Rate limited",
  network_error: "Network error",
  unknown: "Other errors",
};

// Group error sources by their error code, with "unknown" last
const groupErrorsByCode = (
  errorSources: FetchRun["sourceResults"]
): Array<{ code: FeedErrorCode; label: string; sources: FetchRun["sourceResults"] }> => {
  const groups = new Map<FeedErrorCode, FetchRun["sourceResults"][number][]>();

  for (const source of errorSources) {
    const code: FeedErrorCode = (source.errorCode as FeedErrorCode | undefined) ?? "unknown";
    const existing = groups.get(code) ?? [];
    groups.set(code, [...existing, source]);
  }

  // Sort so "unknown" is always last; otherwise preserve insertion order
  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === "unknown") return 1;
      if (b === "unknown") return -1;
      return 0;
    })
    .map(([code, sources]) => ({ code, label: ERROR_CODE_LABELS[code], sources }));
};

const formatDuration = (startedAt: string, completedAt?: string): string => {
  if (!completedAt) return "In progress";
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return `${(ms / 1000).toFixed(1)}s`;
};

export const RunDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  // Try to use run data passed via router state to avoid an extra fetch
  const stateRun = (location.state as { run?: FetchRun } | null)?.run;
  const [run, setRun] = useState<FetchRun | null>(stateRun ?? null);
  const [isLoading, setIsLoading] = useState(stateRun == null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stateRun != null || id == null) return;
    // State not available (e.g. direct URL access) — load from API
    setIsLoading(true);
    fetchRuns(50)
      .then((runs) => {
        const found = runs.find((r) => r.id === id) ?? null;
        setRun(found);
        if (found == null) setError("Run not found.");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id, stateRun]);

  if (isLoading) {
    return <div className={styles.page}><PageSpinner /></div>;
  }

  if (error || run == null) {
    return (
      <div className={styles.page}>
        <ErrorState error={new Error(error ?? "This fetch run could not be found.")} size="md" />
      </div>
    );
  }

  const errorSources = run.sourceResults.filter((s) => s.status === "error");
  const successSources = run.sourceResults.filter((s) => s.status === "success");
  const skippedSources = run.sourceResults.filter((s) => s.status === "skipped");
  const totalNewItems = run.sourceResults.reduce((sum, s) => sum + s.newItemsCount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Started</span>
          <span className={styles.metaValue}>{formatDateTimeDetailed(run.startedAt)}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Duration</span>
          <span className={styles.metaValue}>{formatDuration(run.startedAt, run.completedAt)}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Trigger</span>
          <span className={styles.metaValue}>{run.triggeredBy === "manual" ? "Manual" : "Scheduled"}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Status</span>
          <Badge emphasis={run.status === "success" ? "success" : run.status === "running" ? "info" : "error"}>
            {run.status}
          </Badge>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>New items</span>
          <span className={styles.metaValue}>{totalNewItems}</span>
        </div>
      </div>

      {run.errorMessage && (
        <div className={styles.bannerRow}>
          <Banner emphasis="error">{run.errorMessage}</Banner>
        </div>
      )}

      {errorSources.length > 0 && groupErrorsByCode(errorSources).map((group) => (
        <section key={group.code} className={styles.section}>
          <h3 className={styles.sectionHeading}>{group.label}</h3>
          <div className={styles.sourceList}>
            {group.sources.map((s) => (
              <SourceErrorRow
                key={s.sourceUrl}
                name={s.sourceName}
                url={s.sourceUrl}
                errorMessage={s.errorMessage}
              />
            ))}
          </div>
        </section>
      ))}

      {successSources.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionHeading}>Sources</h3>
          <ul className={styles.sourceList}>
            {successSources.map((s) => (
              <li key={s.sourceName} className={styles.sourceItem}>
                <span className={styles.sourceName}>{s.sourceName}</span>
                <span className={styles.sourceCount}>{s.newItemsCount} new</span>
              </li>
            ))}
            {skippedSources.map((s) => (
              <li key={s.sourceName} className={`${styles.sourceItem} ${styles.sourceItemSkipped}`}>
                <span className={styles.sourceName}>{s.sourceName}</span>
                <span className={styles.sourceCount}>Skipped</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

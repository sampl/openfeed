import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnapshot } from "valtio";
import { Warning } from "@phosphor-icons/react";
import { fetchFeeds } from "../apiClient";
import type { FetchRun } from "../apiClient";
import { feedState } from "../state/feedState";
import Badge from "../ui_components/Badge";
import styles from "./StickyFeedHeader.module.css";

interface StickyFeedHeaderProps {
  latestRun: FetchRun | null;
  remainingMinutes: number | null;
  isWarning: boolean;
}

export const StickyFeedHeader = ({ latestRun, remainingMinutes, isWarning }: StickyFeedHeaderProps) => {
  const snap = useSnapshot(feedState);
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<{ name: string }[]>([]);

  useEffect(() => {
    fetchFeeds()
      .then(setFeeds)
      .catch(() => {
        // Non-fatal: tabs just won't appear
      });
  }, []);

  const selectFeed = (feedName: string | null) => {
    feedState.selectedFeed = feedName;
    navigate("/");
  };

  const hasError = latestRun?.status === "error";
  const hasTimeLimit = remainingMinutes !== null;
  const hasMultipleFeeds = feeds.length > 1;

  // Don't render the header row if there's nothing to show
  if (!hasError && !hasTimeLimit && !hasMultipleFeeds) return null;

  return (
    <div className={styles.header}>
      {hasError && (
        <button
          className={styles.errorCircle}
          onClick={() => navigate("/runs")}
          aria-label="Sync error — view details"
        >
          <Warning size={16} weight="fill" />
        </button>
      )}

      {hasTimeLimit && (
        <Badge emphasis={isWarning ? "warning" : "neutral"}>
          {Math.ceil(remainingMinutes!)} min left
        </Badge>
      )}

      {hasMultipleFeeds && (
        <>
          <div className={styles.divider} aria-hidden="true" />
          <button
            className={`${styles.tab} ${snap.selectedFeed === null ? styles.tabActive : ""}`}
            onClick={() => selectFeed(null)}
          >
            All
          </button>
          {feeds.map((feed) => (
            <button
              key={feed.name}
              className={`${styles.tab} ${snap.selectedFeed === feed.name ? styles.tabActive : ""}`}
              onClick={() => selectFeed(feed.name)}
            >
              {feed.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSnapshot } from "valtio";
import { fetchFeeds } from "../apiClient";
import { feedState } from "../state/feedState";
import styles from "./FeedTabs.module.css";

export const FeedTabs = () => {
  const snap = useSnapshot(feedState);
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState<{ name: string }[]>([]);

  console.log(`📑 FeedTabs render — feeds=${feeds.length} selectedFeed=${snap.selectedFeed ?? "all"}`);

  useEffect(() => {
    console.log("📑 FeedTabs effect — fetching feeds");
    fetchFeeds()
      .then((fetched) => {
        console.log(`📑 FeedTabs fetch complete — ${fetched.length} feeds`);
        setFeeds(fetched);
      })
      .catch(() => {
        // Non-fatal: tabs just won't appear
      });
  }, []);

  // Only render if there are multiple feeds to switch between
  if (feeds.length <= 1) return null;

  const selectFeed = (feedName: string | null) => {
    console.log(`📑 FeedTabs selectFeed — ${feedName ?? "all"}`);
    feedState.selectedFeed = feedName;
    navigate("/");
  };

  return (
    <div className={styles.tabs}>
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
    </div>
  );
};

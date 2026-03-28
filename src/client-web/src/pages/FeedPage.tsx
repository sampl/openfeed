import { useState, useEffect, useRef, useCallback } from "react";
import { SmileyBlank } from "@phosphor-icons/react";
import { EmptyState, ErrorState, PageSpinner, toast } from "../ui_components";
import { useFeedItems } from "../hooks/useFeedItems";
import { useLatestRun } from "../hooks/useLatestRun";
import { useTimeTracking } from "../hooks/useTimeTracking";
import { useTimeLimits } from "../hooks/useTimeLimits";
import { FeedPostCard } from "../components/FeedPostCard";
import { FeedTabs } from "../components/FeedTabs";
import type { ApiFeedItem } from "connectors/types";
import styles from "./FeedPage.module.css";

const EMPTY_EMOJIS = ["🎉", "🌟", "✨", "🎊", "🌈", "🦋", "🌸", "🌊", "🎵", "🚀"];

export const FeedPage = () => {
  const {
    items,
    readItemIds,
    selectedFeed,
    selectedMethod,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    markAsRead,
    markReadLater,
    selectMethod,
  } = useFeedItems();

  console.log(`📰 FeedPage render — items=${items.length} readIds=${readItemIds.length} selectedFeed=${selectedFeed ?? "all"} isLoading=${isLoading}`);

  const latestRun = useLatestRun();

  const { heartbeatCount } = useTimeTracking(selectedFeed);
  const { remainingMinutes, isWarning, isLimitReached } = useTimeLimits(selectedFeed, heartbeatCount);

  // Track items saved this session so the bookmark icon fills immediately on tap
  const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());

  // Sentinel element at the bottom of the feed — triggers the next page load
  // when it scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          console.log("📰 FeedPage sentinel visible — fetching next page");
          void fetchNextPage();
        }
      },
      // Start loading 200 px before the user actually hits the bottom
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleShare = useCallback(async (item: ApiFeedItem) => {
    const text = `${item.url} - shared with Open Feed`;
    try {
      await navigator.clipboard.writeText(text);
      toast("Link copied");
    } catch {
      // Fallback for browsers without clipboard API
    }
  }, []);

  const handleBookmark = useCallback((id: string) => {
    setSavedItemIds((prev) => new Set(prev).add(id));
    return markReadLater(id);
  }, [markReadLater]);

  if (isLoading) {
    return (
      <div className={styles.pageEmpty}>
        <PageSpinner />
      </div>
    );
  }

  // Use today's date as a seed so the emoji is stable within a day but rotates each day
  const dateStr = new Date().toDateString();
  const dateSeed = Array.from(dateStr).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const emptyEmoji = EMPTY_EMOJIS[dateSeed % EMPTY_EMOJIS.length];

  return (
    <div className={styles.page}>
      {remainingMinutes !== null && (
        <div className={[styles.timeRemainingBanner, isWarning ? styles.timeRemainingBannerWarning : ""].join(" ").trim()}>
          {Math.ceil(remainingMinutes)} min left today
        </div>
      )}

      <FeedTabs />

      {error && (
        <div className={styles.emptyContent}>
          <ErrorState error={new Error(error)} size="md" />
        </div>
      )}

      {!error && isLimitReached && (
        <div className={styles.emptyContent}>
          <SmileyBlank size={52} weight="thin" className={styles.blockerIcon} />
          <EmptyState
            title="Time's up for today"
            description="You've reached your daily limit. Come back tomorrow."
            size="md"
          />
        </div>
      )}

      {!error && !isLimitReached && items.length === 0 && (
        <div className={styles.emptyContent}>
          <span className={styles.emptyEmoji}>{emptyEmoji}</span>
          <EmptyState
            title="All caught up!"
            description="No unread items in your feed."
            size="md"
          />
          {latestRun && (
            <p className={styles.lastFetched}>
              Last fetched{" "}
              {new Date(latestRun.completedAt ?? latestRun.startedAt).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      )}

      {!error && !isLimitReached && items.length > 0 && (
        <div className={styles.feed}>
          {items.map((item) => (
            <FeedPostCard
              key={item.id}
              item={item}
              isRead={readItemIds.includes(item.id)}
              isSaved={savedItemIds.has(item.id)}
              onRead={markAsRead}
              onBookmark={handleBookmark}
              onShare={handleShare}
              selectedMethod={selectedMethod}
              onSelectMethod={selectMethod}
            />
          ))}
          {/* Sentinel observed by IntersectionObserver to auto-load the next page */}
          <div ref={sentinelRef} className={styles.sentinel}>
            {isFetchingNextPage && <span className={styles.loadingMore}>Loading more…</span>}
          </div>
        </div>
      )}

    </div>
  );
};

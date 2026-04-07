import { useCallback, useEffect } from "react";
import { useSnapshot } from "valtio";
import { useInfiniteQuery } from "@tanstack/react-query";
import { feedState } from "../state/feedState";
import { fetchObjects, createActivity } from "../apiClient";
import type { RendererKey } from "../state/feedState";

const PAGE_SIZE = 30;

export const useFeedItems = () => {
  const snap = useSnapshot(feedState);

  const query = useInfiniteQuery({
    queryKey: ["objects", "unread", snap.selectedFeed],
    queryFn: ({ pageParam }) =>
      fetchObjects("unread", snap.selectedFeed ?? undefined, PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.reduce((sum, page) => sum + page.items.length, 0);
      return lastPage.hasMore ? fetched : undefined;
    },
  });

  // Flatten all pages into a single items array
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  // Reset method preference when the selected feed changes.
  // readItemIds is intentionally NOT reset here — read state persists until hard refresh.
  useEffect(() => {
    console.log(`🧲 useFeedItems effect — feed changed to ${snap.selectedFeed ?? "all"}`);
    feedState.selectedMethod = null;
  }, [snap.selectedFeed]);

  // Stable references — only mutate the Valtio proxy directly so no deps needed
  const markAsRead = useCallback(async (id: string) => {
    console.log(`🧲 useFeedItems markAsRead — id=${id}`);
    if (feedState.readItemIds.includes(id)) return;
    feedState.readItemIds.push(id);
    // Non-fatal — the UI is already updated optimistically; swallow network errors
    // so a transient failure (e.g. "Load failed" on iOS) doesn't produce an
    // unhandled rejection that triggers the global error banner.
    await createActivity("Read", id).catch(() => {});
  }, []);

  const markReadLater = useCallback(async (id: string) => {
    console.log(`🧲 useFeedItems markReadLater — id=${id}`);
    // Only add to readItemIds if not already present (e.g. auto-marked as read
    // by scrolling), but always send the API call so the item is actually saved.
    if (!feedState.readItemIds.includes(id)) {
      feedState.readItemIds.push(id);
    }
    // Non-fatal — same reasoning as markAsRead above.
    await createActivity("Add", id, { type: "Collection", name: "read-later" }).catch(() => {});
  }, []);

  const selectMethod = useCallback((method: RendererKey) => {
    console.log(`🧲 useFeedItems selectMethod — method=${method}`);
    feedState.selectedMethod = method;
  }, []);

  return {
    items,
    readItemIds: snap.readItemIds,
    selectedFeed: snap.selectedFeed,
    selectedMethod: snap.selectedMethod,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error instanceof Error ? query.error.message : null,
    markAsRead,
    markReadLater,
    selectMethod,
  };
};

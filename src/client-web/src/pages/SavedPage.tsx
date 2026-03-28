import { useCallback, useEffect, useState } from "react";
import { BookmarkSimple } from "@phosphor-icons/react";
import { fetchItems, updateItemStatus } from "../apiClient";
import type { ApiFeedItem } from "plugins/types";
import type { RenderMethodKey } from "../state/feedState";
import { EmptyState, ErrorState, PageSpinner, toast } from "../ui_components";
import { FeedPostCard } from "../components/FeedPostCard";
import styles from "./SavedPage.module.css";

export const SavedPage = () => {
  const [items, setItems] = useState<ApiFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<RenderMethodKey | null>(null);

  console.log(`🔖 SavedPage render — items=${items.length} isLoading=${isLoading}`);

  useEffect(() => {
    console.log("🔖 SavedPage effect — fetching saved items");
    setIsLoading(true);
    setError(null);
    fetchItems("read-later")
      .then((response) => {
        console.log(`🔖 SavedPage fetch complete — ${response.items.length} items`);
        setItems(response.items);
      })
      .catch((err: Error) => {
        console.log(`🔖 SavedPage fetch error — ${err.message}`);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleUnsave = useCallback(async (id: string) => {
    console.log(`🔖 SavedPage handleUnsave — id=${id}`);
    await updateItemStatus(id, "archived").catch(() => {});
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleShare = useCallback(async (item: ApiFeedItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast("Link copied");
    } catch {
      // Fallback: clipboard API unavailable
    }
  }, []);

  const handleRead = useCallback((_id: string) => {
    // No-op: saved items page doesn't auto-archive on scroll
  }, []);

  return (
    <div className={styles.page}>
      {isLoading && <PageSpinner />}
      {error && <ErrorState error={new Error(error)} size="md" />}
      {!isLoading && !error && items.length === 0 && (
        <div className={styles.pageEmpty}>
          <EmptyState
            icon={<BookmarkSimple size={48} weight="light" />}
            title="Nothing saved yet"
            description="Items you save will appear here."
            size="md"
          />
        </div>
      )}
      {!isLoading && !error && items.length > 0 && (
        <div className={styles.feed}>
          {items.map((item) => (
            <FeedPostCard
              key={item.id}
              item={item}
              isRead={false}
              isSaved={true}
              onRead={handleRead}
              onBookmark={handleUnsave}
              onShare={handleShare}
              selectedMethod={selectedMethod}
              onSelectMethod={setSelectedMethod}
            />
          ))}
        </div>
      )}
    </div>
  );
};

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookmarkSimple } from "@phosphor-icons/react";
import { fetchItems } from "../apiClient";
import type { ApiFeedItem } from "plugins/types";
import { EmptyState, ErrorState, PageSpinner } from "../ui_components";
import { CompactFeedList } from "../components/CompactFeedList";
import styles from "./SavedPage.module.css";

export const SavedPage = () => {
  const [items, setItems] = useState<ApiFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleSelectItem = (item: ApiFeedItem) => {
    navigate(`/item/${item.id}`, { state: { item } });
  };

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
        <CompactFeedList items={items} onSelect={handleSelectItem} />
      )}
    </div>
  );
};

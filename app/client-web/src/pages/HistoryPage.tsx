import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "@phosphor-icons/react";
import { fetchItems } from "../apiClient";
import type { ApiFeedItem } from "plugins/types";
import { EmptyState, ErrorState, PageSpinner } from "../ui_components";
import { CompactFeedList } from "../components/CompactFeedList";
import styles from "./HistoryPage.module.css";

export const HistoryPage = () => {
  const [items, setItems] = useState<ApiFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  console.log(`📚 HistoryPage render — items=${items.length} isLoading=${isLoading}`);

  useEffect(() => {
    console.log("📚 HistoryPage effect — fetching archived items");
    setIsLoading(true);
    setError(null);
    fetchItems("archived")
      .then((response) => {
        console.log(`📚 HistoryPage fetch complete — ${response.items.length} items`);
        setItems(response.items);
      })
      .catch((err: Error) => {
        console.log(`📚 HistoryPage fetch error — ${err.message}`);
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
        <EmptyState
          icon={<Clock size={48} weight="light" />}
          title="No history yet"
          description="Items you've read will appear here."
          size="md"
        />
      )}
      {!isLoading && !error && items.length > 0 && (
        <CompactFeedList items={items} onSelect={handleSelectItem} />
      )}
    </div>
  );
};

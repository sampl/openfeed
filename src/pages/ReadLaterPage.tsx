import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "@phosphor-icons/react";
import { fetchItems } from "../apiClient";
import type { ApiFeedItem } from "plugins/types";
import { EmptyState } from "../ui_components";
import { HistoryList } from "../components/HistoryList";
import styles from "./ReadLaterPage.module.css";

export const ReadLaterPage = () => {
  const [items, setItems] = useState<ApiFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  console.log(`🔖 ReadLaterPage render — items=${items.length} isLoading=${isLoading}`);

  useEffect(() => {
    console.log("🔖 ReadLaterPage effect — fetching read-later items");
    setIsLoading(true);
    setError(null);
    fetchItems("read-later")
      .then((response) => {
        console.log(`🔖 ReadLaterPage fetch complete — ${response.items.length} items`);
        setItems(response.items);
      })
      .catch((err: Error) => {
        console.log(`🔖 ReadLaterPage fetch error — ${err.message}`);
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSelectItem = (item: ApiFeedItem) => {
    navigate(`/item/${item.id}`, { state: { item } });
  };

  return (
    <div className={styles.page}>
      {isLoading && <p className={styles.status}>Loading…</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          icon={<Clock size={48} weight="light" />}
          title="Nothing saved yet"
          description="Items you mark as read later will appear here."
          size="md"
        />
      )}
      {!isLoading && !error && items.length > 0 && (
        <HistoryList items={items} onSelect={handleSelectItem} />
      )}
    </div>
  );
};

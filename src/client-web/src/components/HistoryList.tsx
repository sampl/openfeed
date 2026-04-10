import type { AS2Object } from "connectors/types";
import { formatDate } from "../utils/format";
import styles from "./HistoryList.module.css";

interface Props {
  items: AS2Object[];
  onSelect: (item: AS2Object) => void;
}

export const HistoryList = ({ items, onSelect }: Props) => {
  console.log(`🗂 HistoryList render — items=${items.length}`);

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.row}>
          <div className={styles.meta}>
            <span className={styles.source}>{item.sourceName}</span>
            {item.published && <span className={styles.date}>{formatDate(item.published)}</span>}
          </div>
          <button
            className={styles.title}
            onClick={() => onSelect(item)}
          >
            {item.name}
          </button>
        </li>
      ))}
    </ul>
  );
};

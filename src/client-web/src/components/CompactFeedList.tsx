import type { ApiFeedItem } from "connectors/types";
import styles from "./CompactFeedList.module.css";

interface Props {
  items: ApiFeedItem[];
  onSelect: (item: ApiFeedItem) => void;
}

export const CompactFeedList = ({ items, onSelect }: Props) => {
  console.log(`📋 CompactFeedList render — items=${items.length}`);

  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.row}>
          <button className={styles.button} onClick={() => onSelect(item)}>
            <span className={styles.title}>{item.title}</span>
            <span className={styles.source}>{item.sourceName}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};

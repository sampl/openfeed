import type { RenderMethodKey } from "../state/feedState";
import styles from "./MethodToggle.module.css";

const METHOD_LABELS: Record<RenderMethodKey, string> = {
  video: "Video",
  richText: "Text",
  audio: "Audio",
  embed: "Embed",
};

interface Props {
  methods: RenderMethodKey[];
  selected: RenderMethodKey;
  onSelect: (method: RenderMethodKey) => void;
}

export const MethodToggle = ({ methods, selected, onSelect }: Props) => {
  console.log(`🔀 MethodToggle render — selected=${selected} methods=[${methods.join(",")}]`);

  const handleSelect = (method: RenderMethodKey) => {
    console.log(`🔀 MethodToggle select — ${method}`);
    onSelect(method);
  };

  return (
    <div className={styles.toggle}>
      {methods.map((method) => (
        <button
          key={method}
          className={`${styles.button} ${selected === method ? styles.active : ""}`}
          onClick={() => handleSelect(method)}
          aria-pressed={selected === method}
        >
          {METHOD_LABELS[method]}
        </button>
      ))}
    </div>
  );
};

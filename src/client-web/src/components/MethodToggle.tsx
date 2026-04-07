import type { RendererKey } from "../state/feedState";
import styles from "./MethodToggle.module.css";

const METHOD_LABELS: Record<RendererKey, string> = {
  video: "Video",
  content: "Text",
  audio: "Audio",
  embed: "Embed",
};

interface Props {
  methods: RendererKey[];
  selected: RendererKey;
  onSelect: (method: RendererKey) => void;
}

export const MethodToggle = ({ methods, selected, onSelect }: Props) => {
  console.log(`🔀 MethodToggle render — selected=${selected} methods=[${methods.join(",")}]`);

  const handleSelect = (method: RendererKey) => {
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

import type { EmbedRenderData } from "connectors/types";
import styles from "./EmbedRenderer.module.css";

interface Props {
  data: EmbedRenderData;
}

export const EmbedRenderer = ({ data }: Props) => {
  console.log(`🔗 EmbedRenderer render — url=${data.url}`);

  return (
    <div className={styles.wrapper}>
      <iframe
        src={data.url}
        title="Embedded content"
        className={styles.iframe}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
      {/* Fallback link in case the browser blocks the iframe or sandbox prevents rendering */}
      <p className={styles.fallback}>
        <a href={data.url} target="_blank" rel="noopener noreferrer">
          Open in new tab
        </a>
      </p>
    </div>
  );
};

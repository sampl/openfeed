import styles from "./EmbedRenderer.module.css";

interface Props {
  url: string;
}

export const EmbedRenderer = ({ url }: Props) => {
  console.log(`🔗 EmbedRenderer render — url=${url}`);

  return (
    <div className={styles.wrapper}>
      <iframe
        src={url}
        title="Embedded content"
        className={styles.iframe}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
      {/* Fallback link in case the browser blocks the iframe or sandbox prevents rendering */}
      <p className={styles.fallback}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          Open in new tab
        </a>
      </p>
    </div>
  );
};

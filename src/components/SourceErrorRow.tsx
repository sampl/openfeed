import styles from "./SourceErrorRow.module.css";

interface SourceErrorRowProps {
  readonly name: string;
  readonly url: string;
  readonly errorMessage?: string;
}

export const SourceErrorRow = ({ name, url, errorMessage }: SourceErrorRowProps) => (
  <div className={styles.row}>
    <div className={styles.main}>
      <span className={styles.name}>{name}</span>
      <span className={styles.url}>{url}</span>
    </div>
    {errorMessage && <span className={styles.message}>{errorMessage}</span>}
  </div>
);

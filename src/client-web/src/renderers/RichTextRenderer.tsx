import styles from "./RichTextRenderer.module.css";

interface Props {
  content?: string;
  mediaType?: string;
}

export const RichTextRenderer = ({ content, mediaType }: Props) => {
  const isHtml = mediaType == null || mediaType === "text/html";
  console.log(`📝 RichTextRenderer render — mode=${isHtml ? "html" : "text"}`);

  if (!content) return null;

  if (isHtml) {
    return (
      <div
        className={styles.content}
        // This is a personal self-hosted app; HTML comes from trusted RSS sources
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  return <div className={styles.content}>{content}</div>;
};

import type { RichTextRenderData } from "plugins/types";
import styles from "./RichTextRenderer.module.css";

interface Props {
  data: RichTextRenderData;
}

export const RichTextRenderer = ({ data }: Props) => {
  console.log(`📝 RichTextRenderer render — mode=${data.html ? "html" : "text"}`);

  if (data.html) {
    return (
      <div
        className={styles.content}
        // This is a personal self-hosted app; HTML comes from trusted RSS sources
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    );
  }
  return <div className={styles.content}>{data.text}</div>;
};

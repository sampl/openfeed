import type { VideoRenderData } from "connectors/types";
import styles from "./VideoRenderer.module.css";

interface Props {
  data: VideoRenderData;
}

export const VideoRenderer = ({ data }: Props) => {
  const embedUrl = data.videoId
    ? `https://www.youtube.com/embed/${data.videoId}`
    : data.url ?? "";

  console.log(`🎞 VideoRenderer render — embedUrl=${embedUrl}`);

  if (!embedUrl) return <p>No video available</p>;

  return (
    <div className={styles.wrapper}>
      <iframe
        src={embedUrl}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={styles.iframe}
      />
    </div>
  );
};

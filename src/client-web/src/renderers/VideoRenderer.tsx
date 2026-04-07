import styles from "./VideoRenderer.module.css";

interface Props {
  embedUrl: string;
}

export const VideoRenderer = ({ embedUrl }: Props) => {
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

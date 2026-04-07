import styles from "./AudioRenderer.module.css";

interface Props {
  audioUrl: string;
}

export const AudioRenderer = ({ audioUrl }: Props) => {
  console.log(`🔊 AudioRenderer render — url=${audioUrl}`);

  return (
    <div className={styles.wrapper}>
      <audio
        controls
        src={audioUrl}
        className={styles.player}
        preload="metadata"
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

import type { AudioRenderData } from "plugins/types";
import styles from "./AudioRenderer.module.css";

interface Props {
  data: AudioRenderData;
}

export const AudioRenderer = ({ data }: Props) => {
  console.log(`🔊 AudioRenderer render — url=${data.url}`);

  return (
    <div className={styles.wrapper}>
      <audio
        controls
        src={data.url}
        className={styles.player}
        preload="metadata"
      >
        Your browser does not support the audio element.
      </audio>
    </div>
  );
};

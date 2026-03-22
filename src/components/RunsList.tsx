import { useNavigate } from "react-router-dom";
import { Badge } from "../ui_components";
import type { FetchRun } from "../apiClient";
import { formatDateTime } from "../utils/format";
import styles from "./RunsList.module.css";

interface Props {
  runs: FetchRun[];
}

export const RunsList = ({ runs }: Props) => {
  const navigate = useNavigate();

  console.log(`🏃 RunsList render — runs=${runs.length}`);

  if (runs.length === 0) {
    return <p className={styles.empty}>No runs yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {runs.map((run) => {
        const errorCount = run.sourceResults.filter((s) => s.status === "error").length;

        return (
          <li
            key={run.id}
            className={styles.row}
            onClick={() => navigate(`/runs/${run.id}`, { state: { run } })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                navigate(`/runs/${run.id}`, { state: { run } });
              }
            }}
          >
            <div className={styles.header}>
              <div className={styles.meta}>
                <span className={styles.date}>{formatDateTime(run.startedAt)}</span>
                <span className={styles.trigger}>
                  {run.triggeredBy === "manual" ? "Manual" : "Scheduled"}
                </span>
              </div>
              <div className={styles.badges}>
                {errorCount > 0 ? (
                  <Badge emphasis="error">{errorCount} error{errorCount !== 1 ? "s" : ""}</Badge>
                ) : (
                  <Badge emphasis={run.status === "success" ? "success" : run.status === "running" ? "info" : "error"}>
                    {run.status === "running" ? "Running" : run.status === "success" ? "Success" : "Error"}
                  </Badge>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

import { useState } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState, PageSpinner } from "../ui_components";
import { useRuns } from "../hooks/useRuns";
import { triggerFetch } from "../apiClient";
import { RunsList } from "../components/RunsList";
import styles from "./RunsPage.module.css";

export const RunsPage = () => {
  const { runs, isLoading, error } = useRuns();
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleRunNow = () => {
    if (!window.confirm("Start a new fetch run?")) return;
    setIsSyncing(true);
    triggerFetch()
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["items"] });
      })
      .catch(() => {
        // Non-fatal: user can try again
      })
      .finally(() => setIsSyncing(false));
  };

  return (
    <div className={styles.page}>
      <div className={styles.actions}>
        <button className={styles.runButton} onClick={handleRunNow} disabled={isSyncing}>
          <ArrowClockwise size={16} />
          {isSyncing ? "Running…" : "Run now"}
        </button>
      </div>
      {isLoading && <PageSpinner />}
      {error && <ErrorState error={new Error(error)} size="md" />}
      {!isLoading && !error && <RunsList runs={runs} />}
    </div>
  );
};

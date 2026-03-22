import { ErrorState, PageSpinner } from "../ui_components";
import { useRuns } from "../hooks/useRuns";
import { RunsList } from "../components/RunsList";
import styles from "./RunsPage.module.css";

export const RunsPage = () => {
  const { runs, isLoading, error } = useRuns();

  return (
    <div className={styles.page}>
      {isLoading && <PageSpinner />}
      {error && <ErrorState error={new Error(error)} size="md" />}
      {!isLoading && !error && <RunsList runs={runs} />}
    </div>
  );
};

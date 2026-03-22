import { useQuery } from "@tanstack/react-query";
import { ErrorState, PageSpinner } from "../ui_components";
import { fetchConfig } from "../apiClient";
import styles from "./ConfigPage.module.css";

export const ConfigPage = () => {
  const { data: configText, isLoading, error } = useQuery({
    queryKey: ["config"],
    queryFn: fetchConfig,
  });

  if (isLoading) return <div className={styles.page}><PageSpinner /></div>;
  if (error || configText == null) {
    return (
      <div className={styles.page}>
        <ErrorState error={error instanceof Error ? error : new Error("Could not load the config file.")} size="md" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <pre className={styles.config}>{configText}</pre>
    </div>
  );
};

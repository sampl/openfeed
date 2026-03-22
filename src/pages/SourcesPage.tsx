import { useQuery } from "@tanstack/react-query";
import { ErrorState, PageSpinner, Badge } from "../ui_components";
import { fetchSources } from "../apiClient";
import styles from "./SourcesPage.module.css";

export const SourcesPage = () => {
  const { data: sources, isLoading, error } = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });

  if (isLoading) return <div className={styles.page}><PageSpinner /></div>;
  if (error || sources == null) {
    return (
      <div className={styles.page}>
        <ErrorState error={error instanceof Error ? error : new Error("Could not load sources.")} size="md" />
      </div>
    );
  }

  // Group sources by feed name
  const byFeed = sources.reduce<Record<string, typeof sources>>((acc, source) => {
    const existing = acc[source.feedName] ?? [];
    acc[source.feedName] = [...existing, source];
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      {Object.entries(byFeed).map(([feedName, feedSources]) => (
        <section key={feedName} className={styles.section}>
          <h3 className={styles.feedName}>{feedName}</h3>
          <ul className={styles.list}>
            {feedSources.map((source) => (
              <li key={source.url} className={styles.row}>
                <div className={styles.info}>
                  <span className={styles.name}>{source.name}</span>
                  <span className={styles.url}>{source.url}</span>
                  {source.lastErrorMessage && (
                    <span className={styles.errorMessage}>{source.lastErrorMessage}</span>
                  )}
                </div>
                {source.lastStatus != null && (
                  <Badge
                    emphasis={
                      source.lastStatus === "success"
                        ? "success"
                        : source.lastStatus === "error"
                          ? "error"
                          : "neutral"
                    }
                  >
                    {source.lastStatus}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

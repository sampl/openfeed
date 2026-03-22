import { useState, useEffect } from "react";
import { fetchRuns } from "../apiClient";
import type { FetchRun } from "../apiClient";

export const useLatestRun = () => {
  const [latestRun, setLatestRun] = useState<FetchRun | null>(null);

  useEffect(() => {
    console.log("📡 useLatestRun effect — fetching latest run");
    fetchRuns(1)
      .then((runs) => {
        console.log(`📡 useLatestRun result — status=${runs[0]?.status ?? "none"}`);
        setLatestRun(runs[0] ?? null);
      })
      .catch(() => {
        // Non-fatal: error banner just won't appear
      });
  }, []);

  return latestRun;
};

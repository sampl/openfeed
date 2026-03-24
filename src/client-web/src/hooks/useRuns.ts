import { useQuery } from "@tanstack/react-query";
import { fetchRuns } from "../apiClient";
import type { FetchRun } from "../apiClient";

export const useRuns = (): { runs: FetchRun[]; isLoading: boolean; error: string | null } => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["runs"],
    queryFn: () => {
      console.log("📜 useRuns queryFn — fetching runs");
      return fetchRuns();
    },
  });

  return {
    runs: data ?? [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
};

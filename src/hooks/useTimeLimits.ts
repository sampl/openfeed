import { useState, useEffect } from "react";
import { fetchTimeLimits, fetchTimeUsage } from "../apiClient";
import type { TimeLimitsResponse, TimeUsageResponse } from "../apiClient";

export interface TimeLimitStatus {
  limitMinutes: number | null;
  usedMinutes: number;
  remainingMinutes: number | null;
  isWarning: boolean;
  isLimitReached: boolean;
}

const getLocalDate = (): string => new Date().toLocaleDateString("en-CA");

const resolveLimit = (feedName: string | null, limitsConfig: TimeLimitsResponse): number | null => {
  // Feed-specific daily limit takes precedence over global
  if (feedName != null) {
    const feedLimit = limitsConfig.byFeed[feedName]?.daily;
    if (feedLimit != null) return feedLimit;
  }
  return limitsConfig.global?.daily ?? null;
};

export const useTimeLimits = (feedName: string | null, heartbeatCount: number): TimeLimitStatus => {
  const [limitsConfig, setLimitsConfig] = useState<TimeLimitsResponse | null>(null);
  const [usage, setUsage] = useState<TimeUsageResponse | null>(null);

  // Fetch limits config once on mount
  useEffect(() => {
    fetchTimeLimits()
      .then(setLimitsConfig)
      .catch(() => {
        // Non-fatal — limits are optional
      });
  }, []);

  // Re-fetch usage whenever a heartbeat fires (tracks passage of time)
  useEffect(() => {
    fetchTimeUsage(getLocalDate())
      .then(setUsage)
      .catch(() => {
        // Non-fatal
      });
  }, [heartbeatCount]);

  if (limitsConfig == null || usage == null) {
    return {
      limitMinutes: null,
      usedMinutes: 0,
      remainingMinutes: null,
      isWarning: false,
      isLimitReached: false,
    };
  }

  const limitMinutes = resolveLimit(feedName, limitsConfig);

  // Use feed-specific usage if viewing a specific feed, otherwise total
  const usedMinutes = feedName != null
    ? (usage.byFeed[feedName] ?? 0)
    : usage.total;

  if (limitMinutes == null) {
    return {
      limitMinutes: null,
      usedMinutes,
      remainingMinutes: null,
      isWarning: false,
      isLimitReached: false,
    };
  }

  const remainingMinutes = Math.max(0, limitMinutes - usedMinutes);
  const isLimitReached = usedMinutes >= limitMinutes;

  // Warn when ≤5 minutes left, or ≤20% of limit remaining, whichever fires first
  const warningThreshold = Math.max(5, limitMinutes * 0.2);
  const isWarning = !isLimitReached && remainingMinutes <= warningThreshold;

  return { limitMinutes, usedMinutes, remainingMinutes, isWarning, isLimitReached };
};

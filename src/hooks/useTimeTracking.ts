import { useState, useEffect, useRef } from "react";
import { recordTimeSession } from "../apiClient";

// Returns the current date as YYYY-MM-DD in the user's local timezone
const getLocalDate = (): string =>
  new Date().toLocaleDateString("en-CA"); // en-CA locale gives YYYY-MM-DD format

const HEARTBEAT_INTERVAL_MS = 30_000;
// Skip recording very short segments to avoid noise from tab switches
const MIN_RECORD_MS = 500;

export const useTimeTracking = (feedName: string | null): { heartbeatCount: number } => {
  const [heartbeatCount, setHeartbeatCount] = useState(0);
  const segmentStartRef = useRef<number>(Date.now());
  // Track the date at session start so crossing midnight doesn't corrupt the date
  const dateRef = useRef<string>(getLocalDate());

  const flush = (then: () => void = () => {}) => {
    const now = Date.now();
    const durationMs = now - segmentStartRef.current;
    segmentStartRef.current = now;

    if (durationMs < MIN_RECORD_MS) {
      then();
      return;
    }

    recordTimeSession(feedName, durationMs, dateRef.current)
      .catch(() => {
        // Non-fatal — time tracking is best-effort
      })
      .finally(then);
  };

  // Heartbeat: flush elapsed time every 30s
  useEffect(() => {
    segmentStartRef.current = Date.now();
    dateRef.current = getLocalDate();

    const interval = setInterval(() => {
      flush();
      setHeartbeatCount((c) => c + 1);
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
    // feedName intentionally not in deps — flush captures it via closure on each call
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedName]);

  // Pause tracking when tab is hidden, resume when visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flush();
        setHeartbeatCount((c) => c + 1);
      } else {
        // Reset start time when coming back into view
        segmentStartRef.current = Date.now();
        dateRef.current = getLocalDate();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedName]);

  // Flush remaining time on unmount using a synchronous beacon if available,
  // falling back to a regular fetch (best-effort for page unloads)
  useEffect(() => {
    return () => {
      const durationMs = Date.now() - segmentStartRef.current;
      if (durationMs < MIN_RECORD_MS) return;

      const body = JSON.stringify({
        feedName: feedName ?? undefined,
        durationMs: Math.round(durationMs),
        date: dateRef.current,
      });

      // sendBeacon fires reliably on page unload unlike fetch
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon("/api/time/sessions", blob);
      } else {
        recordTimeSession(feedName, durationMs, dateRef.current).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedName]);

  return { heartbeatCount };
};

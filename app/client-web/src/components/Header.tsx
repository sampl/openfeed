import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowClockwise } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { triggerFetch } from "../apiClient";
import styles from "./Header.module.css";

// Map known routes to their back-navigation targets
const getBackPath = (pathname: string): string | null => {
  if (pathname.startsWith("/runs/")) return "/runs";
  if (pathname === "/history" || pathname === "/runs") return "/settings";
  if (pathname === "/saved" || pathname === "/settings") return "/";
  return null;
};

const getPageTitle = (pathname: string): string => {
  if (pathname === "/history") return "History";
  if (pathname === "/saved") return "Saved";
  if (pathname === "/runs") return "Runs";
  if (pathname.startsWith("/runs/")) return "Run detail";
  if (pathname === "/settings") return "Settings";
  return "";
};

export const Header = () => {
  const location = useLocation();
  const [isFetching, setIsFetching] = useState(false);
  const queryClient = useQueryClient();

  console.log(`🔄 Header render — pathname=${location.pathname}`);

  const backPath = getBackPath(location.pathname);
  const isHome = location.pathname === "/";
  const isRuns = location.pathname === "/runs";

  const handleRefresh = () => {
    setIsFetching(true);
    triggerFetch()
      .then(() => {
        // Invalidate the feed query so TanStack Query refetches from page 0
        void queryClient.invalidateQueries({ queryKey: ["items"] });
      })
      .catch(() => {
        // Non-fatal: user can try again
      })
      .finally(() => setIsFetching(false));
  };

  const handleFetchNow = () => {
    setIsFetching(true);
    triggerFetch()
      .then(() => {
        // Invalidate runs query so the list refreshes after triggering a fetch
        void queryClient.invalidateQueries({ queryKey: ["runs"] });
      })
      .catch(() => {
        // Non-fatal: user can try again
      })
      .finally(() => setIsFetching(false));
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {backPath != null ? (
          <Link to={backPath} className={styles.backButton} aria-label="Back">
            <ArrowLeft size={20} weight="bold" />
          </Link>
        ) : null}
      </div>

      <div className={styles.center}>
        {isHome ? null : (
          <span className={styles.pageTitle}>{getPageTitle(location.pathname)}</span>
        )}
      </div>

      <div className={styles.right}>
        {isHome && (
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={isFetching}
            aria-label="Refresh feed"
          >
            <ArrowClockwise size={20} weight="bold" />
          </button>
        )}
        {isRuns && (
          <button
            className={styles.refreshButton}
            onClick={handleFetchNow}
            disabled={isFetching}
            aria-label="Fetch now"
          >
            <ArrowClockwise size={20} weight="bold" />
          </button>
        )}
      </div>
    </header>
  );
};

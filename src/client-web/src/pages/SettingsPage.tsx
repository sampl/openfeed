import { useNavigate } from "react-router-dom";
import { Clock, ArrowsClockwise, Plus, GlobeSimple, BookOpen, Warning, CheckCircle, ListBullets, Code, Package, Swatches, LockOpen, LockKey, Trash } from "@phosphor-icons/react";
import { Copyright, SettingsSection, SettingsItem } from "../ui_components";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSources, fetchAuthStatus, clearAccessKey, getAccessKey } from "../apiClient";
import { useLatestRun } from "../hooks/useLatestRun";
import { authState } from "../state/authState";
import styles from "./SettingsPage.module.css";

const showAddToHomeScreenInstructions = () => {
  alert(
    "Add to home screen\n\n" +
      "1. Open this page in Safari\n" +
      "2. Tap the share button (box with arrow pointing up)\n" +
      "3. Scroll down and tap \u201cAdd to Home Screen\u201d\n" +
      "4. Tap \u201cAdd\u201d to confirm"
  );
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 60) return "just now";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    return rtf.format(-diffMinutes, "minute");
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    return rtf.format(-diffHours, "hour");
  }

  const diffDays = Math.floor(diffHours / 24);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return rtf.format(-diffDays, "day");
};

export const SettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const latestRun = useLatestRun();
  const { data: sources } = useQuery({ queryKey: ["sources"], queryFn: fetchSources });
  const { data: authStatus } = useQuery({ queryKey: ["auth/status"], queryFn: fetchAuthStatus });
  const hasKey = getAccessKey() != null;

  const fetchErrorCount = latestRun?.status === "error"
    ? latestRun.sourceResults.filter((r) => r.status === "error").length
    : 0;

  // Determine last run status item props
  const lastRunTitle = (() => {
    if (!latestRun) return "No runs yet";
    if (latestRun.status === "error") return `${fetchErrorCount} error${fetchErrorCount !== 1 ? "s" : ""} in last run`;
    return `Last run ${formatRelativeTime(latestRun.startedAt)}`;
  })();

  const lastRunIcon = latestRun?.status === "error"
    ? <Warning size={18} />
    : latestRun?.status === "success"
      ? <CheckCircle size={18} />
      : <ArrowsClockwise size={18} />;

  const lastRunOnClick = latestRun?.status === "error"
    ? () => navigate(`/runs/${latestRun.id}`, { state: { run: latestRun } })
    : undefined;

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <SettingsSection>
          <SettingsItem
            title={lastRunTitle}
            icon={lastRunIcon}
            onClick={lastRunOnClick}
            showChevron={latestRun?.status === "error"}
            error={latestRun?.status === "error"}
          />
          <SettingsItem
            title="Run history"
            icon={<Clock size={18} />}
            onClick={() => navigate("/runs")}
            showChevron={true}
          />
        </SettingsSection>
        <SettingsSection>
          <SettingsItem
            title={sources != null ? `${sources.length} source${sources.length !== 1 ? "s" : ""}` : "Sources"}
            icon={<ListBullets size={18} />}
            onClick={() => navigate("/sources")}
            showChevron={true}
          />
          <SettingsItem
            title="Full config"
            icon={<Code size={18} />}
            onClick={() => navigate("/config")}
            showChevron={true}
          />
          <SettingsItem
            title="UI components"
            icon={<Swatches size={18} />}
            onClick={() => navigate("/ui-components")}
            showChevron={true}
          />
        </SettingsSection>
        <SettingsSection>
          <SettingsItem
            title="History"
            icon={<Package size={18} />}
            onClick={() => navigate("/history")}
            showChevron={true}
          />
        </SettingsSection>
        <SettingsSection title="Access">
          {authStatus?.required === false ? (
            <SettingsItem
              title="No access key required"
              icon={<LockOpen size={18} />}
            />
          ) : authStatus?.required && hasKey ? (
            <>
              <SettingsItem
                title="Authorized with access key"
                icon={<CheckCircle size={18} />}
              />
              <SettingsItem
                title="Clear access key"
                icon={<Trash size={18} />}
                onClick={() => {
                  clearAccessKey();
                  authState.showAuthModal = true;
                  void queryClient.invalidateQueries();
                }}
              />
            </>
          ) : authStatus?.required && !hasKey ? (
            <SettingsItem
              title="Access key required"
              icon={<LockKey size={18} />}
              onClick={() => { authState.showAuthModal = true; }}
            />
          ) : null}
        </SettingsSection>
        <SettingsSection>
          <SettingsItem
            title="Add to home screen"
            icon={<Plus size={18} />}
            onClick={showAddToHomeScreenInstructions}
          />
          <SettingsItem
            title="Website"
            icon={<GlobeSimple size={18} />}
            href="https://openfeed-www.pages.dev"
            target="_blank"
          />
          <SettingsItem
            title="Documentation"
            icon={<BookOpen size={18} />}
            href="https://openfeed-docs.pages.dev"
            target="_blank"
          />
        </SettingsSection>
      </div>
      <footer className={styles.footer}>
        <span className={styles.copyright}>
          <Copyright />
        </span>
      </footer>
    </main>
  );
};

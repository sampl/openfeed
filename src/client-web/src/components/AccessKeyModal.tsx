import { useState } from "react";
import { useSnapshot } from "valtio";
import { useQueryClient } from "@tanstack/react-query";
import { LockKey } from "@phosphor-icons/react";
import { authState } from "../state/authState";
import { setAccessKey } from "../apiClient";

export const AccessKeyModal = () => {
  const snap = useSnapshot(authState);
  const queryClient = useQueryClient();
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!snap.showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    // Validate the key by hitting the auth status endpoint with the key
    const res = await fetch("/api/feeds", {
      headers: { Authorization: `Bearer ${trimmed}` },
    });

    setLoading(false);

    if (res.status === 401) {
      setError("Incorrect access key. Please try again.");
      return;
    }

    setAccessKey(trimmed);
    authState.showAuthModal = false;
    setKey("");
    await queryClient.invalidateQueries();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--background-primary)] p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[var(--text-tertiary)]">
            <LockKey size={20} />
          </span>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Access key required</h2>
        </div>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          This feed is protected. Enter your access key to continue.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            autoFocus
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Access key"
            className="mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--background-input)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] placeholder:text-[var(--text-tertiary)]"
          />
          {error && (
            <p className="mb-3 text-xs text-[var(--text-error)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full rounded-lg bg-[var(--button-primary-background)] px-4 py-2 text-sm font-medium text-[var(--background-primary)] transition-colors hover:bg-[var(--button-primary-background-hover)] disabled:opacity-50 disabled:cursor-default"
          >
            {loading ? "Verifying…" : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
};

import type { ReactNode } from "react";

export interface SettingsSectionProps {
  title?: string;
  children: ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div className="mb-6">
      {title && (
        <span className="block px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
          {title}
        </span>
      )}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--background-primary)] overflow-hidden divide-y divide-[var(--border)]">
        {children}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { CaretRightIcon, ArrowUpRightIcon } from "@phosphor-icons/react";

export interface SettingsItemProps {
  title: string;
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  target?: string;
  showChevron?: boolean;
  disabled?: boolean;
  badge?: number;
  error?: boolean;
}

const itemClasses =
  "flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--text-primary)] text-left transition-colors hover:bg-[var(--background-hover)] disabled:opacity-50 disabled:cursor-default cursor-pointer bg-transparent border-0";

export default function SettingsItem({
  title,
  icon,
  onClick,
  href,
  target,
  showChevron,
  disabled = false,
  badge,
  error = false,
}: SettingsItemProps) {
  const isExternalLink = target === "_blank";
  // Show chevron for internal links/hrefs by default; not for plain buttons or external links
  const shouldShowChevron = !isExternalLink && (showChevron ?? !!href);

  const content = (
    <>
      {icon && (
        <span className={`flex-shrink-0 ${error ? "text-[var(--text-error)]" : "text-[var(--text-tertiary)]"}`}>{icon}</span>
      )}
      <span className="flex-1">{title}</span>
      {isExternalLink && (
        <ArrowUpRightIcon size={16} className="flex-shrink-0 text-[var(--text-tertiary)]" />
      )}
      {badge != null && (
        <span className="flex-shrink-0 flex items-center justify-center h-5 min-w-5 rounded-full bg-[var(--background-error)] text-[var(--text-error)] text-xs font-medium px-1.5">
          {badge}
        </span>
      )}
      {shouldShowChevron && (
        <CaretRightIcon size={16} className="flex-shrink-0 text-[var(--text-tertiary)]" />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        className={`${itemClasses} no-underline`}
      >
        {content}
      </a>
    );
  }

  return (
    <button className={itemClasses} onClick={onClick} disabled={disabled}>
      {content}
    </button>
  );
}

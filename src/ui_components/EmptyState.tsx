import type { ReactNode } from "react";

type Size = "sm" | "md" | "lg";
type CtaStyle = "link" | "primary" | "secondary";

const sizeClasses: Record<Size, { wrapper: string; title: string; description: string }> = {
  sm: {
    wrapper: "gap-2 py-8",
    title: "text-sm font-medium",
    description: "text-xs",
  },
  md: {
    wrapper: "gap-3 py-12",
    title: "text-base font-medium",
    description: "text-sm",
  },
  lg: {
    wrapper: "gap-4 py-16",
    title: "text-lg font-semibold",
    description: "text-base",
  },
};

function getButtonClass(ctaStyle: CtaStyle, size: Size): string {
  if (ctaStyle === "link") {
    return "text-[var(--text-secondary)] underline text-sm cursor-pointer bg-transparent border-0 p-0";
  }

  const base = "inline-flex items-center gap-2 rounded border font-medium cursor-pointer transition-colors";
  const sizeClass = size === "lg" ? "px-6 py-3 text-base" : size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm";

  if (ctaStyle === "primary") {
    return `${base} ${sizeClass} bg-[var(--button-primary-background)] text-white border-transparent hover:bg-[var(--button-primary-background-hover)]`;
  }

  return `${base} ${sizeClass} bg-[var(--background-input)] text-[var(--text-primary)] border-[var(--border)] shadow-sm hover:border-[var(--border-hover)]`;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaText,
  ctaOnClick,
  ctaIcon,
  ctaStyle = "link",
  secondaryCtaText,
  secondaryCtaOnClick,
  secondaryCtaIcon,
  secondaryCtaStyle = "secondary",
  size = "md",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaText?: string;
  ctaOnClick?: () => void;
  ctaIcon?: ReactNode;
  ctaStyle?: CtaStyle;
  secondaryCtaText?: string;
  secondaryCtaOnClick?: () => void;
  secondaryCtaIcon?: ReactNode;
  secondaryCtaStyle?: CtaStyle;
  size?: Size;
}) {
  const sizes = sizeClasses[size];
  const hasPrimaryCta = Boolean(ctaText && ctaOnClick);
  const hasSecondaryCta = Boolean(secondaryCtaText && secondaryCtaOnClick);

  return (
    <div className={`flex flex-col items-center text-center ${sizes.wrapper}`}>
      {icon && (
        <div className="text-[var(--text-tertiary)]">{icon}</div>
      )}
      <h3 className={`${sizes.title} text-[var(--text-primary)] m-0`}>
        {title || "Nothing here yet"}
      </h3>
      {description && (
        <p className={`${sizes.description} text-[var(--text-tertiary)] m-0`}>
          {description}
        </p>
      )}
      {(hasPrimaryCta || hasSecondaryCta) && (
        <div className="flex gap-2 flex-wrap justify-center mt-1">
          {hasPrimaryCta && (
            <button className={getButtonClass(ctaStyle, size)} onClick={ctaOnClick}>
              {ctaText}
              {ctaIcon}
            </button>
          )}
          {hasSecondaryCta && (
            <button className={getButtonClass(secondaryCtaStyle, size)} onClick={secondaryCtaOnClick}>
              {secondaryCtaText}
              {secondaryCtaIcon}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

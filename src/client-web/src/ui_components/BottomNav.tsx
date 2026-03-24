import React from "react";

export interface BottomNavItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  badge?: boolean;
}

export interface BottomNavProps {
  items: BottomNavItem[];
}

export default function BottomNav({ items }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-[var(--border)] bg-[var(--background-primary)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={[
            "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 px-1 cursor-pointer bg-transparent border-0 text-xs font-medium transition-colors",
            item.active
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)]",
          ].join(" ")}
          onClick={item.onClick}
          aria-label={item.label}
          aria-current={item.active ? "page" : undefined}
        >
          <span className="relative">
            {item.active
              ? React.cloneElement(item.icon as React.ReactElement, { weight: "fill" })
              : item.icon}
            {item.badge && (
              <span
                className="absolute -top-0.5 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-[var(--text-error)] text-white text-[8px] font-bold leading-none"
                aria-hidden="true"
              />
            )}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

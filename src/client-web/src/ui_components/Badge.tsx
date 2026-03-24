type Emphasis =
  | "primary"
  | "secondary"
  | "tertiary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

const emphasisClasses: Record<Emphasis, string> = {
  primary: "bg-[var(--background-info)] text-[var(--text-info)]",
  secondary: "bg-[var(--background-secondary)] text-[var(--text-secondary)]",
  tertiary: "bg-[var(--background-secondary)] text-[var(--text-tertiary)]",
  success: "bg-[var(--background-success)] text-[var(--text-success)]",
  warning: "bg-[var(--background-warning)] text-[var(--text-warning)]",
  error: "bg-[var(--background-error)] text-[var(--text-error)]",
  info: "bg-[var(--background-info)] text-[var(--text-info)]",
  neutral: "bg-[var(--background-secondary)] text-[var(--text-tertiary)]",
};

export default function Badge({
  children,
  style,
  emphasis,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  emphasis?: Emphasis;
}) {
  const emphasisClass = emphasis ? emphasisClasses[emphasis] : emphasisClasses.secondary;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${emphasisClass}`}
      style={style}
    >
      {children}
    </span>
  );
}

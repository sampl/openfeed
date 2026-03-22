type Emphasis = "info" | "success" | "warning" | "error";
type Padding = "sm" | "md" | "lg";

const emphasisClasses: Record<Emphasis, string> = {
  info: "bg-[var(--background-info)] text-[var(--text-info)]",
  success: "bg-[var(--background-success)] text-[var(--text-success)]",
  warning: "bg-[var(--background-warning)] text-[var(--text-warning)]",
  error: "bg-[var(--background-error)] text-[var(--text-error)]",
};

const paddingClasses: Record<Padding, string> = {
  sm: "px-3 py-2",
  md: "px-4 py-3",
  lg: "px-6 py-4",
};

export default function Banner({
  children,
  style,
  padding = "md",
  emphasis,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: Padding;
  emphasis?: Emphasis;
}) {
  const emphasisClass = emphasis
    ? emphasisClasses[emphasis]
    : "bg-[var(--background-secondary)] text-[var(--text-secondary)]";

  return (
    <div
      className={`rounded text-sm ${paddingClasses[padding]} ${emphasisClass}`}
      style={style}
    >
      {children}
    </div>
  );
}

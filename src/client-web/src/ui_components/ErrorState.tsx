type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, { wrapper: string; title: string; message: string; button: string }> = {
  sm: {
    wrapper: "gap-2 py-8",
    title: "text-sm font-medium",
    message: "text-xs",
    button: "px-3 py-1 text-xs",
  },
  md: {
    wrapper: "gap-3 py-12",
    title: "text-base font-medium",
    message: "text-sm",
    button: "px-4 py-2 text-sm",
  },
  lg: {
    wrapper: "gap-4 py-16",
    title: "text-lg font-semibold",
    message: "text-base",
    button: "px-6 py-3 text-base",
  },
};

export default function ErrorState({
  error,
  size = "md",
}: {
  error: Error;
  size?: Size;
}) {
  // Log for debugging; no error tracking service in this project yet
  console.error(error);

  const sizes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center text-center ${sizes.wrapper}`}>
      <h3 className={`${sizes.title} text-[var(--text-primary)] m-0`}>
        Sorry, something went wrong
      </h3>
      <p className={`${sizes.message} text-[var(--text-tertiary)] m-0`}>
        {error.message || "Unknown error"}
      </p>
      <a
        className={`inline-flex items-center rounded border border-[var(--border)] bg-[var(--background-input)] text-[var(--text-primary)] font-medium shadow-sm hover:border-[var(--border-hover)] transition-colors no-underline ${sizes.button}`}
        href="https://sampiercelolla.com/contact"
        target="_blank"
        rel="noopener noreferrer"
      >
        Get help
      </a>
    </div>
  );
}

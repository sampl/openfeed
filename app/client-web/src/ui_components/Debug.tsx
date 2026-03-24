import { useEffect, useState } from "react";

// Minimal debug panel for development. In production this renders nothing.
// Toggle by triple-clicking the copyright year in the settings page footer.
export default function Debug({ persistenceId }: { persistenceId?: string }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (import.meta.env.PROD) return;

    const observer = new MutationObserver(() => {
      setIsVisible(document.body.dataset.debug === "true");
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ["data-debug"] });
    return () => observer.disconnect();
  }, []);

  if (import.meta.env.PROD || !isVisible) return null;

  return (
    <div
      data-debug-panel={persistenceId}
      style={{
        position: "fixed",
        bottom: "5rem",
        right: "0.75rem",
        zIndex: 50,
        borderRadius: "0.25rem",
        background: "rgba(0,0,0,0.8)",
        padding: "0.25rem 0.75rem",
        fontSize: "0.75rem",
        color: "white",
        fontFamily: "monospace",
      }}
    >
      debug: {persistenceId}
    </div>
  );
}

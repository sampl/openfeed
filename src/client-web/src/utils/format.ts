// Date only: "Jan 1, 2025"
export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Date and time: "Jan 1, 2025, 10:30 AM"
export const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Date and time with seconds: "Jan 1, 2025, 10:30:45 AM"
export const formatDateTimeDetailed = (iso: string): string => {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// Relative date: "23m ago", "2h ago", "9a today", "yesterday", or "Jan 1, 2025"
export const formatRelativeDate = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  if (d >= todayStart) {
    if (diffHours < 6) return `${diffHours}h ago`;
    const hour = d.getHours();
    const ampm = hour < 12 ? "a" : "p";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}${ampm} today`;
  }

  if (d >= yesterdayStart) return "yesterday";

  return formatDate(d);
};

// Domain extraction: "example.com" from "https://www.example.com/path"
export const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

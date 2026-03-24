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

// Domain extraction: "example.com" from "https://www.example.com/path"
export const getDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const resolveDbPathArg = (args: string[]): string => {
  const dbArgIndex = args.indexOf("--db");

  if (dbArgIndex < 0) {
    return "open-feed.db";
  }

  return args[dbArgIndex + 1] ?? "open-feed.db";
};

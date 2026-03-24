export const resolveDbPathArg = (args: string[]): string => {
  const dbArgIndex = args.indexOf("--db");

  if (dbArgIndex < 0) {
    return "openfeed.db";
  }

  return args[dbArgIndex + 1] ?? "openfeed.db";
};

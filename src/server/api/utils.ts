import type { Request } from "express";

interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Parses `limit` and `offset` query parameters from an Express request,
 * applying defaults and clamping to safe bounds.
 */
export const parsePagination = (
  req: Request,
  { defaultLimit = 30, maxLimit = 100 }: PaginationOptions = {},
): { limit: number; offset: number } => {
  const limitParam = parseInt(String(req.query.limit ?? ""), 10);
  const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, maxLimit) : defaultLimit;

  const offsetParam = parseInt(String(req.query.offset ?? ""), 10);
  const offset = !isNaN(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

  return { limit, offset };
};

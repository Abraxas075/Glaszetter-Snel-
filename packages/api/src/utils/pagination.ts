import type { PaginationParams } from '@glaszetter/shared';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const parsePagination = (query: Record<string, unknown>): PaginationParams => {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT)
  );
  return { page, limit };
};

import { PaginationResult } from '../types/type';

export const getPagination = (query: { page?: string; limit?: string }) => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '12', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildPaginationResult = (
  total: number,
  page: number,
  limit: number
): PaginationResult => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
});

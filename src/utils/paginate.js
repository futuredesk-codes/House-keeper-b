// Shared skip/limit pagination helpers for list endpoints.
export function parsePagination(query = {}, { defaultLimit = 20, maxLimit = 100 } = {}) {
  let page = parseInt(query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  let limit = parseInt(query.limit, 10);
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit };
}

export function buildPageMeta({ page, limit, total }) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) || 0 };
}

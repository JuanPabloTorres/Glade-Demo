import { apiClient } from "../api/apiClient";

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function toQueryString(query?: PaginationQuery) {
  if (!query) return "";
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortDirection) params.set("sortDirection", query.sortDirection);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export function createCrudService<TEntity, TCreate, TUpdate>(resourcePath: string) {
  return {
    getById(id: string) {
      return apiClient.get<TEntity>(`${resourcePath}/${encodeURIComponent(id)}`);
    },
    getPaged(query?: PaginationQuery) {
      return apiClient.get<PagedResult<TEntity>>(`${resourcePath}${toQueryString(query)}`);
    },
    create(payload: TCreate) {
      return apiClient.post<TEntity, TCreate>(resourcePath, payload);
    },
    update(id: string, payload: TUpdate) {
      return apiClient.put<TEntity, TUpdate>(`${resourcePath}/${encodeURIComponent(id)}`, payload);
    },
    remove(id: string) {
      return apiClient.delete<void>(`${resourcePath}/${encodeURIComponent(id)}`);
    },
  };
}

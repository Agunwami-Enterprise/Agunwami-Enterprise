/**
 * backend/core/types.ts
 *
 * Base types and query definitions for Firestore operations and API contracts.
 */

export type FirestoreDoc = Record<string, any> & {
  _id: string;
  _createTime?: string;
  _updateTime?: string;
};

export type FilterOp =
  | 'EQUAL'
  | 'NOT_EQUAL'
  | 'LESS_THAN'
  | 'LESS_THAN_OR_EQUAL'
  | 'GREATER_THAN'
  | 'GREATER_THAN_OR_EQUAL'
  | 'ARRAY_CONTAINS';

export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: string | number | boolean;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  orderByField?: string;
  orderDirection?: 'ASCENDING' | 'DESCENDING';
  limit?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    timestamp?: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApiError {
  detail: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

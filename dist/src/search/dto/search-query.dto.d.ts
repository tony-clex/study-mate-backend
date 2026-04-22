export declare class SearchQueryDto {
  query: string;
  match_threshold?: number;
  match_count?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  file_type?: string;
  include_history?: string;
}

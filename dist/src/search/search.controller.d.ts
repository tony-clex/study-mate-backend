import type { Response } from 'express';
import {
  SearchService,
  SearchResult,
  SearchHistoryItem,
  SearchCompanionResponse,
} from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchCompanionMessageDto } from './dto/search-companion-message.dto';
interface AuthRequest {
  user: {
    id: string;
  };
  userId?: string;
}
interface PaginatedSearchResult {
  results: SearchResult[];
  pagination: {
    offset: number;
    match_count: number;
    has_more: boolean;
  };
}
interface SearchHistoryResponse {
  history: SearchHistoryItem[];
}
interface ReindexResponse {
  total_documents: number;
  processed_documents: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: {
    document_id: string;
    file_name: string;
    chunk_count: number;
    success: boolean;
    message?: string;
  }[];
}
type SearchCompanionMessageResponse = SearchCompanionResponse;
export declare class SearchController {
  private readonly searchService;
  constructor(searchService: SearchService);
  searchNotes(
    req: AuthRequest,
    searchDto: SearchQueryDto,
  ): Promise<PaginatedSearchResult>;
  companionMessage(
    req: AuthRequest,
    body: SearchCompanionMessageDto,
  ): Promise<SearchCompanionMessageResponse>;
  streamSearch(
    req: AuthRequest,
    searchDto: SearchQueryDto,
    res: Response,
  ): Promise<void>;
  getSearchHistory(
    req: AuthRequest,
    limit?: string,
  ): Promise<SearchHistoryResponse>;
  getUserDocuments(req: AuthRequest): Promise<
    {
      id: string;
      file_name: string;
      file_url: string;
      file_type: string;
      file_size: number;
      created_at: string;
    }[]
  >;
  getDocumentById(
    req: AuthRequest,
    documentId: string,
  ): Promise<{
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    created_at: string;
  }>;
  getDocumentChunks(
    req: AuthRequest,
    documentId: string,
  ): Promise<{
    chunks: {
      content: string;
    }[];
  }>;
  reindexDocument(
    req: AuthRequest,
    body: {
      document_id?: string;
    },
  ): Promise<ReindexResponse>;
  reindexAllDocuments(): Promise<ReindexResponse>;
}
export {};

import { AiService } from '../ai/ai.service';
import { ProcessingService } from '../documents/processing.service';
export interface SearchFilters {
  date_from?: string;
  date_to?: string;
  file_type?: string;
}
interface DocumentRow {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}
export interface ReindexResult {
  document_id: string;
  file_name: string;
  chunk_count: number;
  success: boolean;
  message?: string;
}
export interface ReindexSummary {
  total_documents: number;
  processed_documents: number;
  succeeded: number;
  failed: number;
  skipped: number;
  results: ReindexResult[];
}
export interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  uploader_name?: string;
  title?: string;
  file_name?: string;
  file_url?: string;
  file_type?: string;
  created_at?: string;
  documents?: {
    id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    created_at: string;
  };
}
export interface SearchHistoryItem {
  id: string;
  user_id: string;
  query: string;
  result_count: number;
  match_threshold: number;
  created_at: string;
}
export interface SearchCompanionDocument {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}
export interface SearchCompanionResponse {
  answer: string;
  document: SearchCompanionDocument;
  context_source: 'extracted_text' | 'metadata_only';
}
export declare class SearchService {
  private readonly aiService;
  private readonly processingService;
  private readonly logger;
  private readonly embeddingCache;
  private readonly CACHE_TTL_MS;
  private readonly MAX_CACHE_SIZE;
  constructor(aiService: AiService, processingService: ProcessingService);
  private getCacheKey;
  private cleanExpiredCache;
  private getCachedEmbedding;
  private cacheEmbedding;
  private normalizeSearchTerms;
  private escapeIlike;
  private fetchDocumentMetadata;
  getDocumentById(
    userId: string,
    documentId: string,
  ): Promise<DocumentRow | null>;
  getDocumentChunks(
    userId: string,
    documentId: string,
  ): Promise<
    {
      content: string;
    }[]
  >;
  private getOwnedDocumentById;
  private buildCompanionContext;
  private getDocumentsWithChunkIds;
  private buildChunkRows;
  reindexDocument(userId: string, documentId: string): Promise<ReindexResult>;
  reindexAllDocuments(userId?: string): Promise<ReindexSummary>;
  private runKeywordFallbackSearch;
  private getSearchResults;
  saveSearchHistory(
    userId: string,
    query: string,
    resultCount: number,
    matchThreshold: number,
  ): Promise<void>;
  getSearchHistory(
    userId: string,
    limit?: number,
  ): Promise<SearchHistoryItem[]>;
  streamSearchNotes(
    userId: string,
    query: string,
    matchThreshold?: number,
    matchCount?: number,
    offset?: number,
    filters?: SearchFilters,
  ): AsyncGenerator<SearchResult, void, unknown>;
  searchNotes(
    userId: string,
    query: string,
    matchThreshold?: number,
    matchCount?: number,
    offset?: number,
    filters?: SearchFilters,
  ): Promise<SearchResult[]>;
  getUserDocuments(userId: string): Promise<
    {
      id: string;
      file_name: string;
      file_url: string;
      file_type: string;
      file_size: number;
      created_at: string;
    }[]
  >;
  askCompanionAboutDocument(
    userId: string,
    documentId: string,
    question: string,
    history?: any[],
  ): Promise<SearchCompanionResponse>;
}
export {};

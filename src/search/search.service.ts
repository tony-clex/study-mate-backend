import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
import { AiService } from '../ai/ai.service';

export interface SearchFilters {
  date_from?: string;
  date_to?: string;
  file_type?: string;
}

interface DocumentMetadata {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

interface SearchChunkRow {
  id: string;
  document_id: string;
  user_id: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at?: string;
}

interface SearchRpcRow {
  id: string;
  document_id: string;
  user_id: string;
  uploader_name?: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
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

interface EmbeddingCacheEntry {
  embedding: number[];
  timestamp: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly embeddingCache = new Map<string, EmbeddingCacheEntry>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  private readonly MAX_CACHE_SIZE = 500;

  constructor(private readonly aiService: AiService) {}

  private getCacheKey(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.embeddingCache) {
      if (now - entry.timestamp > this.CACHE_TTL_MS) {
        this.embeddingCache.delete(key);
      }
    }
    if (this.embeddingCache.size > this.MAX_CACHE_SIZE) {
      const entries = [...this.embeddingCache.entries()];
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));
      for (const [key] of toRemove) {
        this.embeddingCache.delete(key);
      }
    }
  }

  private getCachedEmbedding(text: string): number[] | null {
    const key = this.getCacheKey(text);
    const entry = this.embeddingCache.get(key);
    if (entry && Date.now() - entry.timestamp <= this.CACHE_TTL_MS) {
      this.logger.log(
        `[Search] Cache hit for embedding: "${text.slice(0, 30)}..."`,
      );
      return entry.embedding;
    }
    return null;
  }

  private cacheEmbedding(text: string, embedding: number[]): void {
    this.cleanExpiredCache();
    const key = this.getCacheKey(text);
    this.embeddingCache.set(key, { embedding, timestamp: Date.now() });
  }

  private normalizeSearchTerms(query: string): string[] {
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2);

    return [...new Set(terms)].slice(0, 6);
  }

  private escapeIlike(term: string): string {
    return term
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }

  private async fetchDocumentMetadata(
    documentIds: string[],
    filters?: SearchFilters,
  ): Promise<Map<string, DocumentMetadata>> {
    if (documentIds.length === 0) {
      return new Map();
    }

    let queryBuilder = supabaseAdmin
      .from('documents')
      .select('id, file_name, file_url, file_type, created_at')
      .in('id', documentIds);

    if (filters?.date_from) {
      queryBuilder = queryBuilder.gte('created_at', filters.date_from);
    }
    if (filters?.date_to) {
      queryBuilder = queryBuilder.lte('created_at', filters.date_to);
    }
    if (filters?.file_type) {
      queryBuilder = queryBuilder.eq('file_type', filters.file_type);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      this.logger.warn(
        `[Search] Could not fetch document metadata: ${error.message}`,
      );
      return new Map();
    }

    return new Map((data || []).map((document) => [document.id, document]));
  }

  private async runKeywordFallbackSearch(
    query: string,
    matchCount: number,
    offset: number,
    filters?: SearchFilters,
  ): Promise<SearchResult[]> {
    const terms = this.normalizeSearchTerms(query);
    const patterns = (terms.length > 0 ? terms : [query.trim()])
      .filter(Boolean)
      .map((term) => `%${this.escapeIlike(term)}%`);

    if (patterns.length === 0) {
      return [];
    }

    const chunkResponses = await Promise.all(
      patterns.map((pattern) =>
        supabaseAdmin
          .from('document_chunks')
          .select('id, document_id, user_id, content, metadata, created_at')
          .ilike('content', pattern)
          .order('created_at', { ascending: false })
          .limit(matchCount * 5),
      ),
    );

    const chunkRows = chunkResponses
      .flatMap(({ data }) => data || [])
      .filter(
        (row, index, rows) =>
          rows.findIndex((candidate) => candidate.id === row.id) === index,
      ) as SearchChunkRow[];

    if (chunkRows.length === 0) {
      const documentResponses = await Promise.all(
        patterns.map((pattern) =>
          supabaseAdmin
            .from('documents')
            .select('id, file_name, file_url, file_type, created_at')
            .ilike('file_name', pattern)
            .order('created_at', { ascending: false })
            .limit(matchCount * 5),
        ),
      );

      const matchedDocuments = documentResponses
        .flatMap(({ data }) => data || [])
        .filter(
          (row, index, rows) =>
            rows.findIndex((candidate) => candidate.id === row.id) === index,
        ) as DocumentMetadata[];

      const documentIds = matchedDocuments.map((document) => document.id);
      const { data: fallbackChunks } = await supabaseAdmin
        .from('document_chunks')
        .select('id, document_id, user_id, content, metadata, created_at')
        .in('document_id', documentIds)
        .order('created_at', { ascending: false })
        .limit(matchCount * 5);

      const fallbackChunkRows = (fallbackChunks || []) as SearchChunkRow[];
      const docMap = await this.fetchDocumentMetadata(documentIds, filters);
      return fallbackChunkRows
        .slice(offset, offset + matchCount)
        .filter((row) => docMap.has(row.document_id))
        .map((row) => {
          const document = docMap.get(row.document_id);
          return {
            id: row.id,
            document_id: row.document_id,
            user_id: row.user_id,
            content: row.content,
            metadata: row.metadata,
            similarity: 0,
            title: document?.file_name ?? 'Untitled',
            file_name: document?.file_name ?? undefined,
            file_url: document?.file_url ?? undefined,
            file_type: document?.file_type ?? undefined,
            created_at: document?.created_at ?? undefined,
            documents: document,
          };
        });
    }

    const paginatedChunks = chunkRows.slice(offset, offset + matchCount);
    const documentIds = [
      ...new Set(paginatedChunks.map((row) => row.document_id)),
    ];
    const docMap = await this.fetchDocumentMetadata(documentIds, filters);

    return paginatedChunks
      .filter((row) => docMap.has(row.document_id))
      .map((row) => {
        const document = docMap.get(row.document_id);
        return {
          id: row.id,
          document_id: row.document_id,
          user_id: row.user_id,
          content: row.content,
          metadata: row.metadata,
          similarity: 0,
          title: document?.file_name ?? 'Untitled',
          file_name: document?.file_name ?? undefined,
          file_url: document?.file_url ?? undefined,
          file_type: document?.file_type ?? undefined,
          created_at: document?.created_at ?? undefined,
          documents: document,
        };
      });
  }

  private async getSearchResults(
    userId: string,
    query: string,
    matchThreshold: number,
    matchCount: number,
    offset: number,
    filters?: SearchFilters,
  ): Promise<SearchResult[]> {
    let embedding = this.getCachedEmbedding(query);
    if (!embedding) {
      embedding = await this.aiService.getEmbedding(query);
      this.cacheEmbedding(query, embedding);
    }

    const fetchCount = offset + matchCount;
    const rpcResponse = (await supabaseAdmin.rpc(
      'match_document_chunks_for_user',
      {
        query_embedding: embedding,
        requesting_user_id: userId,
        filter_document_id: null,
        match_threshold: matchThreshold,
        match_count: fetchCount,
      },
    )) as {
      data: SearchRpcRow[] | null;
      error: { message: string } | null;
    };

    const { data: results, error } = rpcResponse;

    if (error) {
      this.logger.warn(
        `[Search] RPC search failed, using fallback: ${error.message}`,
      );
      return this.runKeywordFallbackSearch(query, matchCount, offset, filters);
    }

    const rpcResults = results ?? [];
    if (rpcResults.length === 0) {
      this.logger.log(
        `[Search] No vector results found for query: "${query}". Falling back to keyword search.`,
      );
      return this.runKeywordFallbackSearch(query, matchCount, offset, filters);
    }

    const paginatedResults = rpcResults.slice(offset, offset + matchCount);
    const documentIds = [
      ...new Set(paginatedResults.map((r) => r.document_id)),
    ];
    const docMap = await this.fetchDocumentMetadata(documentIds, filters);

    const enrichedResults = paginatedResults
      .filter((result) => docMap.has(result.document_id))
      .map((result: SearchRpcRow) => {
        const document = docMap.get(result.document_id);
        return {
          ...result,
          title: document?.file_name ?? 'Untitled',
          file_name: document?.file_name ?? undefined,
          file_url: document?.file_url ?? undefined,
          file_type: document?.file_type ?? undefined,
          created_at: document?.created_at ?? undefined,
          documents: document,
        };
      });

    if (enrichedResults.length === 0) {
      this.logger.log(
        `[Search] Vector results were filtered out for query: "${query}". Falling back to keyword search.`,
      );
      return this.runKeywordFallbackSearch(query, matchCount, offset, filters);
    }

    return enrichedResults;
  }

  async saveSearchHistory(
    userId: string,
    query: string,
    resultCount: number,
    matchThreshold: number,
  ): Promise<void> {
    try {
      await supabaseAdmin.from('search_history').insert({
        user_id: userId,
        query,
        result_count: resultCount,
        match_threshold: matchThreshold,
      });
    } catch (error) {
      this.logger.warn(`[Search] Failed to save search history: ${error}`);
    }
  }

  async getSearchHistory(
    userId: string,
    limit: number = 10,
  ): Promise<SearchHistoryItem[]> {
    const { data, error } = await supabaseAdmin
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.warn(`[Search] Failed to fetch search history: ${error}`);
      return [];
    }

    return (data || []) as SearchHistoryItem[];
  }

  async *streamSearchNotes(
    userId: string,
    query: string,
    matchThreshold: number = 0.3,
    matchCount: number = 5,
    offset: number = 0,
    filters?: SearchFilters,
  ): AsyncGenerator<SearchResult, void, unknown> {
    this.logger.log(
      `[Search] Stream searching notes for user: ${userId}, query: "${query}"`,
    );
    const results = await this.getSearchResults(
      userId,
      query,
      matchThreshold,
      matchCount,
      offset,
      filters,
    );

    if (!results || results.length === 0) {
      this.logger.log(`[Search] No stream results found for query: "${query}"`);
      return;
    }

    for (const result of results) {
      yield result;
    }

    void this.saveSearchHistory(userId, query, results.length, matchThreshold);
  }

  async searchNotes(
    userId: string,
    query: string,
    matchThreshold: number = 0.3,
    matchCount: number = 5,
    offset: number = 0,
    filters?: SearchFilters,
  ): Promise<SearchResult[]> {
    try {
      this.logger.log(
        `[Search] Searching notes for user: ${userId}, query: "${query}" (offset: ${offset}, threshold: ${matchThreshold})`,
      );
      const enrichedResults = await this.getSearchResults(
        userId,
        query,
        matchThreshold,
        matchCount,
        offset,
        filters,
      );

      this.logger.log(
        `[Search] Found ${enrichedResults.length} results for query: "${query}"`,
      );

      return enrichedResults;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[Search] Search error: ${message}`);
      throw new InternalServerErrorException(`Search failed: ${message}`);
    }
  }

  async getUserDocuments(userId: string): Promise<
    {
      id: string;
      file_name: string;
      file_url: string;
      file_type: string;
      file_size: number;
      created_at: string;
    }[]
  > {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('id, file_name, file_url, file_type, file_size, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to fetch documents: ${error.message}`,
      );
    }

    return data || [];
  }
}

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

  private async getCachedEmbedding(text: string): Promise<number[] | null> {
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

  private async cacheEmbedding(
    text: string,
    embedding: number[],
  ): Promise<void> {
    this.cleanExpiredCache();
    const key = this.getCacheKey(text);
    this.embeddingCache.set(key, { embedding, timestamp: Date.now() });
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

    let embedding = await this.getCachedEmbedding(query);
    if (!embedding) {
      embedding = await this.aiService.getEmbedding(query);
      await this.cacheEmbedding(query, embedding);
    }

    const fetchCount = offset + matchCount;
    const { data: results, error } = await supabaseAdmin.rpc(
      'match_document_chunks_for_user',
      {
        query_embedding: embedding,
        requesting_user_id: userId,
        filter_document_id: null,
        match_threshold: matchThreshold,
        match_count: fetchCount,
      },
    );

    if (error) {
      this.logger.error(`[Search] Stream RPC error: ${error.message}`);
      throw new InternalServerErrorException(`Search failed: ${error.message}`);
    }

    if (!results || results.length === 0) {
      this.logger.log(`[Search] No stream results found for query: "${query}"`);
      return;
    }

    const paginatedResults = results.slice(offset, offset + matchCount);
    const documentIds = [
      ...new Set(paginatedResults.map((r: SearchResult) => r.document_id)),
    ];

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

    const { data: documents } = await queryBuilder;
    const docMap = new Map(documents?.map((d) => [d.id, d]) || []);

    for (const result of paginatedResults) {
      const document = docMap.get(result.document_id) || null;
      const enriched = {
        ...result,
        title: document?.file_name ?? 'Untitled',
        file_name: document?.file_name ?? undefined,
        file_url: document?.file_url ?? undefined,
        file_type: document?.file_type ?? undefined,
        created_at: document?.created_at ?? undefined,
        documents: document,
      };
      yield enriched;
    }

    this.saveSearchHistory(
      userId,
      query,
      paginatedResults.length,
      matchThreshold,
    );
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

      let embedding = await this.getCachedEmbedding(query);
      if (!embedding) {
        embedding = await this.aiService.getEmbedding(query);
        await this.cacheEmbedding(query, embedding);
      }

      const fetchCount = offset + matchCount;
      const { data: results, error } = await supabaseAdmin.rpc(
        'match_document_chunks_for_user',
        {
          query_embedding: embedding,
          requesting_user_id: userId,
          filter_document_id: null,
          match_threshold: matchThreshold,
          match_count: fetchCount,
        },
      );

      if (error) {
        this.logger.error(`[Search] RPC error: ${error.message}`);
        throw new InternalServerErrorException(
          `Search failed: ${error.message}`,
        );
      }

      if (!results || results.length === 0) {
        this.logger.log(`[Search] No results found for query: "${query}"`);
        return [];
      }

      const paginatedResults = results.slice(offset, offset + matchCount);
      if (paginatedResults.length === 0) {
        return [];
      }

      const documentIds = [
        ...new Set(paginatedResults.map((r: SearchResult) => r.document_id)),
      ];

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

      const { data: documents, error: docError } = await queryBuilder;

      if (docError) {
        this.logger.warn(
          `[Search] Could not fetch document metadata: ${docError.message}`,
        );
      }

      const docMap = new Map(documents?.map((d) => [d.id, d]) || []);

      const enrichedResults = paginatedResults.map((result: SearchResult) => ({
        ...result,
        title: docMap.get(result.document_id)?.file_name ?? 'Untitled',
        file_name: docMap.get(result.document_id)?.file_name ?? undefined,
        file_url: docMap.get(result.document_id)?.file_url ?? undefined,
        file_type: docMap.get(result.document_id)?.file_type ?? undefined,
        created_at: docMap.get(result.document_id)?.created_at ?? undefined,
        documents: docMap.get(result.document_id) || null,
      }));

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

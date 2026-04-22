'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var SearchService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.SearchService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
const ai_service_1 = require('../ai/ai.service');
const processing_service_1 = require('../documents/processing.service');
let SearchService = (SearchService_1 = class SearchService {
  aiService;
  processingService;
  logger = new common_1.Logger(SearchService_1.name);
  embeddingCache = new Map();
  CACHE_TTL_MS = 24 * 60 * 60 * 1000;
  MAX_CACHE_SIZE = 500;
  constructor(aiService, processingService) {
    this.aiService = aiService;
    this.processingService = processingService;
  }
  getCacheKey(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  cleanExpiredCache() {
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
  getCachedEmbedding(text) {
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
  cacheEmbedding(text, embedding) {
    this.cleanExpiredCache();
    const key = this.getCacheKey(text);
    this.embeddingCache.set(key, { embedding, timestamp: Date.now() });
  }
  normalizeSearchTerms(query) {
    const terms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map((term) => term.trim())
      .filter((term) => term.length > 2);
    return [...new Set(terms)].slice(0, 6);
  }
  escapeIlike(term) {
    return term
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_');
  }
  async fetchDocumentMetadata(documentIds, filters) {
    if (documentIds.length === 0) {
      return new Map();
    }
    let queryBuilder = supabase_client_1.supabaseAdmin
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
  async getDocumentById(userId, documentId) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('documents')
      .select(
        'id, user_id, file_name, file_url, file_type, file_size, created_at',
      )
      .eq('user_id', userId)
      .eq('id', documentId)
      .maybeSingle();
    if (error) {
      throw new common_1.InternalServerErrorException(
        `Failed to fetch document: ${error.message}`,
      );
    }
    return data ?? null;
  }
  async getDocumentChunks(userId, documentId) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('document_chunks')
      .select('content')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .order('metadata->chunk_index', { ascending: true });
    if (error) {
      throw new common_1.InternalServerErrorException(
        `Failed to fetch document chunks: ${error.message}`,
      );
    }
    return data ?? [];
  }
  async getOwnedDocumentById(userId, documentId) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('documents')
      .select(
        'id, user_id, file_name, file_url, file_type, file_size, created_at',
      )
      .eq('id', documentId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      throw new common_1.InternalServerErrorException(
        `Failed to fetch document: ${error.message}`,
      );
    }
    return data ?? null;
  }
  buildCompanionContext(document, extractedText) {
    const cleanedText = extractedText?.trim();
    if (cleanedText) {
      return `Selected document:
File name: ${document.file_name}
File type: ${document.file_type}
Document ID: ${document.id}

Use the study text below as the primary source of truth.

Study text:
${cleanedText}`;
    }
    return `Selected document:
File name: ${document.file_name}
File type: ${document.file_type}
Document ID: ${document.id}

No readable study text could be extracted from this file yet. Use the document metadata only and be transparent about the limitation.`;
  }
  async getDocumentsWithChunkIds(userId) {
    let query = supabase_client_1.supabaseAdmin
      .from('document_chunks')
      .select('document_id');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) {
      throw new common_1.InternalServerErrorException(
        `Failed to inspect indexed documents: ${error.message}`,
      );
    }
    const rows = data || [];
    return new Set(rows.map((row) => row.document_id));
  }
  async buildChunkRows(document, rawText) {
    const chunks = this.processingService
      .splitTextIntoChunks(rawText)
      .filter((chunk) => this.processingService.isUsableStudyChunk(chunk));
    if (chunks.length === 0) {
      return [];
    }
    return Promise.all(
      chunks.map(async (content, index) => {
        let embedding = null;
        try {
          embedding = await this.aiService.getEmbedding(content);
        } catch (embeddingError) {
          const message =
            embeddingError instanceof Error
              ? embeddingError.message
              : 'Unknown error';
          this.logger.warn(
            `[Search] Embedding failed while reindexing ${document.id} chunk ${index}: ${message}. Storing text without embedding.`,
          );
        }
        return {
          document_id: document.id,
          user_id: document.user_id,
          content,
          embedding,
          metadata: {
            chunk_index: index,
            original_name: document.file_name,
            reindexed: true,
          },
        };
      }),
    );
  }
  async reindexDocument(userId, documentId) {
    const document = await this.getDocumentById(userId, documentId);
    if (!document) {
      throw new common_1.BadRequestException('Document not found');
    }
    try {
      const rawText =
        await this.processingService.extractTextForQuestionAnswering(
          document.file_url,
          document.file_type,
        );
      const chunkRows = await this.buildChunkRows(document, rawText);
      if (chunkRows.length === 0) {
        return {
          document_id: document.id,
          file_name: document.file_name,
          chunk_count: 0,
          success: false,
          message: 'No usable text chunks were produced for this document.',
        };
      }
      const { error: deleteError } = await supabase_client_1.supabaseAdmin
        .from('document_chunks')
        .delete()
        .eq('document_id', document.id);
      if (deleteError) {
        throw new common_1.InternalServerErrorException(
          `Failed to clear old chunks: ${deleteError.message}`,
        );
      }
      const { error: insertError } = await supabase_client_1.supabaseAdmin
        .from('document_chunks')
        .insert(chunkRows);
      if (insertError) {
        throw new common_1.InternalServerErrorException(
          `Failed to save reindexed chunks: ${insertError.message}`,
        );
      }
      return {
        document_id: document.id,
        file_name: document.file_name,
        chunk_count: chunkRows.length,
        success: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `[Search] Reindex failed for ${document.id}: ${message}`,
      );
      return {
        document_id: document.id,
        file_name: document.file_name,
        chunk_count: 0,
        success: false,
        message,
      };
    }
  }
  async reindexAllDocuments(userId) {
    let docsQuery = supabase_client_1.supabaseAdmin
      .from('documents')
      .select(
        'id, user_id, file_name, file_url, file_type, file_size, created_at',
      )
      .order('created_at', { ascending: false });
    if (userId) {
      docsQuery = docsQuery.eq('user_id', userId);
    }
    const { data: documents, error } = await docsQuery;
    if (error) {
      throw new common_1.InternalServerErrorException(
        `Failed to fetch documents for reindexing: ${error.message}`,
      );
    }
    const indexedDocumentIds = await this.getDocumentsWithChunkIds(userId);
    const fetchedDocuments = documents || [];
    const documentsToReindex = fetchedDocuments.filter(
      (document) => !indexedDocumentIds.has(document.id),
    );
    const results = [];
    for (const document of documentsToReindex) {
      if (document.id) {
        results.push(await this.reindexDocument(document.user_id, document.id));
      }
    }
    const succeeded = results.filter((item) => item.success).length;
    const failed = results.filter((item) => !item.success).length;
    return {
      total_documents: documents?.length || 0,
      processed_documents: results.length,
      succeeded,
      failed,
      skipped: (documents?.length || 0) - results.length,
      results,
    };
  }
  async runKeywordFallbackSearch(query, matchCount, offset, filters) {
    const terms = this.normalizeSearchTerms(query);
    const patterns = (terms.length > 0 ? terms : [query.trim()])
      .filter(Boolean)
      .map((term) => `%${this.escapeIlike(term)}%`);
    if (patterns.length === 0) {
      return [];
    }
    const chunkResponses = await Promise.all(
      patterns.map((pattern) =>
        supabase_client_1.supabaseAdmin
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
      );
    if (chunkRows.length === 0) {
      const documentResponses = await Promise.all(
        patterns.map((pattern) =>
          supabase_client_1.supabaseAdmin
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
        );
      const documentIds = matchedDocuments.map((document) => document.id);
      const { data: fallbackChunks } = await supabase_client_1.supabaseAdmin
        .from('document_chunks')
        .select('id, document_id, user_id, content, metadata, created_at')
        .in('document_id', documentIds)
        .order('created_at', { ascending: false })
        .limit(matchCount * 5);
      const fallbackChunkRows = fallbackChunks || [];
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
  async getSearchResults(
    userId,
    query,
    matchThreshold,
    matchCount,
    offset,
    filters,
  ) {
    const databaseResults = await this.runKeywordFallbackSearch(
      query,
      matchCount,
      offset,
      filters,
    );
    if (databaseResults.length > 0) {
      this.logger.log(
        `[Search] Database text search found ${databaseResults.length} results for query: "${query}"`,
      );
      return databaseResults;
    }
    let embedding = this.getCachedEmbedding(query);
    if (!embedding) {
      embedding = await this.aiService.getEmbedding(query);
      this.cacheEmbedding(query, embedding);
    }
    const fetchCount = offset + matchCount;
    const rpcResponse = await supabase_client_1.supabaseAdmin.rpc(
      'match_document_chunks_for_user',
      {
        query_embedding: embedding,
        requesting_user_id: userId,
        filter_document_id: null,
        match_threshold: matchThreshold,
        match_count: fetchCount,
      },
    );
    const { data: results, error } = rpcResponse;
    if (error) {
      this.logger.warn(
        `[Search] Vector search failed, using database results only: ${error.message}`,
      );
      return [];
    }
    const rpcResults = results ?? [];
    if (rpcResults.length === 0) {
      this.logger.log(
        `[Search] No vector results found for query: "${query}".`,
      );
      return [];
    }
    const paginatedResults = rpcResults.slice(offset, offset + matchCount);
    const documentIds = [
      ...new Set(paginatedResults.map((r) => r.document_id)),
    ];
    const docMap = await this.fetchDocumentMetadata(documentIds, filters);
    const enrichedResults = paginatedResults
      .filter((result) => docMap.has(result.document_id))
      .map((result) => {
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
        `[Search] Vector results were filtered out for query: "${query}".`,
      );
      return [];
    }
    return enrichedResults;
  }
  async saveSearchHistory(userId, query, resultCount, matchThreshold) {
    try {
      await supabase_client_1.supabaseAdmin.from('search_history').insert({
        user_id: userId,
        query,
        result_count: resultCount,
        match_threshold: matchThreshold,
      });
    } catch (error) {
      this.logger.warn(`[Search] Failed to save search history: ${error}`);
    }
  }
  async getSearchHistory(userId, limit = 10) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('search_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      this.logger.warn(`[Search] Failed to fetch search history: ${error}`);
      return [];
    }
    return data || [];
  }
  async *streamSearchNotes(
    userId,
    query,
    matchThreshold = 0.3,
    matchCount = 5,
    offset = 0,
    filters,
  ) {
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
    userId,
    query,
    matchThreshold = 0.3,
    matchCount = 5,
    offset = 0,
    filters,
  ) {
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
      throw new common_1.InternalServerErrorException(
        `Search failed: ${message}`,
      );
    }
  }
  async getUserDocuments(userId) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('documents')
      .select('id, file_name, file_url, file_type, file_size, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new common_1.InternalServerErrorException(
        `Failed to fetch documents: ${error.message}`,
      );
    }
    return data || [];
  }
  async askCompanionAboutDocument(userId, documentId, question, history = []) {
    const document = await this.getOwnedDocumentById(userId, documentId);
    if (!document) {
      throw new common_1.BadRequestException('Document not found');
    }
    let extractedText = '';
    let contextSource = 'metadata_only';
    try {
      extractedText =
        await this.processingService.extractTextForQuestionAnswering(
          document.file_url,
          document.file_type,
        );
      contextSource = 'extracted_text';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `[Search] Could not extract study text for companion chat on ${document.id}: ${message}. Falling back to document metadata.`,
      );
    }
    const aiResponse = await this.aiService.chatWithCompanion(
      question,
      history,
      this.buildCompanionContext(document, extractedText),
    );
    return {
      answer: aiResponse.text,
      document: {
        id: document.id,
        file_name: document.file_name,
        file_url: document.file_url,
        file_type: document.file_type,
        file_size: document.file_size,
        created_at: document.created_at,
      },
      context_source: contextSource,
    };
  }
});
SearchService = SearchService_1 = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [
      ai_service_1.AiService,
      processing_service_1.ProcessingService,
    ]),
  ],
  SearchService,
);
exports.SearchService = SearchService;
//# sourceMappingURL=search.service.js.map

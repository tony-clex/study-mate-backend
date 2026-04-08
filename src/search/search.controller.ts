import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  SearchService,
  SearchResult,
  SearchHistoryItem,
  SearchFilters,
} from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

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

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  async searchNotes(
    @Request() req: AuthRequest,
    @Body() searchDto: SearchQueryDto,
  ): Promise<PaginatedSearchResult> {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }

    const filters: SearchFilters | undefined =
      searchDto.file_type || searchDto.date_from || searchDto.date_to
        ? {
            file_type: searchDto.file_type,
            date_from: searchDto.date_from,
            date_to: searchDto.date_to,
          }
        : undefined;

    const results = await this.searchService.searchNotes(
      userId,
      searchDto.query,
      searchDto.match_threshold,
      searchDto.match_count,
      searchDto.offset,
      filters,
    );

    if (searchDto.include_history !== 'false') {
      void this.searchService.saveSearchHistory(
        userId,
        searchDto.query,
        results.length,
        searchDto.match_threshold || 0.3,
      );
    }

    return {
      results,
      pagination: {
        offset: searchDto.offset || 0,
        match_count: searchDto.match_count || 5,
        has_more: results.length === searchDto.match_count,
      },
    };
  }

  @Post('stream')
  @HttpCode(HttpStatus.OK)
  async streamSearch(
    @Request() req: AuthRequest,
    @Body() searchDto: SearchQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }

    const filters: SearchFilters | undefined =
      searchDto.file_type || searchDto.date_from || searchDto.date_to
        ? {
            file_type: searchDto.file_type,
            date_from: searchDto.date_from,
            date_to: searchDto.date_to,
          }
        : undefined;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const encoder = new TextEncoder();
    try {
      const stream = this.searchService.streamSearchNotes(
        userId,
        searchDto.query,
        searchDto.match_threshold,
        searchDto.match_count,
        searchDto.offset,
        filters,
      );

      for await (const chunk of stream) {
        res.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }

      res.write(encoder.encode('data: [DONE]\n\n'));
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.write(
        encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`),
      );
      res.end();
    }
  }

  @Get('history')
  async getSearchHistory(
    @Request() req: AuthRequest,
    @Query('limit') limit?: string,
  ): Promise<SearchHistoryResponse> {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }

    const historyLimit = limit ? parseInt(limit, 10) : 10;
    const history = await this.searchService.getSearchHistory(
      userId,
      historyLimit,
    );
    return { history };
  }

  @Get('documents')
  async getUserDocuments(@Request() req: AuthRequest): Promise<
    {
      id: string;
      file_name: string;
      file_url: string;
      file_type: string;
      file_size: number;
      created_at: string;
    }[]
  > {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }

    return this.searchService.getUserDocuments(userId);
  }

  @Post('reindex')
  async reindexDocument(
    @Request() req: AuthRequest,
    @Body() body: { document_id?: string },
  ): Promise<ReindexResponse> {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }

    if (!body?.document_id) {
      throw new BadRequestException('document_id is required');
    }

    const result = await this.searchService.reindexDocument(body.document_id);
    return {
      total_documents: 1,
      processed_documents: 1,
      succeeded: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
      skipped: 0,
      results: [result],
    };
  }

  @Post('reindex/all')
  async reindexAllDocuments(): Promise<ReindexResponse> {
    return this.searchService.reindexAllDocuments();
  }
}

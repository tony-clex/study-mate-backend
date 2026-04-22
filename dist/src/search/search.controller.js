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
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.SearchController = void 0;
const common_1 = require('@nestjs/common');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
const search_service_1 = require('./search.service');
const search_query_dto_1 = require('./dto/search-query.dto');
const search_companion_message_dto_1 = require('./dto/search-companion-message.dto');
let SearchController = class SearchController {
  searchService;
  constructor(searchService) {
    this.searchService = searchService;
  }
  async searchNotes(req, searchDto) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    const filters =
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
  async companionMessage(req, body) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    const documentId = body.documentId ?? body.document_id;
    if (!documentId) {
      throw new common_1.BadRequestException('documentId is required');
    }
    return this.searchService.askCompanionAboutDocument(
      userId,
      documentId,
      body.question,
      body.history || [],
    );
  }
  async streamSearch(req, searchDto, res) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    const filters =
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
  async getSearchHistory(req, limit) {
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
  async getUserDocuments(req) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    return this.searchService.getUserDocuments(userId);
  }
  async getDocumentById(req, documentId) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    const document = await this.searchService.getDocumentById(
      userId,
      documentId,
    );
    if (!document) {
      throw new common_1.BadRequestException('Document not found');
    }
    return document;
  }
  async getDocumentChunks(req, documentId) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    const document = await this.searchService.getDocumentById(
      userId,
      documentId,
    );
    if (!document) {
      throw new common_1.BadRequestException('Document not found');
    }
    const chunks = await this.searchService.getDocumentChunks(
      userId,
      documentId,
    );
    return { chunks };
  }
  async reindexDocument(req, body) {
    const userId = req.user?.id ?? req.userId;
    if (!userId) {
      throw new Error('Authenticated user ID is missing from the request');
    }
    if (!body?.document_id) {
      throw new common_1.BadRequestException('document_id is required');
    }
    const result = await this.searchService.reindexDocument(
      userId,
      body.document_id,
    );
    return {
      total_documents: 1,
      processed_documents: 1,
      succeeded: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
      skipped: 0,
      results: [result],
    };
  }
  async reindexAllDocuments() {
    return this.searchService.reindexAllDocuments();
  }
};
__decorate(
  [
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      search_query_dto_1.SearchQueryDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'searchNotes',
  null,
);
__decorate(
  [
    (0, common_1.Post)('companion/message'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      search_companion_message_dto_1.SearchCompanionMessageDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'companionMessage',
  null,
);
__decorate(
  [
    (0, common_1.Post)('stream'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      search_query_dto_1.SearchQueryDto,
      Object,
    ]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'streamSearch',
  null,
);
__decorate(
  [
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'getSearchHistory',
  null,
);
__decorate(
  [
    (0, common_1.Get)('documents'),
    __param(0, (0, common_1.Request)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'getUserDocuments',
  null,
);
__decorate(
  [
    (0, common_1.Get)('documents/:id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'getDocumentById',
  null,
);
__decorate(
  [
    (0, common_1.Get)('documents/:id/chunks'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'getDocumentChunks',
  null,
);
__decorate(
  [
    (0, common_1.Post)('reindex'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Object]),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'reindexDocument',
  null,
);
__decorate(
  [
    (0, common_1.Post)('reindex/all'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SearchController.prototype,
  'reindexAllDocuments',
  null,
);
SearchController = __decorate(
  [
    (0, common_1.Controller)('search'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata('design:paramtypes', [search_service_1.SearchService]),
  ],
  SearchController,
);
exports.SearchController = SearchController;
//# sourceMappingURL=search.controller.js.map

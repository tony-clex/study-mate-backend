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
exports.StudySessionController = void 0;
const common_1 = require('@nestjs/common');
const study_session_service_1 = require('./study-session.service');
const spaced_card_service_1 = require('./spaced-card.service');
const progress_service_1 = require('./progress.service');
const collaboration_service_1 = require('./collaboration.service');
const study_session_dto_1 = require('./dto/study-session.dto');
const spaced_card_dto_1 = require('./dto/spaced-card.dto');
const collaborator_dto_1 = require('./dto/collaborator.dto');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
let StudySessionController = class StudySessionController {
  studySessionService;
  spacedCardService;
  progressService;
  collaborationService;
  constructor(
    studySessionService,
    spacedCardService,
    progressService,
    collaborationService,
  ) {
    this.studySessionService = studySessionService;
    this.spacedCardService = spacedCardService;
    this.progressService = progressService;
    this.collaborationService = collaborationService;
  }
  async create(req, createDto) {
    const userId = req.user.id;
    const result = await this.studySessionService.create(userId, createDto);
    await this.progressService.recordActivity(userId, 'session');
    return result;
  }
  async findAll(req) {
    const userId = req.user.id;
    return this.studySessionService.findAll(userId);
  }
  async findOne(req, id) {
    const userId = req.user.id;
    return this.studySessionService.findOne(userId, id);
  }
  async update(req, id, updateDto) {
    const userId = req.user.id;
    return this.studySessionService.update(userId, id, updateDto);
  }
  async remove(req, id) {
    const userId = req.user.id;
    return this.studySessionService.remove(userId, id);
  }
  async createNote(req, sessionId, createDto) {
    const userId = req.user.id;
    const result = await this.studySessionService.createNote(userId, {
      ...createDto,
      session_id: sessionId,
    });
    await this.progressService.recordActivity(userId, 'note');
    return result;
  }
  async findAllNotes(req, sessionId) {
    const userId = req.user.id;
    return this.studySessionService.findAllNotes(userId, sessionId);
  }
  async findNoteById(req, sessionId, noteId) {
    const userId = req.user.id;
    return this.studySessionService.findNoteById(userId, noteId);
  }
  async updateNote(req, sessionId, noteId, updateDto) {
    const userId = req.user.id;
    return this.studySessionService.updateNote(userId, noteId, updateDto);
  }
  async removeNote(req, sessionId, noteId) {
    const userId = req.user.id;
    return this.studySessionService.removeNote(userId, noteId);
  }
  async findAllFiles(req, sessionId) {
    const userId = req.user.id;
    return this.studySessionService.findAllFiles(userId, sessionId);
  }
  async createFile(req, sessionId, createDto) {
    const userId = req.user.id;
    const result = await this.studySessionService.createFile(userId, {
      ...createDto,
      session_id: sessionId,
    });
    await this.progressService.recordActivity(userId, 'file');
    return result;
  }
  async removeFile(req, sessionId, fileId) {
    const userId = req.user.id;
    return this.studySessionService.removeFile(userId, fileId);
  }
  async createCard(req, createDto) {
    const userId = req.user.id;
    const result = await this.spacedCardService.create(userId, createDto);
    await this.progressService.recordActivity(userId, 'card_learn');
    return result;
  }
  async findAllCards(req, sessionId) {
    const userId = req.user.id;
    return this.spacedCardService.findAll(userId, sessionId);
  }
  async findDueCards(req) {
    const userId = req.user.id;
    return this.spacedCardService.findDueCards(userId);
  }
  async findCard(req, id) {
    const userId = req.user.id;
    return this.spacedCardService.findOne(userId, id);
  }
  async updateCard(req, id, body) {
    const userId = req.user.id;
    return this.spacedCardService.update(userId, id, body);
  }
  async reviewCard(req, id, reviewDto) {
    const userId = req.user.id;
    const result = await this.spacedCardService.review(userId, id, reviewDto);
    await this.progressService.recordActivity(userId, 'card_review');
    return result;
  }
  async deleteCard(req, id) {
    const userId = req.user.id;
    return this.spacedCardService.remove(userId, id);
  }
  async getProgress(req, startDate, endDate) {
    const userId = req.user.id;
    return this.progressService.getProgress(userId, startDate, endDate);
  }
  async getStats(req) {
    const userId = req.user.id;
    return this.progressService.getStats(userId);
  }
  async addCollaborator(req, createDto) {
    const ownerId = req.user.id;
    return this.collaborationService.addCollaborator(ownerId, createDto);
  }
  async getCollaborators(req, sessionId) {
    const userId = req.user.id;
    return this.collaborationService.findCollaborators(userId, sessionId);
  }
  async updateCollaboratorStatus(req, sessionId, updateDto) {
    const userId = req.user.id;
    return this.collaborationService.updateCollaboratorStatus(
      userId,
      sessionId,
      updateDto,
    );
  }
  async removeCollaborator(req, sessionId, collaboratorId) {
    const ownerId = req.user.id;
    return this.collaborationService.removeCollaborator(
      ownerId,
      sessionId,
      collaboratorId,
    );
  }
  async getSharedSessions(req) {
    const userId = req.user.id;
    return this.collaborationService.getSharedSessions(userId);
  }
  async getPendingInvites(req) {
    const userId = req.user.id;
    return this.collaborationService.getPendingInvites(userId);
  }
};
__decorate(
  [
    (0, common_1.Post)('session/create'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      study_session_dto_1.CreateStudySessionDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'create',
  null,
);
__decorate(
  [
    (0, common_1.Get)('session/list'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findAll',
  null,
);
__decorate(
  [
    (0, common_1.Get)('session/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findOne',
  null,
);
__decorate(
  [
    (0, common_1.Patch)('session/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      String,
      study_session_dto_1.UpdateStudySessionDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'update',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('session/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'remove',
  null,
);
__decorate(
  [
    (0, common_1.Post)('session/:sessionId/notes'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      String,
      study_session_dto_1.CreateSessionNoteDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'createNote',
  null,
);
__decorate(
  [
    (0, common_1.Get)('session/:sessionId/notes'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findAllNotes',
  null,
);
__decorate(
  [
    (0, common_1.Get)('session/:sessionId/notes/:noteId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('noteId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findNoteById',
  null,
);
__decorate(
  [
    (0, common_1.Patch)('session/:sessionId/notes/:noteId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('noteId', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      String,
      String,
      study_session_dto_1.UpdateSessionNoteDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'updateNote',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('session/:sessionId/notes/:noteId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('noteId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'removeNote',
  null,
);
__decorate(
  [
    (0, common_1.Get)('session/:sessionId/files'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findAllFiles',
  null,
);
__decorate(
  [
    (0, common_1.Post)('session/:sessionId/files'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      String,
      study_session_dto_1.CreateSessionFileDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'createFile',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('session/:sessionId/files/:fileId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('fileId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'removeFile',
  null,
);
__decorate(
  [
    (0, common_1.Post)('cards'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      spaced_card_dto_1.CreateSpacedCardDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'createCard',
  null,
);
__decorate(
  [
    (0, common_1.Get)('cards'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('sessionId')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findAllCards',
  null,
);
__decorate(
  [
    (0, common_1.Get)('cards/due'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findDueCards',
  null,
);
__decorate(
  [
    (0, common_1.Get)('cards/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'findCard',
  null,
);
__decorate(
  [
    (0, common_1.Patch)('cards/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String, Object]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'updateCard',
  null,
);
__decorate(
  [
    (0, common_1.Post)('cards/:id/review'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      String,
      spaced_card_dto_1.ReviewCardDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'reviewCard',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('cards/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'deleteCard',
  null,
);
__decorate(
  [
    (0, common_1.Get)('progress'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'getProgress',
  null,
);
__decorate(
  [
    (0, common_1.Get)('progress/stats'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'getStats',
  null,
);
__decorate(
  [
    (0, common_1.Post)('collaboration/invite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      collaborator_dto_1.CreateCollaboratorDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'addCollaborator',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collaboration/session/:sessionId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'getCollaborators',
  null,
);
__decorate(
  [
    (0, common_1.Patch)('collaboration/invite/:sessionId'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      Object,
      String,
      collaborator_dto_1.UpdateCollaboratorStatusDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'updateCollaboratorStatus',
  null,
);
__decorate(
  [
    (0, common_1.Delete)(
      'collaboration/session/:sessionId/collaborator/:collaboratorId',
    ),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('collaboratorId', common_1.ParseUUIDPipe)),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String, String]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'removeCollaborator',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collaboration/shared'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'getSharedSessions',
  null,
);
__decorate(
  [
    (0, common_1.Get)('collaboration/invites'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  StudySessionController.prototype,
  'getPendingInvites',
  null,
);
StudySessionController = __decorate(
  [
    (0, common_1.Controller)('api'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata('design:paramtypes', [
      study_session_service_1.StudySessionService,
      spaced_card_service_1.SpacedCardService,
      progress_service_1.ProgressService,
      collaboration_service_1.CollaborationService,
    ]),
  ],
  StudySessionController,
);
exports.StudySessionController = StudySessionController;
//# sourceMappingURL=study-session.controller.js.map

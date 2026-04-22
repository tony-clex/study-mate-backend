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
exports.FileUploadController = void 0;
const common_1 = require('@nestjs/common');
const platform_express_1 = require('@nestjs/platform-express');
const file_upload_service_1 = require('./file-upload.service');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
const study_session_service_1 = require('../study-session/study-session.service');
let FileUploadController = class FileUploadController {
  fileUploadService;
  studySessionService;
  constructor(fileUploadService, studySessionService) {
    this.fileUploadService = fileUploadService;
    this.studySessionService = studySessionService;
  }
  async uploadFileJson(req, body) {
    console.log('[Upload JSON] Hit endpoint!');
    console.log('[Upload JSON] Body keys:', Object.keys(body || {}));
    console.log('[Upload JSON] Has fileData:', !!body?.fileData);
    console.log('[Upload JSON] fileName:', body?.fileName);
    if (!body?.fileData) {
      console.log('[Upload JSON] Error - no fileData');
      throw new common_1.BadRequestException('fileData is required');
    }
    const userId = req.user.id;
    console.log('[Upload JSON] UserId:', userId);
    try {
      const buffer = Buffer.from(body.fileData, 'base64');
      console.log('[Upload JSON] Buffer size:', buffer.length);
      const result = await this.fileUploadService.uploadFile(
        userId,
        {
          originalname: body.fileName || 'file',
          mimetype: body.fileType || 'application/octet-stream',
          size: buffer.length,
          buffer,
        },
        typeof body.folder === 'string' ? body.folder : 'uploads',
      );
      console.log('[Upload JSON] Success:', result.file_name);
      return { message: 'File uploaded', ...result };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      console.log('[Upload JSON] Error:', message);
      throw e;
    }
  }
  async uploadFile(req, file, folder, sessionId, sessionIdAlt) {
    console.log('[Upload Multipart] Final attempt - file:', file);
    if (!file) {
      throw new common_1.BadRequestException('No file provided');
    }
    const userId = req.user.id;
    const resolvedSessionId = sessionId || sessionIdAlt;
    const result = await this.fileUploadService.uploadFile(
      userId,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      resolvedSessionId
        ? `sessions/${resolvedSessionId}`
        : typeof folder === 'string'
          ? folder
          : 'uploads',
    );
    if (resolvedSessionId) {
      const linkedFile = await this.studySessionService.createFile(userId, {
        session_id: resolvedSessionId,
        file_url: result.file_url,
        file_name: result.file_name,
        file_type: result.file_type,
        file_size: result.file_size,
      });
      return {
        message: 'File uploaded successfully',
        document_id: result.id,
        ...linkedFile,
      };
    }
    return {
      message: 'File uploaded successfully',
      ...result,
    };
  }
  async deleteFile(fileUrl) {
    if (!fileUrl) {
      throw new common_1.BadRequestException('File URL is required');
    }
    await this.fileUploadService.deleteFile(fileUrl);
    return {
      message: 'File deleted successfully',
    };
  }
  async getSignedUrl(fileUrl, expiresIn) {
    if (!fileUrl) {
      throw new common_1.BadRequestException('File URL is required');
    }
    const signedUrl = await this.fileUploadService.getSignedUrl(
      fileUrl,
      expiresIn || 3600,
    );
    return {
      signed_url: signedUrl,
    };
  }
  async uploadSessionFile(req, file, sessionId) {
    if (!file) {
      throw new common_1.BadRequestException('No file uploaded');
    }
    const result = await this.fileUploadService.uploadFile(
      req.user.id,
      {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      },
      `sessions/${sessionId}`,
    );
    const linkedFile = await this.studySessionService.createFile(req.user.id, {
      session_id: sessionId,
      file_url: result.file_url,
      file_name: result.file_name,
      file_type: result.file_type,
      file_size: result.file_size,
    });
    return {
      message: 'Uploaded to session!',
      document_id: result.id,
      ...linkedFile,
    };
  }
};
__decorate(
  [
    (0, common_1.Post)('api/upload/json'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Object]),
    __metadata('design:returntype', Promise),
  ],
  FileUploadController.prototype,
  'uploadFileJson',
  null,
);
__decorate(
  [
    (0, common_1.Post)('api/upload'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(
      (0, platform_express_1.FileInterceptor)('file'),
    ),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)('folder')),
    __param(3, (0, common_1.Body)('session_id')),
    __param(4, (0, common_1.Body)('sessionId')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Object, String, String, String]),
    __metadata('design:returntype', Promise),
  ],
  FileUploadController.prototype,
  'uploadFile',
  null,
);
__decorate(
  [
    (0, common_1.Delete)('api/upload'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('file_url')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String]),
    __metadata('design:returntype', Promise),
  ],
  FileUploadController.prototype,
  'deleteFile',
  null,
);
__decorate(
  [
    (0, common_1.Post)('api/upload/signed-url'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)('file_url')),
    __param(1, (0, common_1.Body)('expires_in')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, Number]),
    __metadata('design:returntype', Promise),
  ],
  FileUploadController.prototype,
  'getSignedUrl',
  null,
);
__decorate(
  [
    (0, common_1.Post)('session/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(
      (0, platform_express_1.FileInterceptor)('file'),
    ),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Param)('id')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Object, String]),
    __metadata('design:returntype', Promise),
  ],
  FileUploadController.prototype,
  'uploadSessionFile',
  null,
);
FileUploadController = __decorate(
  [
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata('design:paramtypes', [
      file_upload_service_1.FileUploadService,
      study_session_service_1.StudySessionService,
    ]),
  ],
  FileUploadController,
);
exports.FileUploadController = FileUploadController;
//# sourceMappingURL=file-upload.controller.js.map

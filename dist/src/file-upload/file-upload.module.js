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
Object.defineProperty(exports, '__esModule', { value: true });
exports.FileUploadModule = void 0;
const common_1 = require('@nestjs/common');
const platform_express_1 = require('@nestjs/platform-express');
const multer_1 = require('multer');
const file_upload_controller_1 = require('./file-upload.controller');
const file_upload_service_1 = require('./file-upload.service');
const jwt_1 = require('@nestjs/jwt');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
const study_session_module_1 = require('../study-session/study-session.module');
const documents_module_1 = require('../documents/documents.module');
const ai_module_1 = require('../ai/ai.module');
let FileUploadModule = class FileUploadModule {};
FileUploadModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        study_session_module_1.StudySessionModule,
        documents_module_1.DocumentsModule,
        ai_module_1.AiModule,
        platform_express_1.MulterModule.register({
          storage: (0, multer_1.memoryStorage)(),
          limits: {
            fileSize: 10 * 1024 * 1024,
          },
        }),
      ],
      controllers: [file_upload_controller_1.FileUploadController],
      providers: [
        file_upload_service_1.FileUploadService,
        jwt_1.JwtService,
        jwt_auth_guard_1.JwtAuthGuard,
      ],
      exports: [file_upload_service_1.FileUploadService],
    }),
  ],
  FileUploadModule,
);
exports.FileUploadModule = FileUploadModule;
//# sourceMappingURL=file-upload.module.js.map

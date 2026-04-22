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
exports.AppModule = void 0;
const common_1 = require('@nestjs/common');
const config_1 = require('@nestjs/config');
const app_controller_1 = require('./app.controller');
const app_service_1 = require('./app.service');
const auth_module_1 = require('./auth/auth.module');
const study_session_module_1 = require('./study-session/study-session.module');
const file_upload_module_1 = require('./file-upload/file-upload.module');
const profile_module_1 = require('./profile/profile.module');
const documents_module_1 = require('./documents/documents.module');
const chat_module_1 = require('./chat/chat.module');
const search_module_1 = require('./search/search.module');
const flashcard_module_1 = require('./flashcard/flashcard.module');
const quiz_module_1 = require('./quiz/quiz.module');
let AppModule = class AppModule {};
AppModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        config_1.ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        auth_module_1.AuthModule,
        chat_module_1.ChatModule,
        study_session_module_1.StudySessionModule,
        file_upload_module_1.FileUploadModule,
        profile_module_1.ProfileModule,
        documents_module_1.DocumentsModule,
        search_module_1.SearchModule,
        flashcard_module_1.FlashcardModule,
        quiz_module_1.QuizModule,
      ],
      controllers: [app_controller_1.AppController],
      providers: [app_service_1.AppService],
    }),
  ],
  AppModule,
);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map

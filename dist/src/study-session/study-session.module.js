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
exports.StudySessionModule = void 0;
const common_1 = require('@nestjs/common');
const study_session_controller_1 = require('./study-session.controller');
const study_session_service_1 = require('./study-session.service');
const spaced_card_service_1 = require('./spaced-card.service');
const progress_service_1 = require('./progress.service');
const collaboration_service_1 = require('./collaboration.service');
const auth_module_1 = require('../auth/auth.module');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
let StudySessionModule = class StudySessionModule {};
StudySessionModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [auth_module_1.AuthModule],
      controllers: [study_session_controller_1.StudySessionController],
      providers: [
        study_session_service_1.StudySessionService,
        spaced_card_service_1.SpacedCardService,
        progress_service_1.ProgressService,
        collaboration_service_1.CollaborationService,
        jwt_auth_guard_1.JwtAuthGuard,
      ],
      exports: [
        study_session_service_1.StudySessionService,
        spaced_card_service_1.SpacedCardService,
        progress_service_1.ProgressService,
        collaboration_service_1.CollaborationService,
      ],
    }),
  ],
  StudySessionModule,
);
exports.StudySessionModule = StudySessionModule;
//# sourceMappingURL=study-session.module.js.map

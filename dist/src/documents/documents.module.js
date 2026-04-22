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
exports.DocumentsModule = void 0;
const common_1 = require('@nestjs/common');
const ai_module_1 = require('../ai/ai.module');
const auth_module_1 = require('../auth/auth.module');
const processing_service_1 = require('./processing.service');
let DocumentsModule = class DocumentsModule {};
DocumentsModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [auth_module_1.AuthModule, ai_module_1.AiModule],
      providers: [processing_service_1.ProcessingService],
      exports: [processing_service_1.ProcessingService],
    }),
  ],
  DocumentsModule,
);
exports.DocumentsModule = DocumentsModule;
//# sourceMappingURL=documents.module.js.map

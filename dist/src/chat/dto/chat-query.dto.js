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
Object.defineProperty(exports, '__esModule', { value: true });
exports.ChatQueryDto = void 0;
const class_validator_1 = require('class-validator');
class ChatQueryDto {
  question;
  mode = 'text';
  history;
  attachmentUrl;
  attachmentType;
  attachmentData;
  attachmentMimeType;
  documentId;
  document_id;
  sessionId;
  session_id;
  fileName;
  file_name;
  fileUrl;
  file_url;
}
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'question is required' }),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'question',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(
      ['text', 'image', 'pdf', 'audio', 'research'],
      {
        message: 'mode must be text, image, pdf, audio, or research',
      },
    ),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'mode',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata('design:type', Array),
  ],
  ChatQueryDto.prototype,
  'history',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'attachmentUrl',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'attachmentType',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'attachmentData',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'attachmentMimeType',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', {
      message: 'documentId must be a valid UUID',
    }),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'documentId',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', {
      message: 'document_id must be a valid UUID',
    }),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'document_id',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', {
      message: 'sessionId must be a valid UUID',
    }),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'sessionId',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)('4', {
      message: 'session_id must be a valid UUID',
    }),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'session_id',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'fileName',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'file_name',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(
      {},
      { message: 'fileUrl must be a valid URL' },
    ),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'fileUrl',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)(
      {},
      { message: 'file_url must be a valid URL' },
    ),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  ChatQueryDto.prototype,
  'file_url',
  void 0,
);
exports.ChatQueryDto = ChatQueryDto;
//# sourceMappingURL=chat-query.dto.js.map

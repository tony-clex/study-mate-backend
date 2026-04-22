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
exports.CreateSessionFileDto =
  exports.UpdateSessionNoteDto =
  exports.CreateSessionNoteDto =
  exports.StudySessionParamsDto =
  exports.UpdateStudySessionDto =
  exports.CreateStudySessionDto =
    void 0;
const class_validator_1 = require('class-validator');
class CreateStudySessionDto {
  title;
  subject;
}
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    __metadata('design:type', String),
  ],
  CreateStudySessionDto.prototype,
  'title',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateStudySessionDto.prototype,
  'subject',
  void 0,
);
exports.CreateStudySessionDto = CreateStudySessionDto;
class UpdateStudySessionDto {
  title;
}
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    __metadata('design:type', String),
  ],
  UpdateStudySessionDto.prototype,
  'title',
  void 0,
);
exports.UpdateStudySessionDto = UpdateStudySessionDto;
class StudySessionParamsDto {
  id;
}
__decorate(
  [(0, class_validator_1.IsUUID)(), __metadata('design:type', String)],
  StudySessionParamsDto.prototype,
  'id',
  void 0,
);
exports.StudySessionParamsDto = StudySessionParamsDto;
class CreateSessionNoteDto {
  session_id;
  title;
  content;
  file_url;
  file_name;
  file_type;
}
__decorate(
  [
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Session ID is required' }),
    __metadata('design:type', String),
  ],
  CreateSessionNoteDto.prototype,
  'session_id',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Title is required' }),
    __metadata('design:type', String),
  ],
  CreateSessionNoteDto.prototype,
  'title',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateSessionNoteDto.prototype,
  'content',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateSessionNoteDto.prototype,
  'file_url',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateSessionNoteDto.prototype,
  'file_name',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateSessionNoteDto.prototype,
  'file_type',
  void 0,
);
exports.CreateSessionNoteDto = CreateSessionNoteDto;
class UpdateSessionNoteDto {
  title;
  content;
  file_url;
  file_name;
  file_type;
}
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSessionNoteDto.prototype,
  'title',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSessionNoteDto.prototype,
  'content',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSessionNoteDto.prototype,
  'file_url',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSessionNoteDto.prototype,
  'file_name',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSessionNoteDto.prototype,
  'file_type',
  void 0,
);
exports.UpdateSessionNoteDto = UpdateSessionNoteDto;
class CreateSessionFileDto {
  session_id;
  file_url;
  file_name;
  file_type;
  file_size;
}
__decorate(
  [
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Session ID is required' }),
    __metadata('design:type', String),
  ],
  CreateSessionFileDto.prototype,
  'session_id',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsUrl)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File URL is required' }),
    __metadata('design:type', String),
  ],
  CreateSessionFileDto.prototype,
  'file_url',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File name is required' }),
    __metadata('design:type', String),
  ],
  CreateSessionFileDto.prototype,
  'file_name',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File type is required' }),
    __metadata('design:type', String),
  ],
  CreateSessionFileDto.prototype,
  'file_type',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'File size is required' }),
    __metadata('design:type', Number),
  ],
  CreateSessionFileDto.prototype,
  'file_size',
  void 0,
);
exports.CreateSessionFileDto = CreateSessionFileDto;
//# sourceMappingURL=study-session.dto.js.map

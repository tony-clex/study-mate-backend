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
exports.CollaboratorListResponse =
  exports.CollaboratorResponse =
  exports.UpdateCollaboratorStatusDto =
  exports.CreateCollaboratorDto =
  exports.CollaboratorStatus =
  exports.CollaboratorRole =
    void 0;
const class_validator_1 = require('class-validator');
var CollaboratorRole;
(function (CollaboratorRole) {
  CollaboratorRole['VIEWER'] = 'viewer';
  CollaboratorRole['EDITOR'] = 'editor';
  CollaboratorRole['ADMIN'] = 'admin';
})(
  (CollaboratorRole =
    exports.CollaboratorRole || (exports.CollaboratorRole = {})),
);
var CollaboratorStatus;
(function (CollaboratorStatus) {
  CollaboratorStatus['PENDING'] = 'pending';
  CollaboratorStatus['ACCEPTED'] = 'accepted';
  CollaboratorStatus['REJECTED'] = 'rejected';
})(
  (CollaboratorStatus =
    exports.CollaboratorStatus || (exports.CollaboratorStatus = {})),
);
class CreateCollaboratorDto {
  sessionId;
  collaboratorId;
  role = CollaboratorRole.VIEWER;
}
__decorate(
  [(0, class_validator_1.IsUUID)(), __metadata('design:type', String)],
  CreateCollaboratorDto.prototype,
  'sessionId',
  void 0,
);
__decorate(
  [(0, class_validator_1.IsUUID)(), __metadata('design:type', String)],
  CreateCollaboratorDto.prototype,
  'collaboratorId',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsEnum)(CollaboratorRole),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateCollaboratorDto.prototype,
  'role',
  void 0,
);
exports.CreateCollaboratorDto = CreateCollaboratorDto;
class UpdateCollaboratorStatusDto {
  status;
}
__decorate(
  [
    (0, class_validator_1.IsEnum)(CollaboratorStatus),
    __metadata('design:type', String),
  ],
  UpdateCollaboratorStatusDto.prototype,
  'status',
  void 0,
);
exports.UpdateCollaboratorStatusDto = UpdateCollaboratorStatusDto;
class CollaboratorResponse {
  id;
  sessionId;
  ownerId;
  collaboratorId;
  role;
  status;
  createdAt;
  updatedAt;
}
exports.CollaboratorResponse = CollaboratorResponse;
class CollaboratorListResponse {
  collaborators;
  total;
}
exports.CollaboratorListResponse = CollaboratorListResponse;
//# sourceMappingURL=collaborator.dto.js.map

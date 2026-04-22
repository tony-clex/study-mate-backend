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
exports.ProfileController = void 0;
const common_1 = require('@nestjs/common');
const platform_express_1 = require('@nestjs/platform-express');
const profile_service_1 = require('./profile.service');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
let ProfileController = class ProfileController {
  profileService;
  constructor(profileService) {
    this.profileService = profileService;
  }
  async getMyProfile(req) {
    return this.profileService.getProfile(req.user.id);
  }
  async updateProfile(req, files) {
    const avatarFile = (files || []).find((f) => f.fieldname === 'avatar');
    const body = req.body;
    const dto = {
      full_name: body.full_name,
      bio: body.bio,
      learning_goal: body.learning_goal,
      study_level: body.study_level,
    };
    return this.profileService.updateProfile(req.user.id, dto, avatarFile);
  }
};
__decorate(
  [
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  ProfileController.prototype,
  'getMyProfile',
  null,
);
__decorate(
  [
    (0, common_1.Post)('update'),
    (0, common_1.UseInterceptors)(
      (0, platform_express_1.AnyFilesInterceptor)(),
    ),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Array]),
    __metadata('design:returntype', Promise),
  ],
  ProfileController.prototype,
  'updateProfile',
  null,
);
ProfileController = __decorate(
  [
    (0, common_1.Controller)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata('design:paramtypes', [profile_service_1.ProfileService]),
  ],
  ProfileController,
);
exports.ProfileController = ProfileController;
//# sourceMappingURL=profile.controller.js.map

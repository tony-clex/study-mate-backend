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
exports.SpacedCardListResponse =
  exports.SpacedCardResponse =
  exports.ReviewCardDto =
  exports.UpdateSpacedCardDto =
  exports.CreateSpacedCardDto =
    void 0;
const class_validator_1 = require('class-validator');
class CreateSpacedCardDto {
  sessionId;
  noteId;
  frontText;
  backText;
}
__decorate(
  [
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateSpacedCardDto.prototype,
  'sessionId',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  CreateSpacedCardDto.prototype,
  'noteId',
  void 0,
);
__decorate(
  [(0, class_validator_1.IsString)(), __metadata('design:type', String)],
  CreateSpacedCardDto.prototype,
  'frontText',
  void 0,
);
__decorate(
  [(0, class_validator_1.IsString)(), __metadata('design:type', String)],
  CreateSpacedCardDto.prototype,
  'backText',
  void 0,
);
exports.CreateSpacedCardDto = CreateSpacedCardDto;
class UpdateSpacedCardDto {
  frontText;
  backText;
}
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSpacedCardDto.prototype,
  'frontText',
  void 0,
);
__decorate(
  [
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata('design:type', String),
  ],
  UpdateSpacedCardDto.prototype,
  'backText',
  void 0,
);
exports.UpdateSpacedCardDto = UpdateSpacedCardDto;
class ReviewCardDto {
  quality;
}
__decorate(
  [
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(5),
    __metadata('design:type', Number),
  ],
  ReviewCardDto.prototype,
  'quality',
  void 0,
);
exports.ReviewCardDto = ReviewCardDto;
class SpacedCardResponse {
  id;
  userId;
  sessionId;
  noteId;
  frontText;
  backText;
  easeFactor;
  intervalDays;
  repetitions;
  nextReviewDate;
  lastReviewedAt;
  createdAt;
  updatedAt;
}
exports.SpacedCardResponse = SpacedCardResponse;
class SpacedCardListResponse {
  cards;
  total;
  dueToday;
}
exports.SpacedCardListResponse = SpacedCardListResponse;
//# sourceMappingURL=spaced-card.dto.js.map

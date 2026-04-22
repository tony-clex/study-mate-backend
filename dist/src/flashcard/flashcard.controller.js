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
var FlashcardController_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.FlashcardController = void 0;
const common_1 = require('@nestjs/common');
const flashcard_service_1 = require('./flashcard.service');
let FlashcardController = (FlashcardController_1 = class FlashcardController {
  flashcardService;
  logger = new common_1.Logger(FlashcardController_1.name);
  constructor(flashcardService) {
    this.flashcardService = flashcardService;
  }
  async generateFlashcards(dto) {
    this.logger.log(
      `[FlashcardController] Generating ${dto.numCards} flashcards for ${dto.fileName}`,
    );
    const result = await this.flashcardService.generateFlashcards(dto);
    return { success: true, ...result };
  }
  async modifyCard(dto) {
    this.logger.log(
      `[FlashcardController] Modifying card ${dto.cardId} with ${dto.modification}`,
    );
    const updatedCard = await this.flashcardService.modifyCard(dto);
    return { success: true, card: updatedCard };
  }
  async chatAboutCards(dto) {
    this.logger.log(`[FlashcardController] Chat about flashcards`);
    const response = await this.flashcardService.chatAboutCards(
      dto.message,
      dto.cards,
    );
    return { success: true, response };
  }
  async regenerateCard(dto) {
    this.logger.log(`[FlashcardController] Regenerating card ${dto.cardId}`);
    const updatedCard = await this.flashcardService.modifyCard({
      cardId: dto.cardId,
      modification: 'examples',
      currentFront: dto.currentFront,
      currentBack: dto.currentBack,
    });
    return { success: true, card: updatedCard };
  }
});
__decorate(
  [
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  FlashcardController.prototype,
  'generateFlashcards',
  null,
);
__decorate(
  [
    (0, common_1.Post)('modify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  FlashcardController.prototype,
  'modifyCard',
  null,
);
__decorate(
  [
    (0, common_1.Post)('chat'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  FlashcardController.prototype,
  'chatAboutCards',
  null,
);
__decorate(
  [
    (0, common_1.Post)('regenerate-card'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  FlashcardController.prototype,
  'regenerateCard',
  null,
);
FlashcardController = FlashcardController_1 = __decorate(
  [
    (0, common_1.Controller)('flashcards'),
    __metadata('design:paramtypes', [flashcard_service_1.FlashcardService]),
  ],
  FlashcardController,
);
exports.FlashcardController = FlashcardController;
//# sourceMappingURL=flashcard.controller.js.map

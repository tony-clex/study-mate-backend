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
var QuizController_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.QuizController = void 0;
const common_1 = require('@nestjs/common');
const quiz_service_1 = require('./quiz.service');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
let QuizController = (QuizController_1 = class QuizController {
  quizService;
  logger = new common_1.Logger(QuizController_1.name);
  constructor(quizService) {
    this.quizService = quizService;
  }
  async explainAnswer(dto) {
    this.logger.log(
      `[QuizController] explainAnswer called for question ${dto.questionId}`,
    );
    const result = await this.quizService.explainAnswer(dto);
    return { success: true, ...result };
  }
  async generateHint(dto) {
    this.logger.log(
      `[QuizController] generateHint called for question ${dto.questionId}`,
    );
    const hint = await this.quizService.generateHint(dto);
    return { success: true, hint };
  }
  async suggestTopics(dto) {
    this.logger.log(
      `[QuizController] suggestTopics called for quiz: ${dto.quizTitle}`,
    );
    const topics = await this.quizService.suggestTopics(dto);
    return { success: true, topics };
  }
  async generateQuiz(dto, req) {
    this.logger.log(
      `[QuizController] generateQuiz called for topic: ${dto.topic}, ${dto.numQuestions} questions`,
    );
    const result = await this.quizService.generateQuiz(req.userId, dto);
    return { success: true, ...result };
  }
  async getAllQuizzes(req) {
    this.logger.log(`[QuizController] getAllQuizzes called`);
    const result = await this.quizService.findAll(req.userId);
    return { success: true, ...result };
  }
  async getQuiz(id, req) {
    this.logger.log(`[QuizController] getQuiz called - id: ${id}`);
    const quiz = await this.quizService.findById(req.userId, id);
    return { success: true, quiz };
  }
  async deleteQuiz(id, req) {
    this.logger.log(`[QuizController] deleteQuiz called - id: ${id}`);
    const result = await this.quizService.delete(req.userId, id);
    return { success: true, ...result };
  }
});
__decorate(
  [
    (0, common_1.Post)('explain'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'explainAnswer',
  null,
);
__decorate(
  [
    (0, common_1.Post)('hint'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'generateHint',
  null,
);
__decorate(
  [
    (0, common_1.Post)('topics'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'suggestTopics',
  null,
);
__decorate(
  [
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'generateQuiz',
  null,
);
__decorate(
  [
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'getAllQuizzes',
  null,
);
__decorate(
  [
    (0, common_1.Get)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'getQuiz',
  null,
);
__decorate(
  [
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, Object]),
    __metadata('design:returntype', Promise),
  ],
  QuizController.prototype,
  'deleteQuiz',
  null,
);
QuizController = QuizController_1 = __decorate(
  [
    (0, common_1.Controller)('quiz'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata('design:paramtypes', [quiz_service_1.QuizService]),
  ],
  QuizController,
);
exports.QuizController = QuizController;
//# sourceMappingURL=quiz.controller.js.map

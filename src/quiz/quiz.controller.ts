import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { QuizService } from './quiz.service';

interface ExplainAnswerDto {
  question: string;
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  sourceText?: string;
  isCorrect: boolean;
}

interface GenerateHintDto {
  question: string;
  questionId: string;
  options: string[];
  attemptedAnswers: string[];
}

interface SuggestTopicsDto {
  quizTitle: string;
  fileName: string;
  sourceText?: string;
}

@Controller('quiz')
export class QuizController {
  private readonly logger = new Logger(QuizController.name);

  constructor(private readonly quizService: QuizService) {}

  @Post('explain')
  @HttpCode(HttpStatus.OK)
  async explainAnswer(@Body() dto: ExplainAnswerDto) {
    this.logger.log(
      `[QuizController] explainAnswer called for question ${dto.questionId}`,
    );

    const result = await this.quizService.explainAnswer(dto);

    return { success: true, ...result };
  }

  @Post('hint')
  @HttpCode(HttpStatus.OK)
  async generateHint(@Body() dto: GenerateHintDto) {
    this.logger.log(
      `[QuizController] generateHint called for question ${dto.questionId}`,
    );

    const hint = await this.quizService.generateHint(dto);

    return { success: true, hint };
  }

  @Post('topics')
  @HttpCode(HttpStatus.OK)
  async suggestTopics(@Body() dto: SuggestTopicsDto) {
    this.logger.log(
      `[QuizController] suggestTopics called for quiz: ${dto.quizTitle}`,
    );

    const topics = await this.quizService.suggestTopics(dto);

    return { success: true, topics };
  }
}

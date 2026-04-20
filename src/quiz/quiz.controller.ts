import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
  userId: string;
}

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

interface GenerateQuizDto {
  topic: string;
  numQuestions: number;
  fileName?: string;
  sourceText?: string;
}

@Controller('quiz')
@UseGuards(JwtAuthGuard)
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

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateQuiz(
    @Body() dto: GenerateQuizDto,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(
      `[QuizController] generateQuiz called for topic: ${dto.topic}, ${dto.numQuestions} questions`,
    );

    const result = await this.quizService.generateQuiz(req.userId, dto);

    return { success: true, ...result };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllQuizzes(@Request() req: AuthenticatedRequest) {
    this.logger.log(`[QuizController] getAllQuizzes called`);

    const result = await this.quizService.findAll(req.userId);

    return { success: true, ...result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getQuiz(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    this.logger.log(`[QuizController] getQuiz called - id: ${id}`);

    const quiz = await this.quizService.findById(req.userId, id);

    return { success: true, quiz };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteQuiz(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    this.logger.log(`[QuizController] deleteQuiz called - id: ${id}`);

    const result = await this.quizService.delete(req.userId, id);

    return { success: true, ...result };
  }
}

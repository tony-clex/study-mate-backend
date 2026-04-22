import { QuizService } from './quiz.service';
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
export declare class QuizController {
  private readonly quizService;
  private readonly logger;
  constructor(quizService: QuizService);
  explainAnswer(dto: ExplainAnswerDto): Promise<{
    explanation: string;
    deeperExplanation: string;
    relatedConcept: string | null;
    success: boolean;
  }>;
  generateHint(dto: GenerateHintDto): Promise<{
    success: boolean;
    hint: string;
  }>;
  suggestTopics(dto: SuggestTopicsDto): Promise<{
    success: boolean;
    topics: string[];
  }>;
  generateQuiz(
    dto: GenerateQuizDto,
    req: AuthenticatedRequest,
  ): Promise<{
    id: string;
    userId: string;
    title: string;
    topic: string | null;
    questions: import('./quiz.service').QuizQuestion[];
    numQuestions: number;
    sourceFileName: string | null;
    createdAt: string;
    success: boolean;
  }>;
  getAllQuizzes(req: AuthenticatedRequest): Promise<{
    quizzes: import('./quiz.service').QuizResponse[];
    total: number;
    success: boolean;
  }>;
  getQuiz(
    id: string,
    req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    quiz: import('./quiz.service').QuizResponse;
  }>;
  deleteQuiz(
    id: string,
    req: AuthenticatedRequest,
  ): Promise<{
    message: string;
    success: boolean;
  }>;
}
export {};

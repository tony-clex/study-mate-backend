import { AiService } from '../ai/ai.service';
interface QuizExplanationInput {
  question: string;
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  sourceText?: string;
  isCorrect: boolean;
}
interface QuizHintInput {
  question: string;
  questionId: string;
  options: string[];
  attemptedAnswers: string[];
}
interface QuizTopicInput {
  quizTitle: string;
  fileName: string;
  sourceText?: string;
}
interface GenerateQuizInput {
  topic: string;
  numQuestions: number;
  fileName?: string;
  sourceText?: string;
}
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}
export interface QuizResponse {
  id: string;
  userId: string;
  title: string;
  topic: string | null;
  questions: QuizQuestion[];
  numQuestions: number;
  sourceFileName: string | null;
  createdAt: string;
}
export interface QuizListResponse {
  quizzes: QuizResponse[];
  total: number;
}
export declare class QuizService {
  private readonly aiService;
  private readonly logger;
  constructor(aiService: AiService);
  explainAnswer(input: QuizExplanationInput): Promise<{
    explanation: string;
    deeperExplanation: string;
    relatedConcept: string | null;
  }>;
  generateHint(input: QuizHintInput): Promise<string>;
  suggestTopics(input: QuizTopicInput): Promise<string[]>;
  generateQuiz(userId: string, input: GenerateQuizInput): Promise<QuizResponse>;
  findById(userId: string, quizId: string): Promise<QuizResponse>;
  findAll(userId: string): Promise<QuizListResponse>;
  delete(
    userId: string,
    quizId: string,
  ): Promise<{
    message: string;
  }>;
  private parseJsonResponse;
}
export {};

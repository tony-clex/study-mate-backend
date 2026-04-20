import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
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

interface QuizDbRow {
  id: string;
  user_id: string;
  title: string;
  topic: string | null;
  questions: QuizQuestion[];
  num_questions: number;
  source_file_name: string | null;
  created_at: string;
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

interface SupabaseError {
  message: string;
}

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(private readonly aiService: AiService) {}

  async explainAnswer(input: QuizExplanationInput): Promise<{
    explanation: string;
    deeperExplanation: string;
    relatedConcept: string | null;
  }> {
    try {
      this.logger.log(
        `[QuizService] Explaining answer for question ${input.questionId}`,
      );

      const sourceContext = input.sourceText
        ? `\n\nSOURCE MATERIAL:\n${input.sourceText.slice(0, 8000)}`
        : '';

      const correctness = input.isCorrect ? 'CORRECT' : 'INCORRECT';

      const prompt = `You are a helpful study assistant for the StudyMate app.

The student just answered a quiz question.

QUESTION: ${input.question}
YOUR ANSWER: ${input.userAnswer}
CORRECT ANSWER: ${input.correctAnswer}
RESULT: ${correctness}${sourceContext}

INSTRUCTIONS:
- If the answer is correct: Provide encouragement and briefly explain WHY it's correct
- If the answer is incorrect: Explain the misconception simply and guide to the correct understanding
- Keep your response concise and encouraging
- Use a warm, supportive tone
- If source material is available, tie your explanation to specific facts from it

Format your response as JSON with this exact structure:
{
  "explanation": "Your 1-2 sentence explanation",
  "deeperExplanation": "More detailed explanation (can be empty)",
  "relatedConcept": "Related concept or null"
}`;

      const responseText = await this.aiService.generateText(prompt);

      const parsed = this.parseJsonResponse(responseText);

      const parsedTyped = parsed as {
        explanation?: string;
        deeperExplanation?: string;
        relatedConcept?: string | null;
      };

      return {
        explanation: parsedTyped?.explanation || input.explanation,
        deeperExplanation: parsedTyped?.deeperExplanation || '',
        relatedConcept: parsedTyped?.relatedConcept || null,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[QuizService] Explanation error: ${err.message}`);
      return {
        explanation: input.explanation,
        deeperExplanation: '',
        relatedConcept: null,
      };
    }
  }

  async generateHint(input: QuizHintInput): Promise<string> {
    try {
      this.logger.log(
        `[QuizService] Generating hint for question ${input.questionId}`,
      );

      const attemptedText =
        input.attemptedAnswers.length > 0
          ? `\n\nAlready attempted: ${input.attemptedAnswers.join(', ')}`
          : '';

      const prompt = `You are a study assistant helping a student with a quiz question.

QUESTION: ${input.question}
OPTIONS: ${input.options.join(', ')}${attemptedText}

INSTRUCTIONS:
- Provide a subtle hint that helps them reason through the question
- Do NOT give away the answer directly
- Guide their thinking without solving it for them
- Keep it to 1-2 sentences
- Use an encouraging tone

Respond with just the hint text, no extra formatting.`;

      const hintText = await this.aiService.generateText(prompt);
      return hintText.trim();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[QuizService] Hint generation error: ${err.message}`);
      return 'Think about how this concept applies to the source material.';
    }
  }

  async suggestTopics(input: QuizTopicInput): Promise<string[]> {
    try {
      this.logger.log(
        `[QuizService] Suggesting topics for quiz: ${input.quizTitle}`,
      );

      const sourceContext = input.sourceText
        ? `\n\nSOURCE MATERIAL (excerpt):\n${input.sourceText.slice(0, 5000)}`
        : '';

      const prompt = `You are a study assistant for the StudyMate app.

A quiz was generated from: ${input.fileName}
Quiz title: ${input.quizTitle}${sourceContext}

INSTRUCTIONS:
- Suggest 3-5 study topics that would help the student do well on this quiz
- Focus on the key concepts being tested
- Keep topics concise (2-4 words each)
- Prioritize topics that require understanding, not just memorization

Respond as a JSON array of topic strings.`;

      const responseText = await this.aiService.generateText(prompt);

      const parsed = this.parseJsonResponse(responseText, true);

      if (Array.isArray(parsed)) {
        const stringArray = parsed as string[];
        return stringArray.filter((t): t is string => typeof t === 'string');
      }

      const topicsMatch = responseText.match(/\[[\s\S]*\]/);
      if (topicsMatch) {
        try {
          const topics = JSON.parse(topicsMatch[0]) as unknown[];
          const stringTopics = topics as string[];
          return stringTopics.filter(
            (t: unknown): t is string => typeof t === 'string',
          );
        } catch {
          return [];
        }
      }

      return [];
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[QuizService] Topic suggestion error: ${err.message}`);
      return [];
    }
  }

  async generateQuiz(
    userId: string,
    input: GenerateQuizInput,
  ): Promise<QuizResponse> {
    try {
      this.logger.log(
        `[QuizService] Generating quiz for topic: ${input.topic}, ${input.numQuestions} questions`,
      );

      const questions = await this.aiService.generateQuiz(
        input.topic,
        input.numQuestions,
        input.sourceText,
      );

      const title = `Quiz: ${input.topic}`;

      const { data, error } = (await supabaseAdmin
        .from('quizzes')
        .insert({
          user_id: userId,
          title,
          topic: input.topic,
          questions: questions.questions,
          num_questions: input.numQuestions,
          source_file_name: input.fileName || null,
        })
        .select()
        .single()) as { data: QuizDbRow | null; error: SupabaseError | null };

      if (error) {
        this.logger.error(`[QuizService] Save quiz error: ${error.message}`);
        throw new BadRequestException('Failed to save quiz');
      }

      if (!data) {
        throw new BadRequestException('Failed to save quiz: no data returned');
      }

      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        topic: data.topic,
        questions: data.questions,
        numQuestions: data.num_questions,
        sourceFileName: data.source_file_name,
        createdAt: data.created_at,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[QuizService] Quiz generation error: ${err.message}`);
      throw new Error(`Failed to generate quiz: ${err.message}`);
    }
  }

  async findById(userId: string, quizId: string): Promise<QuizResponse> {
    this.logger.log(`[QuizService] findById called - quizId: ${quizId}`);

    const { data, error } = (await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('user_id', userId)
      .single()) as { data: QuizDbRow | null; error: SupabaseError | null };

    if (error || !data) {
      throw new NotFoundException('Quiz not found');
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      topic: data.topic,
      questions: data.questions,
      numQuestions: data.num_questions,
      sourceFileName: data.source_file_name,
      createdAt: data.created_at,
    };
  }

  async findAll(userId: string): Promise<QuizListResponse> {
    this.logger.log(`[QuizService] findAll called - userId: ${userId}`);

    const { data, error } = (await supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: QuizDbRow[] | null;
      error: SupabaseError | null;
    };

    if (error) {
      this.logger.error(`[QuizService] findAll error: ${error.message}`);
      throw new BadRequestException('Failed to fetch quizzes');
    }

    const quizzes = (data ?? []).map((quiz) => ({
      id: quiz.id,
      userId: quiz.user_id,
      title: quiz.title,
      topic: quiz.topic,
      questions: quiz.questions,
      numQuestions: quiz.num_questions,
      sourceFileName: quiz.source_file_name,
      createdAt: quiz.created_at,
    }));

    return {
      quizzes,
      total: quizzes.length,
    };
  }

  async delete(userId: string, quizId: string): Promise<{ message: string }> {
    await this.findById(userId, quizId);

    const { error } = await supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', quizId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`[QuizService] delete error: ${error.message}`);
      throw new BadRequestException('Failed to delete quiz');
    }

    return { message: 'Quiz deleted successfully' };
  }

  private parseJsonResponse(text: string, isArray = false): unknown {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`[QuizService] JSON parse error: ${err.message}`);
    }
    return isArray ? [] : {};
  }
}

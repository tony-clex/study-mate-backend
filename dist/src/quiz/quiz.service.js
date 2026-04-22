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
var QuizService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.QuizService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
const ai_service_1 = require('../ai/ai.service');
let QuizService = (QuizService_1 = class QuizService {
  aiService;
  logger = new common_1.Logger(QuizService_1.name);
  constructor(aiService) {
    this.aiService = aiService;
  }
  async explainAnswer(input) {
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
      const parsedTyped = parsed;
      return {
        explanation: parsedTyped?.explanation || input.explanation,
        deeperExplanation: parsedTyped?.deeperExplanation || '',
        relatedConcept: parsedTyped?.relatedConcept || null,
      };
    } catch (error) {
      const err = error;
      this.logger.error(`[QuizService] Explanation error: ${err.message}`);
      return {
        explanation: input.explanation,
        deeperExplanation: '',
        relatedConcept: null,
      };
    }
  }
  async generateHint(input) {
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
      const err = error;
      this.logger.error(`[QuizService] Hint generation error: ${err.message}`);
      return 'Think about how this concept applies to the source material.';
    }
  }
  async suggestTopics(input) {
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
        const stringArray = parsed;
        return stringArray.filter((t) => typeof t === 'string');
      }
      const topicsMatch = responseText.match(/\[[\s\S]*\]/);
      if (topicsMatch) {
        try {
          const topics = JSON.parse(topicsMatch[0]);
          const stringTopics = topics;
          return stringTopics.filter((t) => typeof t === 'string');
        } catch {
          return [];
        }
      }
      return [];
    } catch (error) {
      const err = error;
      this.logger.error(`[QuizService] Topic suggestion error: ${err.message}`);
      return [];
    }
  }
  async generateQuiz(userId, input) {
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
      const { data, error } = await supabase_client_1.supabaseAdmin
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
        .single();
      if (error) {
        this.logger.error(`[QuizService] Save quiz error: ${error.message}`);
        throw new common_1.BadRequestException('Failed to save quiz');
      }
      if (!data) {
        throw new common_1.BadRequestException(
          'Failed to save quiz: no data returned',
        );
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
      const err = error;
      this.logger.error(`[QuizService] Quiz generation error: ${err.message}`);
      throw new Error(`Failed to generate quiz: ${err.message}`);
    }
  }
  async findById(userId, quizId) {
    this.logger.log(`[QuizService] findById called - quizId: ${quizId}`);
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('user_id', userId)
      .single();
    if (error || !data) {
      throw new common_1.NotFoundException('Quiz not found');
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
  async findAll(userId) {
    this.logger.log(`[QuizService] findAll called - userId: ${userId}`);
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      this.logger.error(`[QuizService] findAll error: ${error.message}`);
      throw new common_1.BadRequestException('Failed to fetch quizzes');
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
  async delete(userId, quizId) {
    await this.findById(userId, quizId);
    const { error } = await supabase_client_1.supabaseAdmin
      .from('quizzes')
      .delete()
      .eq('id', quizId)
      .eq('user_id', userId);
    if (error) {
      this.logger.error(`[QuizService] delete error: ${error.message}`);
      throw new common_1.BadRequestException('Failed to delete quiz');
    }
    return { message: 'Quiz deleted successfully' };
  }
  parseJsonResponse(text, isArray = false) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      const err = error;
      this.logger.warn(`[QuizService] JSON parse error: ${err.message}`);
    }
    return isArray ? [] : {};
  }
});
QuizService = QuizService_1 = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [ai_service_1.AiService]),
  ],
  QuizService,
);
exports.QuizService = QuizService;
//# sourceMappingURL=quiz.service.js.map

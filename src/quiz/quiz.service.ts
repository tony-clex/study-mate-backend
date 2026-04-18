import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GenerateContentResult,
} from '@google/generative-ai';
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

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly aiService: AiService) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async explainAnswer(input: QuizExplanationInput): Promise<{
    explanation: string;
    deeperExplanation: string;
    relatedConcept: string | null;
  }> {
    try {
      this.logger.log(
        `[QuizService] Explaining answer for question ${input.questionId}`,
      );

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

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
- If the answer is incorrect: Explain the误区 (misconception) simply and guide to the correct understanding
- Keep your response concise and encouraging
- Use a warm, supportive tone
- If source material is available, tie your explanation to specific facts from it

Format your response as JSON with this exact structure:
{
  "explanation": "Your 1-2 sentence explanation of why the answer is correct or what was misunderstood",
  "deeperExplanation": "A slightly more detailed explanation that adds context (can be empty if not needed)",
  "relatedConcept": "A related concept from the material that might help (or null if not applicable)"
}`;

      const result: GenerateContentResult = await model.generateContent(prompt);
      const responseText: string = result.response.text();

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

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

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
- Use a encouraging tone

Respond with just the hint text, no extra formatting.`;

      const result: GenerateContentResult = await model.generateContent(prompt);
      const hintText: string = result.response.text();
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

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

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

      const result: GenerateContentResult = await model.generateContent(prompt);
      const responseText: string = result.response.text();

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

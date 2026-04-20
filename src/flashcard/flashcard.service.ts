import { Injectable, Logger } from '@nestjs/common';
import {
  GoogleGenerativeAI,
  GenerateContentResult,
} from '@google/generative-ai';
import { AiService } from '../ai/ai.service';

interface FlashcardInput {
  numCards: number;
  fileName: string;
  sourceText?: string;
  mimeType?: string;
}

export interface GeneratedCard {
  id: string;
  front: string;
  back: string;
}

interface CardModificationInput {
  cardId: string;
  modification: 'simpler' | 'harder' | 'examples';
  currentFront: string;
  currentBack: string;
}

const FLASHCARD_SYSTEM_PROMPT = `You are an Expert Academic Strategist & Flashcard Creator.

Your task is to convert the user's uploaded document/image/text into high-quality flashcards.

Rules for Card Generation:
1. Atomic Design: Each card must contain only ONE discrete idea.
2. Front/Back Format: Generate cards in a JSON-ready format with 'front' and 'back' keys.
3. Image/PDF Processing: Extract text accurately. If the content is a diagram, describe the process and create cards based on the logic of that diagram.
4. Active Recall: Phrase the 'front' of the card as a question or a 'fill-in-the-blank' (Cloze) rather than just a keyword.
5. Quality Control: Do not generate more than 15 cards at a time unless requested. Focus on the most important concepts.

Output Format: Valid JSON array with objects containing:
- id: unique card identifier (like "card-1", "card-2", etc.)
- front: the question or prompt (active recall format)
- back: the answer or explanation`;

@Injectable()
export class FlashcardService {
  private readonly logger = new Logger(FlashcardService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly aiService: AiService) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateFlashcards(input: FlashcardInput): Promise<{
    id: string;
    title: string;
    cardCount: number;
    cards: GeneratedCard[];
  }> {
    try {
      this.logger.log(
        `[FlashcardService] Generating ${input.numCards} flashcards for ${input.fileName}`,
      );

      const sourceText = input.sourceText || '';
      const truncatedText = sourceText.slice(0, 18000);

      const prompt = `Generate exactly ${input.numCards} flashcards based on the following content:
${truncatedText}

Return ONLY a valid JSON array (no other text) with exactly ${input.numCards} cards. Each card must have:
- id: unique string like "card-1", "card-2", etc.
- front: string - phrase as a question or fill-in-the-blank (active recall)
- back: string - the answer or explanation

Follow the rules:
1. Atomic Design: Each card contains only ONE discrete idea
2. Front/Back Format: JSON with 'front' and 'back' keys
3. Active Recall: Phrase as question or fill-in-the-blank
4. Quality: Focus on important concepts (max 15 unless requested)`;

      const providers: Array<{
        name: string;
        generate: () => Promise<string>;
      }> = [];

      if (process.env.OPENROUTER_API_KEY) {
        providers.push({
          name: 'openrouter',
          generate: () =>
            this.generateWithOpenRouter(FLASHCARD_SYSTEM_PROMPT, prompt),
        });
      }

      if (process.env.GROQ_API_KEY) {
        providers.push({
          name: 'groq',
          generate: () => this.generateWithGroq(prompt),
        });
      }

      if (process.env.GEMINI_API_KEY) {
        providers.push({
          name: 'gemini',
          generate: () => this.generateWithGemini(prompt),
        });
      }

      if (providers.length === 0) {
        throw new Error(
          'No AI providers configured. Set OPENROUTER_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.',
        );
      }

      const errors: string[] = [];
      for (const provider of providers) {
        try {
          this.logger.log(`[FlashcardService] Trying ${provider.name}...`);
          const responseText = await provider.generate();
          const cards = this.parseFlashcardsJson(responseText, input.numCards);

          if (cards.length > 0) {
            return {
              id: `deck-${Date.now()}`,
              title: `${input.fileName} Flashcards`,
              cardCount: cards.length,
              cards,
            };
          }
        } catch (error) {
          const err = error as Error;
          errors.push(`${provider.name}: ${err.message}`);
          this.logger.warn(
            `[FlashcardService] ${provider.name} failed: ${err.message}`,
          );
        }
      }

      throw new Error(`All providers failed: ${errors.join(' | ')}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[FlashcardService] Generation error: ${err.message}`);
      throw new Error(`Failed to generate flashcards: ${err.message}`);
    }
  }

  private async generateWithGemini(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
    });
    const result: GenerateContentResult = await model.generateContent(prompt);
    return result.response.text();
  }

  private async generateWithOpenRouter(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  private async generateWithGroq(prompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('GROQ_API_KEY not configured');
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  }

  async modifyCard(input: CardModificationInput): Promise<GeneratedCard> {
    try {
      this.logger.log(
        `[FlashcardService] Modifying card ${input.cardId} with ${input.modification}`,
      );

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

      const modificationInstructions: Record<string, string> = {
        simpler:
          'Rewrite this card with simpler language that a beginner can understand. Keep the same core concept.',
        harder:
          'Rewrite this card with more challenging phrasing or add edge cases to test deeper understanding.',
        examples: 'Add concrete examples to the answer portion of this card.',
      };

      const prompt = `Original card:
Q: ${input.currentFront}
A: ${input.currentBack}

Request: ${modificationInstructions[input.modification]}

Return ONLY a valid JSON object (no other text) with:
- id: "${input.cardId}"
- front: the updated question
- back: the updated answer`;

      const result: GenerateContentResult = await model.generateContent(prompt);
      const responseText: string = result.response.text();

      const parsed = this.parseJsonResponse(responseText);
      const typed = parsed as { front?: string; back?: string };

      return {
        id: input.cardId,
        front: typed?.front || input.currentFront,
        back: typed?.back || input.currentBack,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `[FlashcardService] Modification error: ${err.message}`,
      );
      throw new Error(`Failed to modify card: ${err.message}`);
    }
  }

  async chatAboutCards(
    message: string,
    deckCards: GeneratedCard[],
  ): Promise<string> {
    try {
      this.logger.log(`[FlashcardService] Chat about flashcards`);

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

      const cardsSummary = deckCards
        .map(
          (card, index) =>
            `Card #${index + 1}:\nQ: ${card.front}\nA: ${card.back}`,
        )
        .join('\n\n');

      const prompt = `You are an Expert Academic Strategist helping the user understand their flashcard deck.

Cards in the deck:
${cardsSummary}

User question: ${message}

Instructions:
- If asking about specific cards, reference them by number
- Use analogies for explanations
- Keep responses concise but thorough
- If the user asks for "Simpler explanations", "More examples", or "Make these harder", offer to modify specific cards

Provide a helpful response.`;

      const result: GenerateContentResult = await model.generateContent(prompt);
      const responseText: string = result.response.text();

      return responseText.trim();
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[FlashcardService] Chat error: ${err.message}`);
      throw new Error(`Failed to get response: ${err.message}`);
    }
  }

  private parseFlashcardsJson(
    text: string,
    expectedCount: number,
  ): GeneratedCard[] {
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed: unknown = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed
        .map((item: unknown, index: number) => {
          if (!item || typeof item !== 'object') return null;

          const record = item as Record<string, unknown>;
          const front =
            typeof record.front === 'string' ? record.front.trim() : '';
          const back =
            typeof record.back === 'string' ? record.back.trim() : '';

          if (!front || !back) return null;

          return {
            id:
              typeof record.id === 'string'
                ? record.id.trim()
                : `card-${index + 1}`,
            front,
            back,
          };
        })
        .filter((item): item is GeneratedCard => item !== null)
        .slice(0, expectedCount);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[FlashcardService] Parse error: ${err.message}`);
      return [];
    }
  }

  private parseJsonResponse(text: string): unknown {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.warn(`[FlashcardService] JSON parse error: ${err.message}`);
    }
    return {};
  }
}

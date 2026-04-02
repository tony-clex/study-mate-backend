import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly blockedPdfExtractionPhrases = [
    'after reading the pdf',
    'the pdf appears to be',
    'the document contains metadata',
    'the lack of actual content',
    'in summary',
    'unfortunately',
    'challenging to provide',
    'scanned document',
    'metadata, such as the title',
    'camscanner branding',
    'partially unreadable',
  ];

  constructor() {
    // Ensure your GEMINI_API_KEY is in your .env file
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  /**
   * Generates a vector embedding for a piece of text.
   * This allows Supabase to "search" by meaning rather than just keywords.
   */
  async getEmbedding(text: string): Promise<number[]> {
    try {
      this.logger.log(`[AiService] Generating embedding...`);

      // Use the current Gemini embeddings model supported by the v1beta API.
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-embedding-001',
      });

      // 2. Call the Google API
      const result = await model.embedContent(text);
      const embedding = result.embedding;

      if (!embedding || !embedding.values) {
        throw new Error('Google API returned an empty embedding result.');
      }

      this.logger.log(`[AiService] Embedding generated successfully.`);
      return embedding.values;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini Embedding Error: ${message}`);
      throw new Error(`Failed to generate AI embedding: ${message}`);
    }
  }

  /**
   * Main Chat function to answer questions based on notes.
   */
  async generateAnswer(question: string, context: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

      const prompt = `
        You are a helpful Study Assistant. 
        Use the following excerpts from the student's notes to answer their question.
        If the answer isn't in the notes, say you don't know based on the documents.
        
        NOTES:
        ${context}

        QUESTION:
        ${question}
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini Chat Error: ${message}`);
      return "I'm sorry, I ran into an error trying to process that question.";
    }
  }

  /**
   * Extracts study-relevant text from a PDF using Gemini's native document understanding.
   * Useful when scanner-generated PDFs have weak or noisy text layers.
   */
  async extractStudyTextFromPdf(pdfBuffer: Buffer): Promise<string> {
    const prompt = `You are performing OCR-style extraction for a study app.

Your task is to transcribe the educational content visible in this PDF into plain text.

Rules:
- Return only the text that is actually visible in the PDF
- Do not summarize, explain, describe, or comment on the PDF
- Do not mention metadata, file properties, or that the file is scanned
- Ignore scanner watermarks such as CamScanner
- Ignore repeated headers, footers, page numbers, and decorative text
- Preserve headings, formulas, worked examples, questions, and paragraph text
- If some lines are unclear, skip only the unclear parts and keep the readable study content
- If there is no readable educational text at all, return exactly: NO_READABLE_STUDY_TEXT`;

    try {
      return this.validatePdfExtractionOutput(
        await this.extractStudyTextFromPdfWithGemini(pdfBuffer, prompt),
      );
    } catch (geminiError: unknown) {
      const geminiMessage =
        geminiError instanceof Error ? geminiError.message : 'Unknown error';
      this.logger.warn(
        `[AiService] Gemini PDF extraction failed: ${geminiMessage}. Trying OpenRouter...`,
      );

      try {
        return this.validatePdfExtractionOutput(
          await this.extractStudyTextFromPdfWithOpenRouter(pdfBuffer, prompt),
        );
      } catch (openrouterError: unknown) {
        const openrouterMessage =
          openrouterError instanceof Error
            ? openrouterError.message
            : 'Unknown error';
        this.logger.error(
          `OpenRouter PDF Extraction Error: ${openrouterMessage}`,
        );
        throw new Error(
          `Failed to extract study text from PDF: ${openrouterMessage}`,
        );
      }
    }
  }

  private validatePdfExtractionOutput(extractedText: string): string {
    const normalized = extractedText.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!normalized) {
      throw new Error('PDF extraction returned empty output.');
    }

    if (normalized === 'no_readable_study_text') {
      throw new Error('No readable study text was found in the PDF.');
    }

    if (
      this.blockedPdfExtractionPhrases.some((phrase) =>
        normalized.includes(phrase),
      )
    ) {
      throw new Error(
        'PDF extraction returned a summary/metadata description instead of OCR text.',
      );
    }

    return extractedText;
  }

  async answerQuestionAboutPdf(
    pdfBuffer: Buffer,
    question: string,
    fileName: string,
  ): Promise<string> {
    const prompt = `You are a brilliant study assistant for the "Study-Mate" app.

The student uploaded a PDF file and wants help understanding it.

FILE NAME:
${fileName}

STUDENT QUESTION:
${question}

INSTRUCTIONS:
- Read the PDF itself and answer from its contents
- Explain clearly and simply
- If the PDF is partially readable, still give the best useful explanation you can from what is visible
- Mention briefly if parts of the PDF were unclear or hard to read
- Do not talk about API limitations or provider internals`;

    try {
      return await this.answerQuestionAboutPdfWithOpenRouter(
        pdfBuffer,
        prompt,
        fileName,
      );
    } catch (openrouterError: unknown) {
      const openrouterMessage =
        openrouterError instanceof Error
          ? openrouterError.message
          : 'Unknown error';
      this.logger.warn(
        `[AiService] OpenRouter PDF Q&A failed: ${openrouterMessage}. Trying Gemini...`,
      );

      return await this.answerQuestionAboutPdfWithGemini(pdfBuffer, prompt);
    }
  }

  private async extractStudyTextFromPdfWithGemini(
    pdfBuffer: Buffer,
    prompt: string,
  ): Promise<string> {
    this.logger.log('[AiService] Extracting study text from PDF with Gemini...');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
    });

    const pdfPart = {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    const result = await model.generateContent([prompt, pdfPart]);
    const extractedText = result.response.text().trim();

    if (!extractedText) {
      throw new Error('Gemini returned empty PDF extraction output.');
    }

    this.logger.log(
      `[AiService] Gemini PDF extraction complete: ${extractedText.length} characters`,
    );
    return extractedText;
  }

  private async extractStudyTextFromPdfWithOpenRouter(
    pdfBuffer: Buffer,
    prompt: string,
  ): Promise<string> {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    this.logger.log(
      '[AiService] Extracting study text from PDF with OpenRouter...',
    );

    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3-8b-instruct',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'file',
                file: {
                  filename: 'study-material.pdf',
                  file_data: dataUrl,
                },
              },
            ],
          },
        ],
        plugins: [
          {
            id: 'file-parser',
            pdf: {
              engine: 'cloudflare-ai',
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter request failed with ${response.status}: ${errorText}`,
      );
    }

    const completion = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const extractedText = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!extractedText) {
      throw new Error('OpenRouter returned empty PDF extraction output.');
    }

    this.logger.log(
      `[AiService] OpenRouter PDF extraction complete: ${extractedText.length} characters`,
    );
    return extractedText;
  }

  private async answerQuestionAboutPdfWithGemini(
    pdfBuffer: Buffer,
    prompt: string,
  ): Promise<string> {
    this.logger.log('[AiService] Answering PDF question with Gemini...');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
    });

    const pdfPart = {
      inlineData: {
        data: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };

    const result = await model.generateContent([prompt, pdfPart]);
    const answer = result.response.text().trim();

    if (!answer) {
      throw new Error('Gemini returned empty PDF answer output.');
    }

    this.logger.log(
      `[AiService] Gemini PDF answer complete: ${answer.length} characters`,
    );
    return answer;
  }

  private async answerQuestionAboutPdfWithOpenRouter(
    pdfBuffer: Buffer,
    prompt: string,
    fileName: string,
  ): Promise<string> {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }

    this.logger.log('[AiService] Answering PDF question with OpenRouter...');

    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3-8b-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'file',
                  file: {
                    filename: fileName,
                    file_data: dataUrl,
                  },
                },
              ],
            },
          ],
          plugins: [
            {
              id: 'file-parser',
              pdf: {
                engine: 'cloudflare-ai',
              },
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter request failed with ${response.status}: ${errorText}`,
      );
    }

    const completion = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const answer = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!answer) {
      throw new Error('OpenRouter returned empty PDF answer output.');
    }

    this.logger.log(
      `[AiService] OpenRouter PDF answer complete: ${answer.length} characters`,
    );
    return answer;
  }

  /**
   * Analyzes an image using Gemini Vision and returns a detailed description.
   */
  async analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      this.logger.log(`[AiService] Analyzing image with Gemini Vision...`);

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });

      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const prompt = `Describe this image in detail. Include:
1. What objects, people, or scenes are visible
2. Any text or writing in the image
3. Colors, patterns, and visual elements
4. The context or purpose of the image (if apparent)
5. Any educational or study-related content

Be thorough and descriptive.`;

      const result = await model.generateContent([prompt, imagePart]);
      const description = result.response.text();

      this.logger.log(
        `[AiService] Image analysis complete: ${description.length} characters`,
      );
      return description;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini Vision Error: ${message}`);
      throw new Error(`Failed to analyze image: ${message}`);
    }
  }
}

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
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var AiService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.AiService = void 0;
const common_1 = require('@nestjs/common');
const generative_ai_1 = require('@google/generative-ai');
const pdf_parse_fork_1 = __importDefault(require('pdf-parse-fork'));
let AiService = (AiService_1 = class AiService {
  logger = new common_1.Logger(AiService_1.name);
  genAI;
  blockedPdfExtractionPhrases = [
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
    this.genAI = new generative_ai_1.GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || '',
    );
  }
  normalizeImageMimeType(mimeType) {
    const normalized = (mimeType || 'image/jpeg')
      .toLowerCase()
      .split(';')[0]
      .trim();
    if (normalized === 'image/jpg' || normalized === 'image/pjpeg') {
      return 'image/jpeg';
    }
    if (normalized === 'image/x-heic') {
      return 'image/heic';
    }
    if (normalized === 'image/x-heif') {
      return 'image/heif';
    }
    return normalized || 'image/jpeg';
  }
  isHistoryEntry(value) {
    return typeof value === 'object' && value !== null;
  }
  async getEmbedding(text) {
    try {
      this.logger.log(`[AiService] Generating embedding...`);
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-embedding-001',
      });
      const result = await model.embedContent(text);
      const embedding = result.embedding;
      if (!embedding || !embedding.values) {
        throw new Error('Google API returned an empty embedding result.');
      }
      this.logger.log(`[AiService] Embedding generated successfully.`);
      return embedding.values;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini Embedding Error: ${message}`);
      throw new Error(`Failed to generate AI embedding: ${message}`);
    }
  }
  async generateAnswer(question, context) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini Chat Error: ${message}`);
      return "I'm sorry, I ran into an error trying to process that question.";
    }
  }
  async extractStudyTextFromPdf(pdfBuffer) {
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
    } catch (geminiError) {
      const geminiMessage =
        geminiError instanceof Error ? geminiError.message : 'Unknown error';
      this.logger.warn(
        `[AiService] Gemini PDF extraction failed (likely quota): ${geminiMessage}. Trying OpenRouter...`,
      );
      try {
        return this.validatePdfExtractionOutput(
          await this.extractStudyTextFromPdfWithOpenRouter(pdfBuffer, prompt),
        );
      } catch (openrouterError) {
        const openrouterMessage =
          openrouterError instanceof Error
            ? openrouterError.message
            : 'Unknown error';
        this.logger.error(
          `OpenRouter PDF Extraction Error: ${openrouterMessage}`,
        );
        try {
          this.logger.warn(
            '[AiService] Trying Groq text extraction as final fallback...',
          );
          return this.validatePdfExtractionOutput(
            await this.extractPdfWithGroq(pdfBuffer),
          );
        } catch (groqError) {
          const groqMessage =
            groqError instanceof Error ? groqError.message : 'Unknown error';
          throw new Error(
            `All PDF extraction providers failed. Gemini: ${geminiMessage} | OpenRouter: ${openrouterMessage} | Groq: ${groqMessage}`,
          );
        }
      }
    }
  }
  validatePdfExtractionOutput(extractedText) {
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
  async answerQuestionAboutPdf(pdfBuffer, question, fileName) {
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
    const providers = [
      {
        name: 'OpenRouter',
        fn: () =>
          this.answerQuestionAboutPdfWithOpenRouter(
            pdfBuffer,
            prompt,
            fileName,
          ),
      },
      {
        name: 'Gemini',
        fn: () => this.answerQuestionAboutPdfWithGemini(pdfBuffer, prompt),
      },
      {
        name: 'Groq',
        fn: () =>
          this.answerQuestionAboutPdfWithGroq(pdfBuffer, question, fileName),
      },
    ];
    const errors = [];
    for (const provider of providers) {
      try {
        this.logger.log(`[AiService] Trying ${provider.name} for PDF Q&A...`);
        return await provider.fn();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `[AiService] ${provider.name} PDF Q&A failed: ${message}. Trying next...`,
        );
      }
    }
    throw new Error(`All PDF Q&A providers failed: ${errors.join(' | ')}`);
  }
  async answerQuestionAboutPdfWithGroq(pdfBuffer, question, fileName) {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.logger.log('[AiService] Answering PDF question with Groq...');
    const pdfSizeMB = pdfBuffer.length / (1024 * 1024);
    if (pdfSizeMB > 5) {
      this.logger.warn(
        `[AiService] PDF is ${pdfSizeMB.toFixed(1)}MB - too large for direct Groq vision. Extracting text first.`,
      );
      const extractedText = await this.extractPdfWithGroq(pdfBuffer);
      return this.answerFromExtractedTextWithGroq(
        extractedText,
        question,
        fileName,
      );
    }
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const response = await fetch('https://api.groq.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-90b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `You are a brilliant study assistant. Read this PDF and answer the question.\n\nFile: ${fileName}\n\nQuestion: ${question}\n\nAnswer from the PDF contents:`,
              },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq request failed with ${response.status}: ${errorText}`,
      );
    }
    const completion = await response.json();
    const answer = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!answer) {
      throw new Error('Groq returned empty PDF answer');
    }
    this.logger.log(
      `[AiService] Groq PDF answer complete: ${answer.length} characters`,
    );
    return answer;
  }
  async extractStudyTextFromPdfWithGemini(pdfBuffer, prompt) {
    this.logger.log(
      '[AiService] Extracting study text from PDF with Gemini...',
    );
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
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
  async extractStudyTextFromPdfWithOpenRouter(pdfBuffer, prompt) {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured.');
    }
    this.logger.log(
      '[AiService] Extracting study text from PDF with OpenRouter...',
    );
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
          model: 'google/gemini-2.0-flash-001',
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
        }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter request failed with ${response.status}: ${errorText}`,
      );
    }
    const completion = await response.json();
    const extractedText =
      completion.choices?.[0]?.message?.content?.trim() || '';
    if (!extractedText) {
      throw new Error('OpenRouter returned empty PDF extraction output.');
    }
    this.logger.log(
      `[AiService] OpenRouter PDF extraction complete: ${extractedText.length} characters`,
    );
    return extractedText;
  }
  async answerQuestionAboutPdfWithGemini(pdfBuffer, prompt) {
    this.logger.log('[AiService] Answering PDF question with Gemini...');
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
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
  async answerQuestionAboutPdfWithOpenRouter(pdfBuffer, prompt, fileName) {
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
          model: 'google/gemini-2.0-flash-001',
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
        }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter request failed with ${response.status}: ${errorText}`,
      );
    }
    const completion = await response.json();
    const answer = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!answer) {
      throw new Error('OpenRouter returned empty PDF answer output.');
    }
    this.logger.log(
      `[AiService] OpenRouter PDF answer complete: ${answer.length} characters`,
    );
    return answer;
  }
  async extractPdfWithGroq(pdfBuffer) {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.logger.log('[AiService] Extracting PDF text with Groq...');
    try {
      const localText = await (0, pdf_parse_fork_1.default)(pdfBuffer);
      if (localText.text && localText.text.trim().length > 100) {
        const normalized = localText.text.toLowerCase();
        const isBlocked = this.blockedPdfExtractionPhrases.some((phrase) =>
          normalized.includes(phrase),
        );
        if (!isBlocked && localText.text.length > 200) {
          this.logger.log(
            `[AiService] Using locally extracted PDF text (${localText.text.length} chars)`,
          );
          return localText.text;
        }
      }
    } catch {
      this.logger.debug('[AiService] Local PDF parser failed, continuing');
    }
    const pdfSizeMB = pdfBuffer.length / (1024 * 1024);
    if (pdfSizeMB > 5) {
      throw new Error(
        `PDF is ${pdfSizeMB.toFixed(1)}MB - too large for Groq vision. Local parser also failed.`,
      );
    }
    this.logger.warn(
      '[AiService] Local parser insufficient, attempting Groq vision for PDF...',
    );
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `You are performing OCR for a study app. Extract ALL visible text from this PDF exactly as it appears. Do not summarize. If no readable text, say: NO_READABLE_TEXT`,
                },
                {
                  type: 'image_url',
                  image_url: { url: dataUrl },
                },
              ],
            },
          ],
          temperature: 0.1,
        }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq vision request failed: ${response.status} - ${errorText}`,
      );
    }
    const completion = await response.json();
    const extractedText =
      completion.choices?.[0]?.message?.content?.trim() || '';
    if (!extractedText) {
      throw new Error('Groq vision returned empty PDF extraction');
    }
    if (
      extractedText.toLowerCase().includes('no_readable_text') ||
      extractedText.toLowerCase().includes('no readable')
    ) {
      throw new Error('No readable text found in PDF via Groq vision');
    }
    this.logger.log(
      `[AiService] Groq vision PDF extraction complete: ${extractedText.length} characters`,
    );
    return extractedText;
  }
  answerFromExtractedTextWithGroq(extractedText, question, fileName) {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    this.logger.log(
      '[AiService] Answering question from extracted text with Groq...',
    );
    const prompt = `You are a brilliant study assistant. Read this extracted text from a PDF and answer the question.

File: ${fileName}

EXTRACTED TEXT:
${extractedText.slice(0, 15000)}

QUESTION: ${question}

Answer from the PDF contents:`;
    return fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(`Groq request failed with ${res.status}: ${text}`);
          });
        }
        return res.json();
      })
      .then((completion) => {
        const answer = completion.choices?.[0]?.message?.content?.trim() || '';
        if (!answer) {
          throw new Error('Groq returned empty PDF answer');
        }
        return answer;
      });
  }
  async analyzeImage(imageBuffer, mimeType) {
    try {
      this.logger.log(`[AiService] Analyzing image with Gemini Vision...`);
      const normalizedMimeType = this.normalizeImageMimeType(mimeType);
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });
      const imagePart = {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: normalizedMimeType,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Gemini Vision Error: ${message}`);
      throw new Error(`Failed to analyze image: ${message}`);
    }
  }
  async extractTextFromImage(imageBuffer, mimeType) {
    const normalizedMimeType = this.normalizeImageMimeType(mimeType);
    const prompt = `You are performing OCR (Optical Character Recognition) for a study app.

Your task is to extract ALL visible text from this image and transcribe it exactly as it appears.

Rules:
- Extract EVERY piece of text you can see (headings, body text, labels, numbers, equations)
- Preserve the structure: use new lines for separate paragraphs or sections
- Do NOT summarize, describe, or explain the content
- Do NOT mention image quality, blurriness, or that you can't read something
- If there is no readable text at all, return exactly: NO_READABLE_TEXT
- Ignore any watermarks, logos, or decorative elements that aren't meaningful text`;
    try {
      return await this.extractTextFromImageWithGemini(
        imageBuffer,
        normalizedMimeType,
        prompt,
      );
    } catch (geminiError) {
      const geminiMessage =
        geminiError instanceof Error ? geminiError.message : 'Unknown error';
      this.logger.warn(
        `[AiService] Gemini image extraction failed: ${geminiMessage}. Trying OpenRouter...`,
      );
      try {
        return await this.extractTextFromImageWithOpenRouter(
          imageBuffer,
          mimeType,
          prompt,
        );
      } catch (openrouterError) {
        const openrouterMessage =
          openrouterError instanceof Error
            ? openrouterError.message
            : 'Unknown error';
        this.logger.error(
          `[AiService] OpenRouter image extraction failed: ${openrouterMessage}`,
        );
        throw new Error(
          `Failed to extract text from image: ${geminiMessage} | ${openrouterMessage}`,
        );
      }
    }
  }
  async extractTextFromImageWithGemini(imageBuffer, mimeType, prompt) {
    this.logger.log('[AiService] Extracting image text with Gemini...');
    const normalizedMimeType = this.normalizeImageMimeType(mimeType);
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: normalizedMimeType,
      },
    };
    const result = await model.generateContent([prompt, imagePart]);
    const extractedText = result.response.text().trim();
    if (!extractedText) {
      throw new Error('Image returned empty text extraction');
    }
    if (extractedText === 'NO_READABLE_TEXT') {
      throw new Error('No readable text found in the image');
    }
    this.logger.log(
      `[AiService] Gemini image extraction complete: ${extractedText.length} characters`,
    );
    return extractedText;
  }
  async extractTextFromImageWithOpenRouter(imageBuffer, mimeType, prompt) {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    this.logger.log('[AiService] Extracting image text with OpenRouter...');
    const normalizedMimeType = this.normalizeImageMimeType(mimeType);
    const dataUrl = `data:${normalizedMimeType};base64,${imageBuffer.toString('base64')}`;
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
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
    const completion = await response.json();
    const extractedText =
      completion.choices?.[0]?.message?.content?.trim() || '';
    if (!extractedText) {
      throw new Error('OpenRouter returned empty image extraction');
    }
    if (extractedText.toLowerCase().includes('no readable text')) {
      throw new Error('No readable text found in the image');
    }
    this.logger.log(
      `[AiService] OpenRouter image extraction complete: ${extractedText.length} characters`,
    );
    return extractedText;
  }
  async chatWithCompanion(question, history, context = '') {
    const prompt = this.buildCompanionPrompt(question, history, context);
    const providers = [
      {
        name: 'gemini-2.5-flash',
        generate: () =>
          this.generateCompanionWithGemini(prompt, 'gemini-2.5-flash'),
      },
      {
        name: 'gemini-2.0-flash',
        generate: () =>
          this.generateCompanionWithGemini(prompt, 'gemini-2.0-flash'),
      },
      {
        name: 'groq',
        generate: () => this.generateCompanionWithGroq(prompt),
      },
      {
        name: 'openrouter',
        generate: () => this.generateCompanionWithOpenRouter(prompt),
      },
    ];
    const errors = [];
    for (const provider of providers) {
      try {
        this.logger.log(
          `[AiService] Trying companion provider: ${provider.name}`,
        );
        const text = await provider.generate();
        this.logger.log(
          `[AiService] Companion response generated with ${provider.name}`,
        );
        return { text };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `[AiService] Companion provider ${provider.name} failed: ${message}`,
        );
      }
    }
    this.logger.error(`Companion Error: ${errors.join(' | ')}`);
    return {
      text: "I'm sorry, I'm having trouble connecting to my research tools right now.",
    };
  }
  buildHistoryTranscript(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return '';
    }
    return history
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry.trim();
        }
        if (!this.isHistoryEntry(entry)) {
          return '';
        }
        const role = typeof entry.role === 'string' ? entry.role : 'message';
        const content =
          typeof entry.content === 'string'
            ? entry.content.trim()
            : typeof entry.text === 'string'
              ? entry.text.trim()
              : '';
        if (!content) {
          return '';
        }
        return `${role.toUpperCase()}: ${content}`;
      })
      .filter(Boolean)
      .join('\n');
  }
  buildCompanionPrompt(question, history, context) {
    const contextPrefix = context
      ? `[FILE CONTEXT PROVIDED]:\n${context}\n\n---\n\n`
      : '';
    const historyText = this.buildHistoryTranscript(history);
    const historyPrefix = historyText
      ? `CHAT HISTORY:\n${historyText}\n\n---\n\n`
      : '';
    return `${contextPrefix}${historyPrefix}${question}

(Instruction: You are a study companion. Use the provided context if available. If a visual would help explain a complex concept, start a new line with exactly: [GENERATE_IMAGE: description of image])`;
  }
  async generateCompanionWithGemini(prompt, modelName) {
    const model = this.genAI.getGenerativeModel({
      model: modelName,
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) {
      throw new Error(`Gemini model ${modelName} returned empty output.`);
    }
    return text;
  }
  async generateCompanionWithGroq(prompt) {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1500,
        }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Groq request failed with ${response.status}: ${errorText}`,
      );
    }
    const completion = await response.json();
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      throw new Error('Groq returned empty companion output.');
    }
    return text;
  }
  async generateCompanionWithOpenRouter(prompt) {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter request failed with ${response.status}: ${errorText}`,
      );
    }
    const completion = await response.json();
    const text = completion.choices?.[0]?.message?.content?.trim() || '';
    if (!text) {
      throw new Error('OpenRouter returned empty companion output.');
    }
    return text;
  }
  async processVoiceNote(audioBuffer, mimeType = 'audio/mp3') {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
      });
      const audioPart = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };
      const result = await model.generateContent([
        'You are an AI study assistant. Listen to this voice note from a student and provide a helpful, concise text response.',
        audioPart,
      ]);
      return result.response.text();
    } catch (error) {
      this.logger.error(`Voice Processing Error: ${error.message}`);
      throw new Error('Failed to process voice note.');
    }
  }
  async generateQuiz(topic, numQuestions, sourceText) {
    const prompt = this.buildQuizPrompt(topic, numQuestions, sourceText);
    const providers = [];
    if (process.env.OPENROUTER_API_KEY) {
      providers.push({
        name: 'openrouter',
        generate: () => this.generateQuizWithOpenRouter(prompt),
      });
    }
    if (process.env.GROQ_API_KEY) {
      providers.push({
        name: 'groq',
        generate: () => this.generateQuizWithGroq(prompt),
      });
    }
    if (providers.length === 0) {
      throw new Error(
        'No AI quiz providers configured. Set OPENROUTER_API_KEY or GROQ_API_KEY.',
      );
    }
    const errors = [];
    for (const provider of providers) {
      try {
        this.logger.log(
          `[AiService] Trying quiz generation with ${provider.name}`,
        );
        const responseText = await provider.generate();
        const quiz = this.parseQuizResponse(responseText);
        this.logger.log(
          `[AiService] Quiz generated successfully with ${provider.name}`,
        );
        return quiz;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `[AiService] Quiz provider ${provider.name} failed: ${message}`,
        );
      }
    }
    this.logger.error(`Quiz Generation Error: ${errors.join(' | ')}`);
    throw new Error(`Failed to generate quiz: ${errors.join(' | ')}`);
  }
  buildQuizPrompt(topic, numQuestions, sourceText) {
    const sourceContext = sourceText
      ? `\n\nSOURCE MATERIAL:\n${sourceText.slice(0, 8000)}`
      : '';
    return `You are an expert educator creating a quiz for the StudyMate app.

TOPIC: ${topic}
NUMBER OF QUESTIONS: ${numQuestions}${sourceContext}

INSTRUCTIONS:
- Create ${numQuestions} multiple-choice questions
- Each question must have exactly 4 options (A, B, C, D)
- One option must be clearly correct
- Include a brief explanation for why the answer is correct
- Questions should test understanding, not just memorization
- If source material is provided, base questions on it
- Keep questions and explanations concise but informative

Format your response as JSON with this exact structure:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctAnswer": "Paris",
      "explanation": "Paris is the capital and largest city of France."
    }
  ]
}

Respond with only the JSON, no additional text.`;
  }
  extractJsonObject(text) {
    const start = text.indexOf('{');
    if (start === -1) {
      return null;
    }
    let depth = 0;
    for (let i = start; i < text.length; i += 1) {
      const char = text[i];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
    return null;
  }
  parseQuizResponse(responseText) {
    const trimmed = responseText.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.questions && Array.isArray(parsed.questions)) {
        return parsed;
      }
    } catch {}
    const jsonText = this.extractJsonObject(trimmed);
    if (jsonText) {
      try {
        const parsed = JSON.parse(jsonText);
        if (parsed?.questions && Array.isArray(parsed.questions)) {
          return parsed;
        }
      } catch (error) {
        this.logger.warn(`[AiService] Quiz JSON parse error: ${error.message}`);
      }
    }
    this.logger.warn(
      `[AiService] Quiz parse failure; response was: ${trimmed.substring(0, 500)}`,
    );
    throw new Error('Failed to parse quiz response');
  }
  async generateQuizWithOpenRouter(prompt) {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY not configured');
      }
      this.logger.debug(
        `[OpenRouter] Sending request with key: ${apiKey.substring(0, 10)}...`,
      );
      const response = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openrouter/auto',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        },
      );
      const responseStatus = response.status;
      const responseBody = await response.text();
      this.logger.debug(
        `[OpenRouter] Response status: ${responseStatus}, body length: ${responseBody.length}`,
      );
      if (!response.ok) {
        this.logger.error(
          `[OpenRouter] Error response: ${responseBody.substring(0, 500)}`,
        );
        throw new Error(
          `OpenRouter API error: ${responseStatus} ${responseBody}`,
        );
      }
      const data = JSON.parse(responseBody);
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      throw new Error(`OpenRouter quiz generation failed: ${error.message}`);
    }
  }
  async generateQuizWithGemini(prompt) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-001',
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      throw new Error(`Gemini quiz generation failed: ${error.message}`);
    }
  }
  async generateQuizWithGroq(prompt) {
    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        },
      );
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Groq API error: ${response.status} ${errorBody}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    } catch (error) {
      throw new Error(`Groq quiz generation failed: ${error.message}`);
    }
  }
  async generateText(prompt) {
    const providers = [];
    if (process.env.OPENROUTER_API_KEY) {
      providers.push({
        name: 'openrouter',
        generate: () => this.generateTextWithOpenRouter(prompt),
      });
    }
    if (process.env.GROQ_API_KEY) {
      providers.push({
        name: 'groq',
        generate: () => this.generateTextWithGroq(prompt),
      });
    }
    if (process.env.GEMINI_API_KEY) {
      providers.push({
        name: 'gemini',
        generate: () => this.generateTextWithGemini(prompt),
      });
    }
    if (providers.length === 0) {
      throw new Error('No AI providers configured');
    }
    const errors = [];
    for (const provider of providers) {
      try {
        this.logger.log(`[AiService] generateText trying: ${provider.name}`);
        const text = await provider.generate();
        this.logger.log(`[AiService] generateText success: ${provider.name}`);
        return text;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `[AiService] generateText ${provider.name} failed: ${message}`,
        );
      }
    }
    throw new Error(`All AI providers failed: ${errors.join(' | ')}`);
  }
  async generateTextWithGemini(prompt) {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
  async generateTextWithGroq(prompt) {
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Groq error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
  async generateTextWithOpenRouter(prompt) {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`OpenRouter error: ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }
});
AiService = AiService_1 = __decorate(
  [(0, common_1.Injectable)(), __metadata('design:paramtypes', [])],
  AiService,
);
exports.AiService = AiService;
//# sourceMappingURL=ai.service.js.map

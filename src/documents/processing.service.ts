import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as mammoth from 'mammoth';
import axios from 'axios';
import pdf from 'pdf-parse-fork';
import { AiService } from '../ai/ai.service';

interface PdfParseResult {
  text: string;
}

type PdfParser = (buffer: Buffer) => Promise<PdfParseResult>;

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  private readonly blockedExtractionPhrases = [
    'no meaningful educational text in this pdf',
    'no meaningful educational content',
    'there is no meaningful educational text',
    'the pdf appears to be empty',
    'the uploaded file seemed to be empty',
    'the file may have been a scan of a blank page',
    'scanner watermarks',
    'only scanner watermarks',
    'no actual educational content',
    'without any specific information',
    'based on the information provided',
    'based on the provided excerpts',
    'from the notes provided',
    'i could not find any specific information',
    'i do not have any specific details about the pdf file uploaded',
    'portable document format',
    'a pdf file is a type of digital file',
    'a pdf file is a digital document format',
  ];

  private readonly imageMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
  ];

  constructor(private readonly aiService: AiService) {}

  private isImageFile(fileType: string): boolean {
    return this.imageMimeTypes.some((type) =>
      fileType.toLowerCase().includes(type.replace('image/', '')),
    );
  }

  private normalizeForQualityChecks(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private containsBlockedExtractionSummary(text: string): boolean {
    const normalized = this.normalizeForQualityChecks(text);

    if (
      this.blockedExtractionPhrases.some((phrase) =>
        normalized.includes(phrase),
      )
    ) {
      return true;
    }

    const blockedPatterns = [
      /appears to be (an )?empty file/,
      /no .*educational text/,
      /no .*educational content/,
      /only .*watermark/,
      /generic explanation of (what )?a pdf/,
      /from (the )?general knowledge/,
      /without more context/,
    ];

    return blockedPatterns.some((pattern) => pattern.test(normalized));
  }

  private sanitizeExtractedText(text: string): string {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const normalized = line.toLowerCase();
        return (
          line.length > 0 &&
          normalized !== 'camscanner' &&
          !normalized.includes('scanned by camscanner') &&
          !normalized.includes('camscanner')
        );
      })
      .join('\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  private shouldUsePdfFallback(text: string): boolean {
    const normalized = text.toLowerCase();
    const compactLength = text.replace(/\s/g, '').length;
    const watermarks = ['camscanner', 'scanned by', 'scan by'];
    const watermarkHits = watermarks.filter((term) =>
      normalized.includes(term),
    ).length;

    return compactLength < 200 || watermarkHits > 0;
  }

  isMeaningfulEducationalText(text: string): boolean {
    const normalized = this.normalizeForQualityChecks(text);

    if (!normalized || normalized.length < 80) {
      return false;
    }

    if (this.containsBlockedExtractionSummary(normalized)) {
      return false;
    }

    const words = normalized.split(/\s+/).filter(Boolean);
    return words.length >= 20;
  }

  isUsableStudyChunk(text: string): boolean {
    const normalized = this.normalizeForQualityChecks(text);

    if (!normalized || normalized.length < 30) {
      return false;
    }

    return !this.containsBlockedExtractionSummary(normalized);
  }

  async downloadFileBuffer(fileUrl: string): Promise<Buffer> {
    const response = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });

    return Buffer.from(response.data);
  }

  async answerQuestionFromPdf(
    fileUrl: string,
    question: string,
    fileName: string,
  ): Promise<string> {
    try {
      this.logger.log(`[AI-Prep] Downloading PDF for direct Q&A: ${fileUrl}`);
      const buffer = await this.downloadFileBuffer(fileUrl);
      return await this.aiService.answerQuestionAboutPdf(
        buffer,
        question,
        fileName,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[AI-Prep] Direct PDF Q&A Failure: ${message}`);
      throw new InternalServerErrorException(
        `Document Q&A Error: ${message}`,
      );
    }
  }

  /**
   * Main entry point for the AI-Prep flow.
   * Downloads, extracts, and cleans text from various file types.
   */
  async extractText(fileUrl: string, fileType: string): Promise<string> {
    return this.extractTextInternal(fileUrl, fileType, true);
  }

  async extractTextForQuestionAnswering(
    fileUrl: string,
    fileType: string,
  ): Promise<string> {
    return this.extractTextInternal(fileUrl, fileType, false);
  }

  private async extractTextInternal(
    fileUrl: string,
    fileType: string,
    requireMeaningfulText: boolean,
  ): Promise<string> {
    try {
      this.logger.log(`[AI-Prep] Downloading file for extraction: ${fileUrl}`);

      const buffer = await this.downloadFileBuffer(fileUrl);
      let extractedText = '';

      // --- IMAGE EXTRACTION (JPG, PNG, JPEG, WEBP) ---
      if (this.isImageFile(fileType)) {
        this.logger.log('[AI-Prep] Processing image with Gemini Vision OCR...');
        extractedText = await this.aiService.extractTextFromImage(buffer, fileType);
      }
      // --- PDF EXTRACTION - ALWAYS USE AI VISION FOR ALL PDFs ---
      // This ensures scanned/image PDFs are also readable
      else if (fileType.includes('pdf')) {
        this.logger.log('[AI-Prep] Processing ALL PDFs with AI Vision (Gemini -> Groq)...');
        
        // Try Gemini first
        try {
          extractedText = await this.aiService.extractStudyTextFromPdf(buffer);
          this.logger.log('[AI-Prep] Gemini successfully extracted PDF text');
        } catch (geminiError: unknown) {
          const geminiMessage = geminiError instanceof Error ? geminiError.message : 'Unknown error';
          this.logger.warn(`[AI-Prep] Gemini PDF extraction failed: ${geminiMessage}. Trying Groq...`);
          
          // Try Groq as backup
          try {
            extractedText = await this.extractPdfWithGroq(buffer);
            this.logger.log('[AI-Prep] Groq successfully extracted PDF text');
          } catch (groqError: unknown) {
            const groqMessage = groqError instanceof Error ? groqError.message : 'Unknown error';
            this.logger.error(`[AI-Prep] Groq also failed: ${groqMessage}`);
            throw new Error(`All AI providers failed to read this PDF: ${geminiMessage} | ${groqMessage}`);
          }
        }
      }
      // --- WORD EXTRACTION ---
      else if (
        fileType.includes('word') ||
        fileType.includes('officedocument')
      ) {
        this.logger.log('[AI-Prep] Processing Word document...');
        const data = await mammoth.extractRawText({ buffer });
        extractedText = data.value;
      }
      // --- PLAIN TEXT EXTRACTION ---
      else {
        this.logger.log('[AI-Prep] Processing as plain text.');
        extractedText = buffer.toString('utf-8');
      }

      // --- CLEANING & NORMALIZATION ---
      const cleanText = this.sanitizeExtractedText(extractedText);

      if (!cleanText || cleanText.length < 10) {
        throw new Error(
          `Extraction resulted in empty text. Ensure the PDF is not just a scanned image.`,
        );
      }

      if (
        requireMeaningfulText &&
        !this.isMeaningfulEducationalText(cleanText)
      ) {
        throw new Error(
          'Extraction did not produce meaningful educational text for this document.',
        );
      }

      this.logger.log(
        `[AI-Prep] Extraction successful: ${cleanText.length} characters.`,
      );
      return cleanText;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[AI-Prep] Final Extraction Failure: ${message}`);
      throw new InternalServerErrorException(
        `Document Processing Error: ${message}`,
      );
    }
  }

  /**
   * Chunks text for the Vector Database.
   */
  splitTextIntoChunks(
    text: string,
    chunkSize = 1000,
    chunkOverlap = 200,
  ): string[] {
    const chunks: string[] = [];
    if (!text) {
      return [];
    }

    let currentIndex = 0;
    while (currentIndex < text.length) {
      const end = Math.min(currentIndex + chunkSize, text.length);
      const chunk = text.slice(currentIndex, end);

      if (this.isUsableStudyChunk(chunk)) {
        chunks.push(chunk);
      }
      currentIndex += chunkSize - chunkOverlap;

      if (chunkSize <= chunkOverlap) {
        break;
      }
    }

    this.logger.log(
      `[AI-Prep] Content split into ${chunks.length} usable chunks.`,
    );
    return chunks;
  }

  private async extractPdfWithGroq(pdfBuffer: Buffer): Promise<string> {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    this.logger.log('[AI-Prep] Extracting PDF text with Groq...');

    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq request failed: ${response.status} - ${errorText}`);
    }

    const completion = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const extractedText = completion.choices?.[0]?.message?.content?.trim() || '';

    if (!extractedText) {
      throw new Error('Groq returned empty PDF extraction');
    }

    if (extractedText.toLowerCase().includes('no_readable_text') || extractedText.toLowerCase().includes('no readable')) {
      throw new Error('No readable text found in PDF');
    }

    this.logger.log(`[AI-Prep] Groq PDF extraction complete: ${extractedText.length} characters`);
    return extractedText;
  }
}

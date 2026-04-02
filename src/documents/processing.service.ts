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

  constructor(private readonly aiService: AiService) {}

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

      // --- PDF EXTRACTION ---
      if (fileType.includes('pdf')) {
        this.logger.log('[AI-Prep] Processing PDF with pdf-parse-fork...');
        let parserText = '';

        try {
          const parsePdf = pdf as PdfParser;
          const data = await parsePdf(buffer);
          parserText = this.sanitizeExtractedText(data.text);
          extractedText = parserText;

          if (this.shouldUsePdfFallback(parserText)) {
            this.logger.warn(
              '[AI-Prep] PDF text looks too weak or watermark-heavy. Falling back to Gemini PDF extraction...',
            );
            try {
              extractedText =
                await this.aiService.extractStudyTextFromPdf(buffer);
            } catch (fallbackError: unknown) {
              const fallbackMessage =
                fallbackError instanceof Error
                  ? fallbackError.message
                  : 'Unknown error';
              this.logger.warn(
                `[AI-Prep] Gemini/OpenRouter PDF fallback failed: ${fallbackMessage}. Using parser text instead.`,
              );
              extractedText = parserText;
            }
          }
        } catch (pdfError) {
          const message =
            pdfError instanceof Error ? pdfError.message : 'Unknown error';
          this.logger.error(`PDF Extraction logic failed: ${message}`);
          this.logger.warn(
            '[AI-Prep] Falling back to Gemini PDF extraction after parser failure...',
          );
          extractedText = await this.aiService.extractStudyTextFromPdf(buffer);
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
}

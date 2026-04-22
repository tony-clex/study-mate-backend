/// <reference types="node" />
/// <reference types="node" />
import { AiService } from '../ai/ai.service';
export declare class ProcessingService {
  private readonly aiService;
  private readonly logger;
  private readonly blockedExtractionPhrases;
  private readonly imageMimeTypes;
  constructor(aiService: AiService);
  private isImageFile;
  private normalizeForQualityChecks;
  private containsBlockedExtractionSummary;
  private sanitizeExtractedText;
  private shouldUsePdfFallback;
  private extractPdfWithTextParser;
  isMeaningfulEducationalText(text: string): boolean;
  isUsableStudyChunk(text: string): boolean;
  downloadFileBuffer(fileUrl: string): Promise<Buffer>;
  answerQuestionFromPdf(
    fileUrl: string,
    question: string,
    fileName: string,
  ): Promise<string>;
  extractText(fileUrl: string, fileType: string): Promise<string>;
  extractTextForQuestionAnswering(
    fileUrl: string,
    fileType: string,
  ): Promise<string>;
  private extractTextInternal;
  splitTextIntoChunks(
    text: string,
    chunkSize?: number,
    chunkOverlap?: number,
  ): string[];
  private extractPdfWithGroq;
}

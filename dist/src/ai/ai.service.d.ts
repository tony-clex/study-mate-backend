/// <reference types="node" />
/// <reference types="node" />
export declare class AiService {
  private readonly logger;
  private readonly genAI;
  private readonly blockedPdfExtractionPhrases;
  constructor();
  private normalizeImageMimeType;
  private isHistoryEntry;
  getEmbedding(text: string): Promise<number[]>;
  generateAnswer(question: string, context: string): Promise<string>;
  extractStudyTextFromPdf(pdfBuffer: Buffer): Promise<string>;
  private validatePdfExtractionOutput;
  answerQuestionAboutPdf(
    pdfBuffer: Buffer,
    question: string,
    fileName: string,
  ): Promise<string>;
  private answerQuestionAboutPdfWithGroq;
  private extractStudyTextFromPdfWithGemini;
  private extractStudyTextFromPdfWithOpenRouter;
  private answerQuestionAboutPdfWithGemini;
  private answerQuestionAboutPdfWithOpenRouter;
  extractPdfWithGroq(pdfBuffer: Buffer): Promise<string>;
  private answerFromExtractedTextWithGroq;
  analyzeImage(imageBuffer: Buffer, mimeType: string): Promise<string>;
  extractTextFromImage(imageBuffer: Buffer, mimeType: string): Promise<string>;
  private extractTextFromImageWithGemini;
  private extractTextFromImageWithOpenRouter;
  chatWithCompanion(
    question: string,
    history: any[],
    context?: string,
  ): Promise<{
    text: string;
  }>;
  private buildHistoryTranscript;
  private buildCompanionPrompt;
  private generateCompanionWithGemini;
  private generateCompanionWithGroq;
  private generateCompanionWithOpenRouter;
  processVoiceNote(audioBuffer: Buffer, mimeType?: string): Promise<string>;
  generateQuiz(
    topic: string,
    numQuestions: number,
    sourceText?: string,
  ): Promise<{
    questions: Array<{
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }>;
  }>;
  private buildQuizPrompt;
  private extractJsonObject;
  private parseQuizResponse;
  private generateQuizWithOpenRouter;
  private generateQuizWithGemini;
  private generateQuizWithGroq;
  generateText(prompt: string): Promise<string>;
  private generateTextWithGemini;
  private generateTextWithGroq;
  private generateTextWithOpenRouter;
}

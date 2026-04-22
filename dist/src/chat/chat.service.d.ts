import { ProcessingService } from '../documents/processing.service';
import { AiService } from '../ai/ai.service';
interface ChatQuestionInput {
  userId: string;
  question: string;
  documentId?: string;
  sessionId?: string;
  fileName?: string;
  fileUrl?: string;
}
export interface ChatResponse {
  answer?: string;
  foundInNotes?: boolean;
  provider?: string;
  fallback?: true;
  error?: string;
  documentScoped?: boolean;
  resolvedDocumentId?: string | null;
  chunkCount?: number;
}
export interface ChatMessageRecord {
  id: string;
  user_id: string;
  session_id: string | null;
  role: 'user' | 'assistant';
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
export declare class ChatService {
  private readonly processingService;
  private readonly aiService;
  private readonly logger;
  private readonly blockedChunkPhrases;
  private readonly genAI;
  private readonly groq;
  private readonly openai;
  private supabase;
  constructor(processingService: ProcessingService, aiService: AiService);
  getSessionChatHistory(
    userId: string,
    sessionId: string,
  ): Promise<ChatMessageRecord[]>;
  private hasExplicitFileContext;
  private resolveDocumentId;
  private findRelevantChunks;
  private getRecentChunks;
  private getDocumentRecord;
  private explainDocumentDirectly;
  private isUsableRetrievedChunk;
  private buildQuotaFallback;
  private generateWithGemini;
  private generateWithGroq;
  private generateWithOpenRouter;
  private generateWithFailover;
  private createQueryEmbedding;
  askQuestion(input: ChatQuestionInput): Promise<ChatResponse>;
}
export {};

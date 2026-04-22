import { Request } from 'express';
import { ChatMessageRecord, ChatResponse, ChatService } from './chat.service';
import { AiService } from '../ai/ai.service';
import { ChatQueryDto } from './dto/chat-query.dto';
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}
interface ChatHistoryResponse {
  sessionId: string;
  messages: ChatMessageRecord[];
}
export declare class ChatController {
  private readonly chatService;
  private readonly aiService;
  private readonly supabase;
  constructor(chatService: ChatService, aiService: AiService);
  getSessionHistory(
    req: AuthenticatedRequest,
    sessionId: string,
  ): Promise<ChatHistoryResponse>;
  private parseDataUrl;
  private loadAttachment;
  ask(
    req: AuthenticatedRequest,
    chatQueryDto: ChatQueryDto,
  ): Promise<ChatResponse>;
  handleCompanionMessage(
    req: AuthenticatedRequest,
    body: ChatQueryDto,
  ): Promise<{
    text: string;
    imageUrl: null;
    audioUrl: null;
    extractedContext: string | null;
  }>;
}
export {};

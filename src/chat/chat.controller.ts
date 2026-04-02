import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ChatResponse, ChatService } from './chat.service';
import { ChatQueryDto } from './dto/chat-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  async ask(
    @Req() req: AuthenticatedRequest,
    @Body() chatQueryDto: ChatQueryDto,
  ): Promise<ChatResponse> {
    return this.chatService.askQuestion({
      userId: req.user.id,
      question: chatQueryDto.question,
      documentId: chatQueryDto.documentId ?? chatQueryDto.document_id,
      sessionId: chatQueryDto.sessionId ?? chatQueryDto.session_id,
      fileName: chatQueryDto.fileName ?? chatQueryDto.file_name,
      fileUrl: chatQueryDto.fileUrl ?? chatQueryDto.file_url,
    });
  }
}

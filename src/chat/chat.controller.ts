import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ChatResponse, ChatService } from './chat.service';
import { AiService } from '../ai/ai.service';
import { ChatQueryDto } from './dto/chat-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { supabaseAdmin } from '../config/supabase.client';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly supabase = supabaseAdmin;
  constructor(
    private readonly chatService: ChatService,
    private readonly aiService: AiService, // 1. Added AiService here
  ) {}

  // Existing PDF/Notes Chat
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

  @Post('companion/message')
  async handleCompanionMessage(
    @Req() req: AuthenticatedRequest,
    @Body() body: ChatQueryDto,
  ) {
    const userId = req.user.id;
    let contextText = '';

    if (body.mode === 'pdf' && body.attachmentUrl) {
      const response = await fetch(body.attachmentUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      contextText = await this.aiService.extractStudyTextFromPdf(buffer);
    } else if (body.mode === 'image' && body.attachmentUrl) {
      const response = await fetch(body.attachmentUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const mimeType = body.attachmentType || 'image/jpeg';
      contextText = await this.aiService.analyzeImage(buffer, mimeType);
    } else if (body.mode === 'audio' && body.attachmentUrl) {
      const response = await fetch(body.attachmentUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      const transcription = await this.aiService.processVoiceNote(buffer);
      body.question = `${transcription} (Transcribed from voice: ${body.question})`;
    }

    const aiResponse = await this.aiService.chatWithCompanion(
      body.question,
      body.history || [],
      contextText,
    );

    const finalImageUrl = null;
    if (aiResponse.text.includes('[GENERATE_IMAGE:')) {
      const match = aiResponse.text.match(/\[GENERATE_IMAGE:\s*(.*?)\]/);
      const prompt = match ? match[1] : null;
      this.aiService['logger'].log(`Generating image for: ${prompt}`);
    }

    await this.supabase.from('chat_messages').insert([
      {
        user_id: userId,
        role: 'user',
        content: body.question,
        session_id: body.sessionId,
      },
      {
        user_id: userId,
        role: 'assistant',
        content: aiResponse.text,
        session_id: body.sessionId,
      },
    ]);

    return {
      text: aiResponse.text,
      imageUrl: finalImageUrl,
      audioUrl: null,
      extractedContext: contextText ? "I've analyzed your file." : null,
    };
  }
}

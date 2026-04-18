import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ChatMessageRecord, ChatResponse, ChatService } from './chat.service';
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

interface ChatHistoryResponse {
  sessionId: string;
  messages: ChatMessageRecord[];
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  private readonly supabase = supabaseAdmin;
  constructor(
    private readonly chatService: ChatService,
    private readonly aiService: AiService,
  ) {}

  @Get('session/:sessionId/history')
  async getSessionHistory(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ): Promise<ChatHistoryResponse> {
    const userId = req.user.id;
    const messages = await this.chatService.getSessionChatHistory(
      userId,
      sessionId,
    );

    return {
      sessionId,
      messages,
    };
  }

  private parseDataUrl(
    input: string,
  ): { buffer: Buffer; mimeType: string } | null {
    const match = input.match(
      /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/s,
    );
    if (!match) {
      return null;
    }

    const mimeType = match[1] || 'application/octet-stream';
    return {
      buffer: Buffer.from(match[2], 'base64'),
      mimeType,
    };
  }

  private async loadAttachment(
    body: ChatQueryDto,
  ): Promise<{ buffer: Buffer; mimeType?: string }> {
    const directPayload = body.attachmentData?.trim();
    const attachmentUrl = body.attachmentUrl?.trim();

    if (directPayload) {
      const parsedDataUrl = this.parseDataUrl(directPayload);
      if (parsedDataUrl) {
        return parsedDataUrl;
      }

      const mimeType = body.attachmentMimeType || body.attachmentType;
      if (!mimeType) {
        throw new BadRequestException(
          'attachmentMimeType is required when sending raw base64 data',
        );
      }

      return {
        buffer: Buffer.from(directPayload, 'base64'),
        mimeType,
      };
    }

    if (!attachmentUrl) {
      throw new BadRequestException(
        'attachmentUrl or attachmentData is required for this mode',
      );
    }

    const parsedDataUrl = this.parseDataUrl(attachmentUrl);
    if (parsedDataUrl) {
      return parsedDataUrl;
    }

    if (!/^https?:\/\//i.test(attachmentUrl)) {
      const mimeType = body.attachmentMimeType || body.attachmentType;
      if (mimeType) {
        return {
          buffer: Buffer.from(attachmentUrl, 'base64'),
          mimeType,
        };
      }
    }

    const response = await fetch(attachmentUrl);
    if (!response.ok) {
      throw new BadRequestException(
        `Failed to fetch attachment: ${response.status} ${response.statusText}`,
      );
    }

    const mimeType =
      body.attachmentMimeType ||
      body.attachmentType ||
      response.headers.get('content-type')?.split(';')[0]?.trim();

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mimeType: mimeType || undefined,
    };
  }

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

    if (body.mode === 'pdf' && (body.attachmentUrl || body.attachmentData)) {
      const { buffer } = await this.loadAttachment(body);
      contextText = await this.aiService.extractStudyTextFromPdf(buffer);
    } else if (
      body.mode === 'image' &&
      (body.attachmentUrl || body.attachmentData)
    ) {
      const { buffer, mimeType } = await this.loadAttachment(body);
      try {
        contextText = await this.aiService.extractTextFromImage(
          buffer,
          mimeType || 'image/jpeg',
        );
      } catch (ocrError) {
        const message =
          ocrError instanceof Error ? ocrError.message : 'Unknown error';
        this.aiService['logger'].warn(
          `[Chat] Image OCR failed: ${message}. Falling back to image description.`,
        );
        contextText = await this.aiService.analyzeImage(
          buffer,
          mimeType || 'image/jpeg',
        );
      }
    } else if (
      body.mode === 'audio' &&
      (body.attachmentUrl || body.attachmentData)
    ) {
      const { buffer, mimeType } = await this.loadAttachment(body);
      const transcription = await this.aiService.processVoiceNote(
        buffer,
        mimeType || 'audio/mp3',
      );
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

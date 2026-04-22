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
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ChatController = void 0;
const common_1 = require('@nestjs/common');
const chat_service_1 = require('./chat.service');
const ai_service_1 = require('../ai/ai.service');
const chat_query_dto_1 = require('./dto/chat-query.dto');
const jwt_auth_guard_1 = require('../auth/jwt-auth.guard');
const supabase_client_1 = require('../config/supabase.client');
let ChatController = class ChatController {
  chatService;
  aiService;
  supabase = supabase_client_1.supabaseAdmin;
  constructor(chatService, aiService) {
    this.chatService = chatService;
    this.aiService = aiService;
  }
  async getSessionHistory(req, sessionId) {
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
  parseDataUrl(input) {
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
  async loadAttachment(body) {
    const directPayload = body.attachmentData?.trim();
    const attachmentUrl = body.attachmentUrl?.trim();
    if (directPayload) {
      const parsedDataUrl = this.parseDataUrl(directPayload);
      if (parsedDataUrl) {
        return parsedDataUrl;
      }
      const mimeType = body.attachmentMimeType || body.attachmentType;
      if (!mimeType) {
        throw new common_1.BadRequestException(
          'attachmentMimeType is required when sending raw base64 data',
        );
      }
      return {
        buffer: Buffer.from(directPayload, 'base64'),
        mimeType,
      };
    }
    if (!attachmentUrl) {
      throw new common_1.BadRequestException(
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
      throw new common_1.BadRequestException(
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
  async ask(req, chatQueryDto) {
    return this.chatService.askQuestion({
      userId: req.user.id,
      question: chatQueryDto.question,
      documentId: chatQueryDto.documentId ?? chatQueryDto.document_id,
      sessionId: chatQueryDto.sessionId ?? chatQueryDto.session_id,
      fileName: chatQueryDto.fileName ?? chatQueryDto.file_name,
      fileUrl: chatQueryDto.fileUrl ?? chatQueryDto.file_url,
    });
  }
  async handleCompanionMessage(req, body) {
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
};
__decorate(
  [
    (0, common_1.Get)('session/:sessionId/history'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('sessionId')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, String]),
    __metadata('design:returntype', Promise),
  ],
  ChatController.prototype,
  'getSessionHistory',
  null,
);
__decorate(
  [
    (0, common_1.Post)('ask'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, chat_query_dto_1.ChatQueryDto]),
    __metadata('design:returntype', Promise),
  ],
  ChatController.prototype,
  'ask',
  null,
);
__decorate(
  [
    (0, common_1.Post)('companion/message'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, chat_query_dto_1.ChatQueryDto]),
    __metadata('design:returntype', Promise),
  ],
  ChatController.prototype,
  'handleCompanionMessage',
  null,
);
ChatController = __decorate(
  [
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata('design:paramtypes', [
      chat_service_1.ChatService,
      ai_service_1.AiService,
    ]),
  ],
  ChatController,
);
exports.ChatController = ChatController;
//# sourceMappingURL=chat.controller.js.map

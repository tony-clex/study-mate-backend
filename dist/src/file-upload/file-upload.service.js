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
var FileUploadService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.FileUploadService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
const processing_service_1 = require('../documents/processing.service');
const ai_service_1 = require('../ai/ai.service');
let FileUploadService = (FileUploadService_1 = class FileUploadService {
  processingService;
  aiService;
  logger = new common_1.Logger(FileUploadService_1.name);
  bucketName = 'study-files';
  allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/x-heic',
    'image/x-heif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  maxFileSize = 10 * 1024 * 1024;
  constructor(processingService, aiService) {
    this.processingService = processingService;
    this.aiService = aiService;
  }
  async uploadFile(userId, file, folder = 'uploads') {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new common_1.BadRequestException(`File type not allowed.`);
    }
    if (file.size > this.maxFileSize) {
      throw new common_1.BadRequestException(
        `File too large. Maximum size is 10MB`,
      );
    }
    try {
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}/${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: storageError } =
        await supabase_client_1.supabaseAdmin.storage
          .from(this.bucketName)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });
      if (storageError)
        throw new common_1.InternalServerErrorException(storageError.message);
      const { data: urlData } = supabase_client_1.supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);
      const documentInsertResult = await supabase_client_1.supabaseAdmin
        .from('documents')
        .insert({
          user_id: userId,
          file_name: file.originalname,
          file_url: urlData.publicUrl,
          file_type: file.mimetype,
          file_size: file.size,
        })
        .select()
        .single();
      const { data: dbDoc, error: dbError } = documentInsertResult;
      if (dbError)
        throw new common_1.InternalServerErrorException(
          `Database save failed: ${dbError.message}`,
        );
      if (!dbDoc) {
        throw new common_1.InternalServerErrorException(
          'Database save failed: no document row returned.',
        );
      }
      const result = {
        id: dbDoc.id,
        file_name: dbDoc.file_name,
        file_url: dbDoc.file_url,
        file_type: dbDoc.file_type,
        file_size: dbDoc.file_size,
      };
      const isDocument =
        file.mimetype.includes('pdf') ||
        file.mimetype.includes('officedocument') ||
        file.mimetype.includes('word') ||
        file.mimetype.includes('text');
      const isImage = file.mimetype.includes('image');
      if (isDocument) {
        try {
          this.logger.log(`[AI-Prep] Extracting text for: ${result.file_name}`);
          const rawText =
            await this.processingService.extractTextForQuestionAnswering(
              result.file_url,
              result.file_type,
            );
          const chunks = this.processingService
            .splitTextIntoChunks(rawText)
            .filter((chunk) =>
              this.processingService.isUsableStudyChunk(chunk),
            );
          if (chunks.length === 0) {
            throw new Error(
              'No usable text chunks were produced for this document.',
            );
          }
          this.logger.log(
            `[AI-Prep] Generating embeddings for ${chunks.length} chunks...`,
          );
          const chunkRows = await Promise.all(
            chunks.map(async (content, index) => {
              let embedding = null;
              let embeddingFailed = false;
              try {
                embedding = await this.aiService.getEmbedding(content);
              } catch (embeddingError) {
                const message =
                  embeddingError instanceof Error
                    ? embeddingError.message
                    : 'Unknown error';
                embeddingFailed = true;
                this.logger.warn(
                  `[AI-Prep] Embedding failed for chunk ${index}: ${message}. Storing text chunk without embedding.`,
                );
              }
              return {
                document_id: dbDoc.id,
                user_id: userId,
                content,
                embedding,
                metadata: {
                  chunk_index: index,
                  original_name: result.file_name,
                  embedding_failed: embeddingFailed,
                },
              };
            }),
          );
          const { error: chunkError } = await supabase_client_1.supabaseAdmin
            .from('document_chunks')
            .insert(chunkRows);
          if (chunkError) throw chunkError;
          this.logger.log(
            `[AI-Ready] Successfully vectorized and stored doc: ${dbDoc.id}`,
          );
        } catch (procError) {
          const message =
            procError instanceof Error ? procError.message : 'Unknown error';
          this.logger.warn(`[AI-Prep] Processing failed: ${message}`);
        }
      } else if (isImage) {
        try {
          this.logger.log(
            `[AI-Prep] Reading image text for: ${result.file_name}`,
          );
          let imageContent = '';
          try {
            imageContent = await this.aiService.extractTextFromImage(
              file.buffer,
              file.mimetype,
            );
          } catch (ocrError) {
            const message =
              ocrError instanceof Error ? ocrError.message : 'Unknown error';
            this.logger.warn(
              `[AI-Prep] Image OCR failed: ${message}. Falling back to image description.`,
            );
            imageContent = await this.aiService.analyzeImage(
              file.buffer,
              file.mimetype,
            );
          }
          let embedding = null;
          let embeddingFailed = false;
          try {
            embedding = await this.aiService.getEmbedding(imageContent);
          } catch (embeddingError) {
            const message =
              embeddingError instanceof Error
                ? embeddingError.message
                : 'Unknown error';
            embeddingFailed = true;
            this.logger.warn(
              `[AI-Prep] Image embedding failed: ${message}. Storing image description without embedding.`,
            );
          }
          const { error: chunkError } = await supabase_client_1.supabaseAdmin
            .from('document_chunks')
            .insert({
              document_id: dbDoc.id,
              user_id: userId,
              content: imageContent,
              embedding,
              metadata: {
                type: 'image',
                original_name: result.file_name,
                embedding_failed: embeddingFailed,
              },
            });
          if (chunkError) throw chunkError;
          this.logger.log(
            `[AI-Ready] Successfully read and stored image: ${dbDoc.id}`,
          );
        } catch (procError) {
          const message =
            procError instanceof Error ? procError.message : 'Unknown error';
          this.logger.warn(`[AI-Prep] Image processing failed: ${message}`);
        }
      }
      return result;
    } catch (error) {
      this.logger.error('File upload service error:', error);
      throw new common_1.InternalServerErrorException(
        'Failed to process file upload',
      );
    }
  }
  async deleteFile(fileUrl) {
    try {
      const bucketSearchStr = `${this.bucketName}/`;
      const startIndex = fileUrl.indexOf(bucketSearchStr);
      if (startIndex === -1)
        throw new common_1.BadRequestException('Invalid file URL');
      const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);
      const { error } = await supabase_client_1.supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);
      if (error)
        throw new common_1.InternalServerErrorException('Delete failed');
    } catch (error) {
      if (error instanceof common_1.BadRequestException) throw error;
      throw new common_1.InternalServerErrorException('Failed to delete file');
    }
  }
  async getSignedUrl(fileUrl, expiresIn = 3600) {
    try {
      const bucketSearchStr = `${this.bucketName}/`;
      const startIndex = fileUrl.indexOf(bucketSearchStr);
      if (startIndex === -1)
        throw new common_1.BadRequestException('Invalid file URL');
      const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);
      const { data, error } = await supabase_client_1.supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);
      if (error || !data)
        throw new common_1.InternalServerErrorException('Signed URL failed');
      return data.signedUrl;
    } catch (error) {
      if (error instanceof common_1.BadRequestException) throw error;
      throw new common_1.InternalServerErrorException(
        'Failed to get signed URL',
      );
    }
  }
});
FileUploadService = FileUploadService_1 = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [
      processing_service_1.ProcessingService,
      ai_service_1.AiService,
    ]),
  ],
  FileUploadService,
);
exports.FileUploadService = FileUploadService;
//# sourceMappingURL=file-upload.service.js.map

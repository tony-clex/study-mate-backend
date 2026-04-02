// import {
//   Injectable,
//   BadRequestException,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import { supabaseAdmin } from '../config/supabase.client';

// export interface UploadedFile {
//   file_name: string;
//   file_url: string;
//   file_type: string;
//   file_size: number;
// }

// @Injectable()
// export class FileUploadService {
//   // FIX: Matches your Supabase Dashboard bucket name exactly
//   private readonly bucketName = 'session-files';

//   private readonly allowedMimeTypes = [
//     'image/jpeg',
//     'image/png',
//     'image/gif',
//     'image/webp',
//     'image/heic',
//     'image/heif',
//     'application/pdf',
//     'text/plain',
//     'text/markdown',
//     'application/msword',
//     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//   ];

//   private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

//   async uploadFile(
//     userId: string,
//     file: {
//       originalname: string;
//       mimetype: string;
//       size: number;
//       buffer: Buffer;
//     },
//     folder: string = 'uploads',
//   ): Promise<UploadedFile> {
//     // 1. Validation
//     if (!this.allowedMimeTypes.includes(file.mimetype)) {
//       throw new BadRequestException(
//         `File type not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
//       );
//     }

//     if (file.size > this.maxFileSize) {
//       throw new BadRequestException(`File too large. Maximum size is 10MB`);
//     }

//     try {
//       // 2. Generate Path: Matches the "User ID Folder" policy we set up
//       const timestamp = Date.now();
//       const fileExt = file.originalname.split('.').pop();
//       const randomString = Math.random().toString(36).substring(7);
//       const fileName = `${userId}/${folder}/${timestamp}-${randomString}.${fileExt}`;

//       console.log(
//         `[Storage] Uploading to bucket: ${this.bucketName} path: ${fileName}`,
//       );

//       // 3. Perform Upload
//       const { error } = await supabaseAdmin.storage
//         .from(this.bucketName)
//         .upload(fileName, file.buffer, {
//           contentType: file.mimetype,
//           upsert: true, // Set to true to allow replacing files if needed
//         });

//       if (error) {
//         console.error('Supabase upload error detail:', error);
//         throw new InternalServerErrorException(
//           `Supabase upload failed: ${error.message}`,
//         );
//       }

//       // 4. Generate URL
//       const { data: urlData } = supabaseAdmin.storage
//         .from(this.bucketName)
//         .getPublicUrl(fileName);

//       return {
//         file_name: file.originalname,
//         file_url: urlData.publicUrl,
//         file_type: file.mimetype,
//         file_size: file.size,
//       };
//     } catch (error) {
//       if (error instanceof BadRequestException) throw error;
//       console.error('File upload service error:', error);
//       throw new InternalServerErrorException('Failed to process file upload');
//     }
//   }

//   async deleteFile(fileUrl: string): Promise<void> {
//     try {
//       // Extract the path after the bucket name
//       // This is safer than splitting by hardcoded strings
//       const bucketSearchStr = `${this.bucketName}/`;
//       const startIndex = fileUrl.indexOf(bucketSearchStr);

//       if (startIndex === -1) {
//         throw new BadRequestException('Invalid file URL for this bucket');
//       }

//       const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);

//       const { error } = await supabaseAdmin.storage
//         .from(this.bucketName)
//         .remove([filePath]);

//       if (error) {
//         console.error('Supabase delete error:', error);
//         throw new InternalServerErrorException(
//           'Failed to delete file from Supabase',
//         );
//       }
//     } catch (error) {
//       if (error instanceof BadRequestException) throw error;
//       console.error('File delete error:', error);
//       throw new InternalServerErrorException('Failed to delete file');
//     }
//   }

//   async getSignedUrl(
//     fileUrl: string,
//     expiresIn: number = 3600,
//   ): Promise<string> {
//     try {
//       const bucketSearchStr = `${this.bucketName}/`;
//       const startIndex = fileUrl.indexOf(bucketSearchStr);

//       if (startIndex === -1) {
//         throw new BadRequestException('Invalid file URL');
//       }

//       const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);

//       const { data, error } = await supabaseAdmin.storage
//         .from(this.bucketName)
//         .createSignedUrl(filePath, expiresIn);

//       if (error || !data) {
//         console.error('Supabase signed URL error:', error);
//         throw new InternalServerErrorException('Failed to create signed URL');
//       }

//       return data.signedUrl;
//     } catch (error) {
//       if (error instanceof BadRequestException) throw error;
//       throw new InternalServerErrorException('Failed to get signed URL');
//     }
//   }
// }
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
import { ProcessingService } from '../documents/processing.service';
import { AiService } from '../ai/ai.service'; // 1. Import the AI Service

export interface UploadedFile {
  id?: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

interface ChunkRow {
  document_id: string;
  user_id: string;
  content: string;
  embedding: number[] | null;
  metadata: {
    chunk_index?: number;
    original_name: string;
    embedding_failed?: boolean;
    type?: string;
  };
}

interface DocumentRow {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly bucketName = 'session-files';

  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  // 2. Add AiService to the constructor
  constructor(
    private readonly processingService: ProcessingService,
    private readonly aiService: AiService,
  ) {}

  async uploadFile(
    userId: string,
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    folder: string = 'uploads',
  ): Promise<UploadedFile> {
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed.`);
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File too large. Maximum size is 10MB`);
    }

    try {
      const timestamp = Date.now();
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${userId}/${folder}/${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: storageError } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (storageError)
        throw new InternalServerErrorException(storageError.message);

      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      const documentInsertResult = (await supabaseAdmin
        .from('documents')
        .insert({
          user_id: userId,
          file_name: file.originalname,
          file_url: urlData.publicUrl,
          file_type: file.mimetype,
          file_size: file.size,
        })
        .select()
        .single()) as {
        data: DocumentRow | null;
        error: Error | null;
      };
      const { data: dbDoc, error: dbError } = documentInsertResult;

      if (dbError)
        throw new InternalServerErrorException(
          `Database save failed: ${dbError.message}`,
        );

      if (!dbDoc) {
        throw new InternalServerErrorException(
          'Database save failed: no document row returned.',
        );
      }

      const result: UploadedFile = {
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
          const rawText = await this.processingService.extractText(
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

          // 3. Generate Embeddings for each chunk
          const chunkRows: ChunkRow[] = await Promise.all(
            chunks.map(async (content, index) => {
              let embedding: number[] | null = null;
              let embeddingFailed = false;

              try {
                embedding = await this.aiService.getEmbedding(content);
              } catch (embeddingError: unknown) {
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

          // 4. Store the chunks with their vectors
          const { error: chunkError } = await supabaseAdmin
            .from('document_chunks')
            .insert(chunkRows);

          if (chunkError) throw chunkError;
          this.logger.log(
            `[AI-Ready] Successfully vectorized and stored doc: ${dbDoc.id}`,
          );
        } catch (procError: unknown) {
          const message =
            procError instanceof Error ? procError.message : 'Unknown error';
          this.logger.warn(`[AI-Prep] Processing failed: ${message}`);
        }
      } else if (isImage) {
        try {
          this.logger.log(`[AI-Prep] Analyzing image: ${result.file_name}`);
          const imageDescription = await this.aiService.analyzeImage(
            file.buffer,
            file.mimetype,
          );

          // Generate embedding for the image description
          let embedding: number[] | null = null;
          let embeddingFailed = false;

          try {
            embedding = await this.aiService.getEmbedding(imageDescription);
          } catch (embeddingError: unknown) {
            const message =
              embeddingError instanceof Error
                ? embeddingError.message
                : 'Unknown error';
            embeddingFailed = true;
            this.logger.warn(
              `[AI-Prep] Image embedding failed: ${message}. Storing image description without embedding.`,
            );
          }

          // Store the image description as a document chunk
          const { error: chunkError } = await supabaseAdmin
            .from('document_chunks')
            .insert({
              document_id: dbDoc.id,
              user_id: userId,
              content: imageDescription,
              embedding,
              metadata: {
                type: 'image',
                original_name: result.file_name,
                embedding_failed: embeddingFailed,
              },
            });

          if (chunkError) throw chunkError;
          this.logger.log(
            `[AI-Ready] Successfully analyzed and stored image: ${dbDoc.id}`,
          );
        } catch (procError: unknown) {
          const message =
            procError instanceof Error ? procError.message : 'Unknown error';
          this.logger.warn(`[AI-Prep] Image analysis failed: ${message}`);
        }
      }

      return result;
    } catch (error) {
      this.logger.error('File upload service error:', error);
      throw new InternalServerErrorException('Failed to process file upload');
    }
  }

  // deleteFile and getSignedUrl stay exactly as they were...
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const bucketSearchStr = `${this.bucketName}/`;
      const startIndex = fileUrl.indexOf(bucketSearchStr);
      if (startIndex === -1) throw new BadRequestException('Invalid file URL');
      const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);
      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);
      if (error) throw new InternalServerErrorException('Delete failed');
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to delete file');
    }
  }

  async getSignedUrl(
    fileUrl: string,
    expiresIn: number = 3600,
  ): Promise<string> {
    try {
      const bucketSearchStr = `${this.bucketName}/`;
      const startIndex = fileUrl.indexOf(bucketSearchStr);
      if (startIndex === -1) throw new BadRequestException('Invalid file URL');
      const filePath = fileUrl.substring(startIndex + bucketSearchStr.length);
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);
      if (error || !data)
        throw new InternalServerErrorException('Signed URL failed');
      return data.signedUrl;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Failed to get signed URL');
    }
  }
}

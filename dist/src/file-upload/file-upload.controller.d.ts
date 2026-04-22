/// <reference types="node" />
/// <reference types="node" />
import { Request } from 'express';
import { FileUploadService } from './file-upload.service';
import { StudySessionService } from '../study-session/study-session.service';
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
}
interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
export declare class FileUploadController {
  private readonly fileUploadService;
  private readonly studySessionService;
  constructor(
    fileUploadService: FileUploadService,
    studySessionService: StudySessionService,
  );
  uploadFileJson(
    req: AuthenticatedRequest,
    body: {
      fileData: string;
      fileName: string;
      fileType: string;
      folder?: string;
      session_id?: string;
    },
  ): Promise<{
    id?: string | undefined;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    message: string;
  }>;
  uploadFile(
    req: AuthenticatedRequest,
    file: MulterFile,
    folder?: string,
    sessionId?: string,
    sessionIdAlt?: string,
  ): Promise<
    | {
        id: string;
        session_id: string;
        user_id: string;
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
        created_at: string;
        message: string;
        document_id: string | undefined;
      }
    | {
        id?: string | undefined;
        file_name: string;
        file_url: string;
        file_type: string;
        file_size: number;
        message: string;
      }
  >;
  deleteFile(fileUrl: string): Promise<{
    message: string;
  }>;
  getSignedUrl(
    fileUrl: string,
    expiresIn?: number,
  ): Promise<{
    signed_url: string;
  }>;
  uploadSessionFile(
    req: AuthenticatedRequest,
    file: MulterFile,
    sessionId: string,
  ): Promise<{
    id: string;
    session_id: string;
    user_id: string;
    file_name: string;
    file_url: string;
    file_type: string;
    file_size: number;
    created_at: string;
    message: string;
    document_id: string | undefined;
  }>;
}
export {};

export declare class ChatQueryDto {
  question: string;
  mode?: 'text' | 'image' | 'pdf' | 'audio' | 'research';
  history?: any[];
  attachmentUrl?: string;
  attachmentType?: string;
  attachmentData?: string;
  attachmentMimeType?: string;
  documentId?: string;
  document_id?: string;
  sessionId?: string;
  session_id?: string;
  fileName?: string;
  file_name?: string;
  fileUrl?: string;
  file_url?: string;
}

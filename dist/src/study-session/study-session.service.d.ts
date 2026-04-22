import {
  CreateStudySessionDto,
  UpdateStudySessionDto,
  StudySessionResponse,
  StudySessionListResponse,
  CreateSessionNoteDto,
  UpdateSessionNoteDto,
  SessionNoteResponse,
  SessionNoteListResponse,
  CreateSessionFileDto,
  SessionFileResponse,
  SessionFileListResponse,
} from './dto/study-session.dto';
export declare class StudySessionService {
  create(
    userId: string,
    createDto: CreateStudySessionDto,
  ): Promise<StudySessionResponse>;
  findAll(userId: string): Promise<StudySessionListResponse>;
  findOne(userId: string, sessionId: string): Promise<StudySessionResponse>;
  update(
    userId: string,
    sessionId: string,
    updateDto: UpdateStudySessionDto,
  ): Promise<StudySessionResponse>;
  remove(
    userId: string,
    sessionId: string,
  ): Promise<{
    message: string;
  }>;
  createNote(
    userId: string,
    createDto: CreateSessionNoteDto,
  ): Promise<SessionNoteResponse>;
  findAllNotes(
    userId: string,
    sessionId: string,
  ): Promise<SessionNoteListResponse>;
  findNoteById(userId: string, noteId: string): Promise<SessionNoteResponse>;
  updateNote(
    userId: string,
    noteId: string,
    updateDto: UpdateSessionNoteDto,
  ): Promise<SessionNoteResponse>;
  removeNote(
    userId: string,
    noteId: string,
  ): Promise<{
    message: string;
  }>;
  createFile(
    userId: string,
    createDto: CreateSessionFileDto,
  ): Promise<SessionFileResponse>;
  findAllFiles(
    userId: string,
    sessionId: string,
  ): Promise<SessionFileListResponse>;
  removeFile(
    userId: string,
    fileId: string,
  ): Promise<{
    message: string;
  }>;
}

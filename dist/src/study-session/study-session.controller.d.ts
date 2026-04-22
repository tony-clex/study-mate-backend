import { Request } from 'express';
import { StudySessionService } from './study-session.service';
import { SpacedCardService } from './spaced-card.service';
import { ProgressService } from './progress.service';
import { CollaborationService } from './collaboration.service';
import {
  CreateStudySessionDto,
  UpdateStudySessionDto,
  CreateSessionNoteDto,
  UpdateSessionNoteDto,
  CreateSessionFileDto,
} from './dto/study-session.dto';
import { CreateSpacedCardDto, ReviewCardDto } from './dto/spaced-card.dto';
import {
  CreateCollaboratorDto,
  UpdateCollaboratorStatusDto,
} from './dto/collaborator.dto';
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
  userId: string;
}
export declare class StudySessionController {
  private readonly studySessionService;
  private readonly spacedCardService;
  private readonly progressService;
  private readonly collaborationService;
  constructor(
    studySessionService: StudySessionService,
    spacedCardService: SpacedCardService,
    progressService: ProgressService,
    collaborationService: CollaborationService,
  );
  create(
    req: AuthenticatedRequest,
    createDto: CreateStudySessionDto,
  ): Promise<import('./dto/study-session.dto').StudySessionResponse>;
  findAll(
    req: AuthenticatedRequest,
  ): Promise<import('./dto/study-session.dto').StudySessionListResponse>;
  findOne(
    req: AuthenticatedRequest,
    id: string,
  ): Promise<import('./dto/study-session.dto').StudySessionResponse>;
  update(
    req: AuthenticatedRequest,
    id: string,
    updateDto: UpdateStudySessionDto,
  ): Promise<import('./dto/study-session.dto').StudySessionResponse>;
  remove(
    req: AuthenticatedRequest,
    id: string,
  ): Promise<{
    message: string;
  }>;
  createNote(
    req: AuthenticatedRequest,
    sessionId: string,
    createDto: CreateSessionNoteDto,
  ): Promise<import('./dto/study-session.dto').SessionNoteResponse>;
  findAllNotes(
    req: AuthenticatedRequest,
    sessionId: string,
  ): Promise<import('./dto/study-session.dto').SessionNoteListResponse>;
  findNoteById(
    req: AuthenticatedRequest,
    sessionId: string,
    noteId: string,
  ): Promise<import('./dto/study-session.dto').SessionNoteResponse>;
  updateNote(
    req: AuthenticatedRequest,
    sessionId: string,
    noteId: string,
    updateDto: UpdateSessionNoteDto,
  ): Promise<import('./dto/study-session.dto').SessionNoteResponse>;
  removeNote(
    req: AuthenticatedRequest,
    sessionId: string,
    noteId: string,
  ): Promise<{
    message: string;
  }>;
  findAllFiles(
    req: AuthenticatedRequest,
    sessionId: string,
  ): Promise<import('./dto/study-session.dto').SessionFileListResponse>;
  createFile(
    req: AuthenticatedRequest,
    sessionId: string,
    createDto: CreateSessionFileDto,
  ): Promise<import('./dto/study-session.dto').SessionFileResponse>;
  removeFile(
    req: AuthenticatedRequest,
    sessionId: string,
    fileId: string,
  ): Promise<{
    message: string;
  }>;
  createCard(
    req: AuthenticatedRequest,
    createDto: CreateSpacedCardDto,
  ): Promise<import('./dto/spaced-card.dto').SpacedCardResponse>;
  findAllCards(
    req: AuthenticatedRequest,
    sessionId?: string,
  ): Promise<import('./dto/spaced-card.dto').SpacedCardListResponse>;
  findDueCards(
    req: AuthenticatedRequest,
  ): Promise<import('./dto/spaced-card.dto').SpacedCardListResponse>;
  findCard(
    req: AuthenticatedRequest,
    id: string,
  ): Promise<import('./dto/spaced-card.dto').SpacedCardResponse>;
  updateCard(
    req: AuthenticatedRequest,
    id: string,
    body: {
      frontText?: string;
      backText?: string;
      sessionId?: string;
    },
  ): Promise<import('./dto/spaced-card.dto').SpacedCardResponse>;
  reviewCard(
    req: AuthenticatedRequest,
    id: string,
    reviewDto: ReviewCardDto,
  ): Promise<import('./dto/spaced-card.dto').SpacedCardResponse>;
  deleteCard(
    req: AuthenticatedRequest,
    id: string,
  ): Promise<{
    message: string;
  }>;
  getProgress(
    req: AuthenticatedRequest,
    startDate?: string,
    endDate?: string,
  ): Promise<import('./dto/progress.dto').StudyProgressListResponse>;
  getStats(
    req: AuthenticatedRequest,
  ): Promise<import('./dto/progress.dto').StudyStatsResponse>;
  addCollaborator(
    req: AuthenticatedRequest,
    createDto: CreateCollaboratorDto,
  ): Promise<import('./dto/collaborator.dto').CollaboratorResponse>;
  getCollaborators(
    req: AuthenticatedRequest,
    sessionId: string,
  ): Promise<import('./dto/collaborator.dto').CollaboratorListResponse>;
  updateCollaboratorStatus(
    req: AuthenticatedRequest,
    sessionId: string,
    updateDto: UpdateCollaboratorStatusDto,
  ): Promise<import('./dto/collaborator.dto').CollaboratorResponse>;
  removeCollaborator(
    req: AuthenticatedRequest,
    sessionId: string,
    collaboratorId: string,
  ): Promise<{
    message: string;
  }>;
  getSharedSessions(req: AuthenticatedRequest): Promise<any[]>;
  getPendingInvites(
    req: AuthenticatedRequest,
  ): Promise<import('./dto/collaborator.dto').CollaboratorListResponse>;
}
export {};

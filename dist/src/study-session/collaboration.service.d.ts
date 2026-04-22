import {
  CreateCollaboratorDto,
  UpdateCollaboratorStatusDto,
  CollaboratorResponse,
  CollaboratorListResponse,
} from './dto/collaborator.dto';
export declare class CollaborationService {
  private readonly logger;
  addCollaborator(
    ownerId: string,
    createDto: CreateCollaboratorDto,
  ): Promise<CollaboratorResponse>;
  findCollaborators(
    userId: string,
    sessionId: string,
  ): Promise<CollaboratorListResponse>;
  updateCollaboratorStatus(
    userId: string,
    sessionId: string,
    updateDto: UpdateCollaboratorStatusDto,
  ): Promise<CollaboratorResponse>;
  removeCollaborator(
    ownerId: string,
    sessionId: string,
    collaboratorId: string,
  ): Promise<{
    message: string;
  }>;
  getSharedSessions(userId: string): Promise<any[]>;
  getPendingInvites(userId: string): Promise<CollaboratorListResponse>;
  private getSessionById;
  private findCollaborator;
  private findCollaboratorBySessionAndUser;
  private isCollaborator;
  private mapToResponse;
}

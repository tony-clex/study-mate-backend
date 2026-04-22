export declare enum CollaboratorRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}
export declare enum CollaboratorStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}
export declare class CreateCollaboratorDto {
  sessionId: string;
  collaboratorId: string;
  role?: CollaboratorRole;
}
export declare class UpdateCollaboratorStatusDto {
  status: CollaboratorStatus;
}
export declare class CollaboratorResponse {
  id: string;
  sessionId: string;
  ownerId: string;
  collaboratorId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export declare class CollaboratorListResponse {
  collaborators: CollaboratorResponse[];
  total: number;
}

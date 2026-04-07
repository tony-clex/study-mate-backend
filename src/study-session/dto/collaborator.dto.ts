import { IsUUID, IsEnum, IsOptional } from 'class-validator';

export enum CollaboratorRole {
  VIEWER = 'viewer',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export enum CollaboratorStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export class CreateCollaboratorDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  collaboratorId: string;

  @IsEnum(CollaboratorRole)
  @IsOptional()
  role?: CollaboratorRole = CollaboratorRole.VIEWER;
}

export class UpdateCollaboratorStatusDto {
  @IsEnum(CollaboratorStatus)
  status: CollaboratorStatus;
}

export class CollaboratorResponse {
  id: string;
  sessionId: string;
  ownerId: string;
  collaboratorId: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export class CollaboratorListResponse {
  collaborators: CollaboratorResponse[];
  total: number;
}

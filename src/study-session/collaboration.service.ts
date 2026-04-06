import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
import {
  CreateCollaboratorDto,
  UpdateCollaboratorStatusDto,
  CollaboratorResponse,
  CollaboratorListResponse,
} from './dto/collaborator.dto';

interface CollaboratorDbRow {
  id: string;
  session_id: string;
  owner_id: string;
  collaborator_id: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  async addCollaborator(
    ownerId: string,
    createDto: CreateCollaboratorDto,
  ): Promise<CollaboratorResponse> {
    const { sessionId, collaboratorId, role } = createDto;

    const session = await this.getSessionById(sessionId);
    if (session.user_id !== ownerId) {
      throw new BadRequestException('You can only add collaborators to your own sessions');
    }

    if (session.user_id === collaboratorId) {
      throw new BadRequestException('You cannot add yourself as a collaborator');
    }

    const existingCollaborator = await this.findCollaborator(sessionId, collaboratorId);
    if (existingCollaborator) {
      throw new BadRequestException('User is already a collaborator on this session');
    }

    const { data, error } = (await supabaseAdmin
      .from('session_collaborators')
      .insert({
        session_id: sessionId,
        owner_id: ownerId,
        collaborator_id: collaboratorId,
        role: role || 'viewer',
        status: 'pending',
      })
      .select()
      .single()) as { data: CollaboratorDbRow | null; error: any };

    if (error) {
      this.logger.error(`Failed to add collaborator: ${error.message}`);
      throw new BadRequestException('Failed to add collaborator');
    }

    if (!data) {
      throw new BadRequestException('Failed to add collaborator');
    }

    return this.mapToResponse(data);
  }

  async findCollaborators(
    userId: string,
    sessionId: string,
  ): Promise<CollaboratorListResponse> {
    const session = await this.getSessionById(sessionId);
    const hasAccess = session.user_id === userId || await this.isCollaborator(userId, sessionId);
    
    if (!hasAccess) {
      throw new NotFoundException('Session not found');
    }

    const { data, error } = (await supabaseAdmin
      .from('session_collaborators')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })) as {
      data: CollaboratorDbRow[] | null;
      error: any;
    };

    if (error) {
      this.logger.error(`Failed to fetch collaborators: ${error.message}`);
      throw new BadRequestException('Failed to fetch collaborators');
    }

    const collaborators = (data ?? []).map((c) => this.mapToResponse(c));

    return {
      collaborators,
      total: collaborators.length,
    };
  }

  async updateCollaboratorStatus(
    userId: string,
    sessionId: string,
    updateDto: UpdateCollaboratorStatusDto,
  ): Promise<CollaboratorResponse> {
    const collaborator = await this.findCollaboratorBySessionAndUser(sessionId, userId);

    if (!collaborator) {
      throw new NotFoundException('Collaboration invite not found');
    }

    if (collaborator.status !== 'pending') {
      throw new BadRequestException('Collaboration status has already been updated');
    }

    const { data, error } = (await supabaseAdmin
      .from('session_collaborators')
      .update({
        status: updateDto.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', collaborator.id)
      .select()
      .single()) as { data: CollaboratorDbRow | null; error: any };

    if (error || !data) {
      throw new BadRequestException('Failed to update collaboration status');
    }

    return this.mapToResponse(data);
  }

  async removeCollaborator(
    ownerId: string,
    sessionId: string,
    collaboratorId: string,
  ): Promise<{ message: string }> {
    const session = await this.getSessionById(sessionId);
    if (session.user_id !== ownerId) {
      throw new BadRequestException('You can only remove collaborators from your own sessions');
    }

    const collaborator = await this.findCollaborator(sessionId, collaboratorId);
    if (!collaborator) {
      throw new NotFoundException('Collaborator not found');
    }

    const { error } = await supabaseAdmin
      .from('session_collaborators')
      .delete()
      .eq('id', collaborator.id);

    if (error) {
      this.logger.error(`Failed to remove collaborator: ${error.message}`);
      throw new BadRequestException('Failed to remove collaborator');
    }

    return { message: 'Collaborator removed successfully' };
  }

  async getSharedSessions(userId: string): Promise<any[]> {
    const { data, error } = (await supabaseAdmin
      .from('session_collaborators')
      .select(`
        id,
        role,
        status,
        created_at,
        session:study_sessions (
          id,
          title,
          subject,
          created_at,
          user_id
        )
      `)
      .eq('collaborator_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })) as {
        data: any[] | null;
        error: any;
      };

    if (error) {
      this.logger.error(`Failed to fetch shared sessions: ${error.message}`);
      throw new BadRequestException('Failed to fetch shared sessions');
    }

    return data ?? [];
  }

  async getPendingInvites(userId: string): Promise<CollaboratorListResponse> {
    const { data, error } = (await supabaseAdmin
      .from('session_collaborators')
      .select('*')
      .eq('collaborator_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })) as {
        data: CollaboratorDbRow[] | null;
        error: any;
      };

    if (error) {
      this.logger.error(`Failed to fetch pending invites: ${error.message}`);
      throw new BadRequestException('Failed to fetch pending invites');
    }

    const collaborators = (data ?? []).map((c) => this.mapToResponse(c));

    return {
      collaborators,
      total: collaborators.length,
    };
  }

  private async getSessionById(sessionId: string): Promise<any> {
    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()) as { data: any; error: any };

    if (error || !data) {
      throw new NotFoundException('Study session not found');
    }

    return data;
  }

  private async findCollaborator(
    sessionId: string,
    collaboratorId: string,
  ): Promise<CollaboratorDbRow | null> {
    const { data } = (await supabaseAdmin
      .from('session_collaborators')
      .select('*')
      .eq('session_id', sessionId)
      .eq('collaborator_id', collaboratorId)
      .single()) as { data: CollaboratorDbRow | null };

    return data;
  }

  private async findCollaboratorBySessionAndUser(
    sessionId: string,
    userId: string,
  ): Promise<CollaboratorDbRow | null> {
    return this.findCollaborator(sessionId, userId);
  }

  private async isCollaborator(userId: string, sessionId: string): Promise<boolean> {
    const collaborator = await this.findCollaborator(sessionId, userId);
    return collaborator !== null && collaborator.status === 'accepted';
  }

  private mapToResponse(data: CollaboratorDbRow): CollaboratorResponse {
    return {
      id: data.id,
      sessionId: data.session_id,
      ownerId: data.owner_id,
      collaboratorId: data.collaborator_id,
      role: data.role,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
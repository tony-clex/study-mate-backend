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
var CollaborationService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.CollaborationService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
let CollaborationService =
  (CollaborationService_1 = class CollaborationService {
    logger = new common_1.Logger(CollaborationService_1.name);
    async addCollaborator(ownerId, createDto) {
      const { sessionId, collaboratorId, role } = createDto;
      const session = await this.getSessionById(sessionId);
      if (session.user_id !== ownerId) {
        throw new common_1.BadRequestException(
          'You can only add collaborators to your own sessions',
        );
      }
      if (session.user_id === collaboratorId) {
        throw new common_1.BadRequestException(
          'You cannot add yourself as a collaborator',
        );
      }
      const existingCollaborator = await this.findCollaborator(
        sessionId,
        collaboratorId,
      );
      if (existingCollaborator) {
        throw new common_1.BadRequestException(
          'User is already a collaborator on this session',
        );
      }
      const { data, error } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .insert({
          session_id: sessionId,
          owner_id: ownerId,
          collaborator_id: collaboratorId,
          role: role || 'viewer',
          status: 'pending',
        })
        .select()
        .single();
      if (error) {
        this.logger.error(`Failed to add collaborator: ${error.message}`);
        throw new common_1.BadRequestException('Failed to add collaborator');
      }
      if (!data) {
        throw new common_1.BadRequestException('Failed to add collaborator');
      }
      return this.mapToResponse(data);
    }
    async findCollaborators(userId, sessionId) {
      const session = await this.getSessionById(sessionId);
      const hasAccess =
        session.user_id === userId ||
        (await this.isCollaborator(userId, sessionId));
      if (!hasAccess) {
        throw new common_1.NotFoundException('Session not found');
      }
      const { data, error } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });
      if (error) {
        this.logger.error(`Failed to fetch collaborators: ${error.message}`);
        throw new common_1.BadRequestException('Failed to fetch collaborators');
      }
      const collaborators = (data ?? []).map((c) => this.mapToResponse(c));
      return {
        collaborators,
        total: collaborators.length,
      };
    }
    async updateCollaboratorStatus(userId, sessionId, updateDto) {
      const collaborator = await this.findCollaboratorBySessionAndUser(
        sessionId,
        userId,
      );
      if (!collaborator) {
        throw new common_1.NotFoundException('Collaboration invite not found');
      }
      if (collaborator.status !== 'pending') {
        throw new common_1.BadRequestException(
          'Collaboration status has already been updated',
        );
      }
      const { data, error } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .update({
          status: updateDto.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', collaborator.id)
        .select()
        .single();
      if (error || !data) {
        throw new common_1.BadRequestException(
          'Failed to update collaboration status',
        );
      }
      return this.mapToResponse(data);
    }
    async removeCollaborator(ownerId, sessionId, collaboratorId) {
      const session = await this.getSessionById(sessionId);
      if (session.user_id !== ownerId) {
        throw new common_1.BadRequestException(
          'You can only remove collaborators from your own sessions',
        );
      }
      const collaborator = await this.findCollaborator(
        sessionId,
        collaboratorId,
      );
      if (!collaborator) {
        throw new common_1.NotFoundException('Collaborator not found');
      }
      const { error } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .delete()
        .eq('id', collaborator.id);
      if (error) {
        this.logger.error(`Failed to remove collaborator: ${error.message}`);
        throw new common_1.BadRequestException('Failed to remove collaborator');
      }
      return { message: 'Collaborator removed successfully' };
    }
    async getSharedSessions(userId) {
      const { data, error } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .select(
          `
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
      `,
        )
        .eq('collaborator_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });
      if (error) {
        this.logger.error(`Failed to fetch shared sessions: ${error.message}`);
        throw new common_1.BadRequestException(
          'Failed to fetch shared sessions',
        );
      }
      return data ?? [];
    }
    async getPendingInvites(userId) {
      const { data, error } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .select('*')
        .eq('collaborator_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) {
        this.logger.error(`Failed to fetch pending invites: ${error.message}`);
        throw new common_1.BadRequestException(
          'Failed to fetch pending invites',
        );
      }
      const collaborators = (data ?? []).map((c) => this.mapToResponse(c));
      return {
        collaborators,
        total: collaborators.length,
      };
    }
    async getSessionById(sessionId) {
      const { data, error } = await supabase_client_1.supabaseAdmin
        .from('study_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      if (error || !data) {
        throw new common_1.NotFoundException('Study session not found');
      }
      return data;
    }
    async findCollaborator(sessionId, collaboratorId) {
      const { data } = await supabase_client_1.supabaseAdmin
        .from('session_collaborators')
        .select('*')
        .eq('session_id', sessionId)
        .eq('collaborator_id', collaboratorId)
        .single();
      return data;
    }
    async findCollaboratorBySessionAndUser(sessionId, userId) {
      return this.findCollaborator(sessionId, userId);
    }
    async isCollaborator(userId, sessionId) {
      const collaborator = await this.findCollaborator(sessionId, userId);
      return collaborator !== null && collaborator.status === 'accepted';
    }
    mapToResponse(data) {
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
  });
CollaborationService = CollaborationService_1 = __decorate(
  [(0, common_1.Injectable)()],
  CollaborationService,
);
exports.CollaborationService = CollaborationService;
//# sourceMappingURL=collaboration.service.js.map

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
  };
  userId: string;
}

@Controller('api')
@UseGuards(JwtAuthGuard)
export class StudySessionController {
  constructor(
    private readonly studySessionService: StudySessionService,
    private readonly spacedCardService: SpacedCardService,
    private readonly progressService: ProgressService,
    private readonly collaborationService: CollaborationService,
  ) {}

  @Post('session/create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: CreateStudySessionDto,
  ) {
    const userId = req.user.id;
    const result = await this.studySessionService.create(userId, createDto);
    await this.progressService.recordActivity(userId, 'session');
    return result;
  }

  @Get('session/list')
  async findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.studySessionService.findAll(userId);
  }

  // IMPORTANT: Specific routes must come BEFORE parameterized routes
  @Get('session/:id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findOne(userId, id);
  }

  @Patch('session/:id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStudySessionDto,
  ) {
    const userId = req.user.id;
    return this.studySessionService.update(userId, id, updateDto);
  }

  @Delete('session/:id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.remove(userId, id);
  }

  @Post('session/:sessionId/notes')
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() createDto: CreateSessionNoteDto,
  ) {
    const userId = req.user.id;
    const result = await this.studySessionService.createNote(userId, {
      ...createDto,
      session_id: sessionId,
    });
    await this.progressService.recordActivity(userId, 'note');
    return result;
  }

  @Get('session/:sessionId/notes')
  async findAllNotes(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findAllNotes(userId, sessionId);
  }

  @Get('session/:sessionId/notes/:noteId')
  async findNoteById(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findNoteById(userId, noteId);
  }

  @Patch('session/:sessionId/notes/:noteId')
  async updateNote(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() updateDto: UpdateSessionNoteDto,
  ) {
    const userId = req.user.id;
    return this.studySessionService.updateNote(userId, noteId, updateDto);
  }

  @Delete('session/:sessionId/notes/:noteId')
  @HttpCode(HttpStatus.OK)
  async removeNote(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.removeNote(userId, noteId);
  }

  @Get('session/:sessionId/files')
  async findAllFiles(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findAllFiles(userId, sessionId);
  }

  @Post('session/:sessionId/files')
  @HttpCode(HttpStatus.CREATED)
  async createFile(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() createDto: CreateSessionFileDto,
  ) {
    const userId = req.user.id;
    const result = await this.studySessionService.createFile(userId, {
      ...createDto,
      session_id: sessionId,
    });
    await this.progressService.recordActivity(userId, 'file');
    return result;
  }

  @Delete('session/:sessionId/files/:fileId')
  @HttpCode(HttpStatus.OK)
  async removeFile(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.removeFile(userId, fileId);
  }

  @Post('cards')
  @HttpCode(HttpStatus.CREATED)
  async createCard(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: CreateSpacedCardDto,
  ) {
    const userId = req.user.id;
    const result = await this.spacedCardService.create(userId, createDto);
    await this.progressService.recordActivity(userId, 'card_learn');
    return result;
  }

  @Get('cards')
  async findAllCards(
    @Req() req: AuthenticatedRequest,
    @Query('sessionId') sessionId?: string,
  ) {
    const userId = req.user.id;
    return this.spacedCardService.findAll(userId, sessionId);
  }

  @Get('cards/due')
  async findDueCards(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.spacedCardService.findDueCards(userId);
  }

  @Get('cards/:id')
  async findCard(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.spacedCardService.findOne(userId, id);
  }

  @Patch('cards/:id')
  async updateCard(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { frontText?: string; backText?: string; sessionId?: string },
  ) {
    const userId = req.user.id;
    return this.spacedCardService.update(userId, id, body);
  }

  @Post('cards/:id/review')
  @HttpCode(HttpStatus.OK)
  async reviewCard(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewDto: ReviewCardDto,
  ) {
    const userId = req.user.id;
    const result = await this.spacedCardService.review(userId, id, reviewDto);
    await this.progressService.recordActivity(userId, 'card_review');
    return result;
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.OK)
  async deleteCard(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.spacedCardService.remove(userId, id);
  }

  @Get('progress')
  async getProgress(
    @Req() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const userId = req.user.id;
    return this.progressService.getProgress(userId, startDate, endDate);
  }

  @Get('progress/stats')
  async getStats(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.progressService.getStats(userId);
  }

  @Post('collaboration/invite')
  @HttpCode(HttpStatus.CREATED)
  async addCollaborator(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: CreateCollaboratorDto,
  ) {
    const ownerId = req.user.id;
    return this.collaborationService.addCollaborator(ownerId, createDto);
  }

  @Get('collaboration/session/:sessionId')
  async getCollaborators(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const userId = req.user.id;
    return this.collaborationService.findCollaborators(userId, sessionId);
  }

  @Patch('collaboration/invite/:sessionId')
  async updateCollaboratorStatus(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() updateDto: UpdateCollaboratorStatusDto,
  ) {
    const userId = req.user.id;
    return this.collaborationService.updateCollaboratorStatus(
      userId,
      sessionId,
      updateDto,
    );
  }

  @Delete('collaboration/session/:sessionId/collaborator/:collaboratorId')
  @HttpCode(HttpStatus.OK)
  async removeCollaborator(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('collaboratorId', ParseUUIDPipe) collaboratorId: string,
  ) {
    const ownerId = req.user.id;
    return this.collaborationService.removeCollaborator(
      ownerId,
      sessionId,
      collaboratorId,
    );
  }

  @Get('collaboration/shared')
  async getSharedSessions(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.collaborationService.getSharedSessions(userId);
  }

  @Get('collaboration/invites')
  async getPendingInvites(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.collaborationService.getPendingInvites(userId);
  }
}

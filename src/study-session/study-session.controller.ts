import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { StudySessionService } from './study-session.service';
import {
  CreateStudySessionDto,
  UpdateStudySessionDto,
  CreateSessionNoteDto,
  UpdateSessionNoteDto,
  CreateSessionFileDto,
} from './dto/study-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { id: string; email: string };
  userId: string;
}

@Controller('api/session')
@UseGuards(JwtAuthGuard)
export class StudySessionController {
  constructor(private readonly studySessionService: StudySessionService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: CreateStudySessionDto,
  ) {
    const userId = req.user.id;
    return this.studySessionService.create(userId, createDto);
  }

  @Get('list')
  async findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.studySessionService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStudySessionDto,
  ) {
    const userId = req.user.id;
    return this.studySessionService.update(userId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.remove(userId, id);
  }

  @Post(':sessionId/notes')
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() createDto: CreateSessionNoteDto,
  ) {
    const userId = req.user.id;
    return this.studySessionService.createNote(userId, {
      ...createDto,
      session_id: sessionId,
    });
  }

  @Get(':sessionId/notes')
  async findAllNotes(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findAllNotes(userId, sessionId);
  }

  @Get(':sessionId/notes/:noteId')
  async findNoteById(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.findNoteById(userId, noteId);
  }

  @Patch(':sessionId/notes/:noteId')
  async updateNote(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Body() updateDto: UpdateSessionNoteDto,
  ) {
    const userId = req.user.id;
    return this.studySessionService.updateNote(userId, noteId, updateDto);
  }

  @Delete(':sessionId/notes/:noteId')
  @HttpCode(HttpStatus.OK)
  async removeNote(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
  ) {
    const userId = req.user.id;
    return this.studySessionService.removeNote(userId, noteId);
  }

  // File endpoints for session file management
  @Get(':sessionId/files')
  async findAllFiles(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.findAllFiles(userId, sessionId);
  }

  @Post(':sessionId/files')
  @HttpCode(HttpStatus.CREATED)
  async createFile(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() createDto: CreateSessionFileDto,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.createFile(userId, {
      ...createDto,
      session_id: sessionId,
    });
  }

  @Delete(':sessionId/files/:fileId')
  @HttpCode(HttpStatus.OK)
  async removeFile(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.removeFile(userId, fileId);
  }
}

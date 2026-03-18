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
} from './dto/study-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest {
  user: { sub: string; email: string };
  userId: string;
}

@Controller('api/session')
@UseGuards(JwtAuthGuard)
export class StudySessionController {
  constructor(private readonly studySessionService: StudySessionService) {}

  /**
   * Create a new study session
   * POST /api/session/create
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() createDto: CreateStudySessionDto,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.create(userId, createDto);
  }

  @Get('list')
  async findAll(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.studySessionService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateStudySessionDto,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.update(userId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const userId = req.user.sub;
    return this.studySessionService.remove(userId, id);
  }
}

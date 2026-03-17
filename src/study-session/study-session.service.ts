import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { supabase } from '../config/supabase.client';
import {
  CreateStudySessionDto,
  UpdateStudySessionDto,
  StudySessionResponse,
  StudySessionListResponse,
} from './dto/study-session.dto';

interface StudySessionDbRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

@Injectable()
export class StudySessionService {
  /**
   * Create a new study session
   * @param userId - The authenticated user's ID from JWT
   * @param createDto - The session data
   */
  async create(
    userId: string,
    createDto: CreateStudySessionDto,
  ): Promise<StudySessionResponse> {
    const { title } = createDto;

    if (!title || title.trim().length === 0) {
      throw new BadRequestException('Title cannot be empty');
    }

    const { data, error } = (await supabase
      .from('study_sessions')
      .insert({
        user_id: userId,
        title: title.trim(),
      })
      .select()
      .single()) as { data: StudySessionDbRow | null; error: null };

    if (error) {
      console.error('Supabase insert error:', error);
      throw new BadRequestException('Failed to create study session');
    }

    if (!data) {
      throw new BadRequestException('Failed to create study session');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
    };
  }

  /**
   * Get all study sessions for the authenticated user
   * @param userId - The authenticated user's ID from JWT
   */
  async findAll(userId: string): Promise<StudySessionListResponse> {
    const { data, error } = (await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: StudySessionDbRow[] | null;
      error: null;
    };

    if (error) {
      console.error('Supabase select error:', error);
      throw new BadRequestException('Failed to fetch study sessions');
    }

    const sessions: StudySessionResponse[] = (data ?? []).map((session) => ({
      id: session.id,
      user_id: session.user_id,
      title: session.title,
      created_at: session.created_at,
    }));

    return {
      sessions,
      total: sessions.length,
    };
  }

  /**
   * Get a single study session by ID
   * @param userId - The authenticated user's ID from JWT
   * @param sessionId - The session ID to find
   */
  async findOne(
    userId: string,
    sessionId: string,
  ): Promise<StudySessionResponse> {
    const { data, error } = (await supabase
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()) as { data: StudySessionDbRow | null; error: null };

    if (error || !data) {
      throw new NotFoundException('Study session not found');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
    };
  }

  /**
   * Update a study session
   * @param userId - The authenticated user's ID from JWT
   * @param sessionId - The session ID to update
   * @param updateDto - The updated session data
   */
  async update(
    userId: string,
    sessionId: string,
    updateDto: UpdateStudySessionDto,
  ): Promise<StudySessionResponse> {
    const { title } = updateDto;

    if (!title || title.trim().length === 0) {
      throw new BadRequestException('Title cannot be empty');
    }

    // First check if session exists and belongs to user
    await this.findOne(userId, sessionId);

    const { data, error } = (await supabase
      .from('study_sessions')
      .update({ title: title.trim() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()) as { data: StudySessionDbRow | null; error: null };

    if (error || !data) {
      console.error('Supabase update error:', error);
      throw new BadRequestException('Failed to update study session');
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      created_at: data.created_at,
    };
  }

  /**
   * Delete a study session
   * @param userId - The authenticated user's ID from JWT
   * @param sessionId - The session ID to delete
   */
  async remove(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    // First check if session exists and belongs to user
    await this.findOne(userId, sessionId);

    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new BadRequestException('Failed to delete study session');
    }

    return { message: 'Study session deleted successfully' };
  }
}

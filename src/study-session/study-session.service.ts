import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.client';
import {
  CreateStudySessionDto,
  UpdateStudySessionDto,
  StudySessionResponse,
  StudySessionListResponse,
  CreateSessionNoteDto,
  UpdateSessionNoteDto,
  SessionNoteResponse,
  SessionNoteListResponse,
} from './dto/study-session.dto';

interface StudySessionDbRow {
  id: string;
  user_id: string;
  title: string;
  subject: string | null;
  created_at: string;
}

interface SessionNoteDbRow {
  id: string;
  session_id: string;
  user_id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Map Supabase/PostgREST errors to appropriate HTTP exceptions
 */
function mapSupabaseError(error: SupabaseError, operation: string): void {
  const code = error?.code;
  const message = error?.message;
  const details = error?.details;
  const hint = error?.hint;

  console.error(`[StudySession] ${operation} error:`, {
    code,
    message,
    details,
    hint,
  });

  // PGRST205 - Could not find the table in the schema cache
  if (code === 'PGRST205' || message?.includes('study_sessions')) {
    throw new InternalServerErrorException({
      code: 'TABLE_MISSING',
      message: 'Database table missing: study_sessions',
      hint: 'Please run the SQL migration to create the table',
      details: { code, hint },
    });
  }

  // PGRST204 - Could not find the table
  if (code === 'PGRST204') {
    throw new InternalServerErrorException({
      code: 'TABLE_NOT_FOUND',
      message: `Table not found: ${message}`,
      hint: 'Please verify the table exists in your Supabase database',
      details: { code },
    });
  }

  // PGREST116 - Row not found
  if (code === 'PGREST116' || message?.includes('0 rows')) {
    throw new NotFoundException('Study session not found');
  }

  // Foreign key violation
  if (code === '23503') {
    throw new BadRequestException(
      'Invalid reference: related record does not exist',
    );
  }

  // Check constraints
  if (code === '23514') {
    throw new BadRequestException(`Constraint violation: ${details}`);
  }

  // Default to bad request for known auth errors
  if (code === '42501') {
    throw new InternalServerErrorException(
      'Permission denied: RLS policy violation',
    );
  }

  throw new BadRequestException({
    message: `Failed to ${operation.toLowerCase()} study session`,
    error: message,
    details,
  });
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
    const { title, subject } = createDto;

    if (!title || title.trim().length === 0) {
      throw new BadRequestException('Title cannot be empty');
    }

    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .insert({
        user_id: userId,
        title: title.trim(),
        subject: subject?.trim() || null,
      })
      .select()
      .single()) as { data: StudySessionDbRow | null; error: null };

    if (error) {
      mapSupabaseError(error, 'create session');
    }

    if (!data) {
      throw new BadRequestException(
        'Failed to create study session: no data returned',
      );
    }

    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      subject: data.subject,
      created_at: data.created_at,
    };
  }

  /**
   * Get all study sessions for the authenticated user
   * @param userId
   */
  async findAll(userId: string): Promise<StudySessionListResponse> {
    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: StudySessionDbRow[] | null;
      error: null;
    };

    if (error) {
      mapSupabaseError(error, 'fetch sessions');
    }

    const sessions: StudySessionResponse[] = (data ?? []).map((session) => ({
      id: session.id,
      user_id: session.user_id,
      title: session.title,
      subject: session.subject,
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
    const { data, error } = (await supabaseAdmin
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
      subject: data.subject,
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

    await this.findOne(userId, sessionId);

    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .update({ title: title.trim() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single()) as { data: StudySessionDbRow | null; error: null };

    if (error || !data) {
      mapSupabaseError(
        error || new Error('Session not found'),
        'update session',
      );
    }

    // TypeScript knows data is not null after mapSupabaseError (it throws)
    return {
      id: data!.id,
      user_id: data!.user_id,
      title: data!.title,
      subject: data!.subject,
      created_at: data!.created_at,
    };
  }

  /**
   * @param userId - The authenticated user's ID from JWT
   * @param sessionId - The session ID to delete
   */
  async remove(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
    // First check if session exists and belongs to user
    await this.findOne(userId, sessionId);

    const { error } = await supabaseAdmin
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      mapSupabaseError(error, 'delete session');
    }

    return { message: 'Study session deleted successfully' };
  }

  /**
   * Create a new note for a study session
   * @param userId - The authenticated user's ID from JWT
   * @param createDto - The note data
   */
  async createNote(
    userId: string,
    createDto: CreateSessionNoteDto,
  ): Promise<SessionNoteResponse> {
    const { session_id, title, content, file_url, file_name, file_type } =
      createDto;

    // Verify the session exists and belongs to the user
    await this.findOne(userId, session_id);

    const { data, error } = (await supabaseAdmin
      .from('session_notes')
      .insert({
        session_id,
        user_id: userId,
        title: title.trim(),
        content: content?.trim() || null,
        file_url: file_url || null,
        file_name: file_name || null,
        file_type: file_type || null,
      })
      .select()
      .single()) as { data: SessionNoteDbRow | null; error: null };

    if (error) {
      console.error('Supabase insert note error:', error);
      throw new BadRequestException('Failed to create session note');
    }

    if (!data) {
      throw new BadRequestException('Failed to create session note');
    }

    return {
      id: data.id,
      session_id: data.session_id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      file_url: data.file_url,
      file_name: data.file_name,
      file_type: data.file_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Get all notes for a specific study session
   * @param userId - The authenticated user's ID from JWT
   * @param sessionId - The session ID
   */
  async findAllNotes(
    userId: string,
    sessionId: string,
  ): Promise<SessionNoteListResponse> {
    await this.findOne(userId, sessionId);

    const { data, error } = (await supabaseAdmin
      .from('session_notes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: SessionNoteDbRow[] | null;
      error: null;
    };

    if (error) {
      console.error('Supabase select notes error:', error);
      throw new BadRequestException('Failed to fetch session notes');
    }

    const notes: SessionNoteResponse[] = (data ?? []).map((note) => ({
      id: note.id,
      session_id: note.session_id,
      user_id: note.user_id,
      title: note.title,
      content: note.content,
      file_url: note.file_url,
      file_name: note.file_name,
      file_type: note.file_type,
      created_at: note.created_at,
      updated_at: note.updated_at,
    }));

    return {
      notes,
      total: notes.length,
    };
  }

  /**
   * Get a single note by ID
   * @param userId - The authenticated user's ID from JWT
   * @param noteId - The note ID to find
   */
  async findNoteById(
    userId: string,
    noteId: string,
  ): Promise<SessionNoteResponse> {
    const { data, error } = (await supabaseAdmin
      .from('session_notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single()) as { data: SessionNoteDbRow | null; error: null };

    if (error || !data) {
      throw new NotFoundException('Session note not found');
    }

    return {
      id: data.id,
      session_id: data.session_id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      file_url: data.file_url,
      file_name: data.file_name,
      file_type: data.file_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Update a session note
   * @param userId - The authenticated user's ID from JWT
   * @param noteId - The note ID to update
   * @param updateDto - The updated note data
   */
  async updateNote(
    userId: string,
    noteId: string,
    updateDto: UpdateSessionNoteDto,
  ): Promise<SessionNoteResponse> {
    await this.findNoteById(userId, noteId);

    const updateData: Record<string, unknown> = {};

    if (updateDto.title !== undefined) {
      updateData.title = updateDto.title.trim();
    }
    if (updateDto.content !== undefined) {
      updateData.content = updateDto.content?.trim() || null;
    }
    if (updateDto.file_url !== undefined) {
      updateData.file_url = updateDto.file_url || null;
    }
    if (updateDto.file_name !== undefined) {
      updateData.file_name = updateDto.file_name || null;
    }
    if (updateDto.file_type !== undefined) {
      updateData.file_type = updateDto.file_type || null;
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = (await supabaseAdmin
      .from('session_notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single()) as { data: SessionNoteDbRow | null; error: null };

    if (error || !data) {
      console.error('Supabase update note error:', error);
      throw new BadRequestException('Failed to update session note');
    }

    return {
      id: data.id,
      session_id: data.session_id,
      user_id: data.user_id,
      title: data.title,
      content: data.content,
      file_url: data.file_url,
      file_name: data.file_name,
      file_type: data.file_type,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  }

  /**
   * Delete a session note
   * @param userId - The authenticated user's ID from JWT
   * @param noteId - The note ID to delete
   */
  async removeNote(
    userId: string,
    noteId: string,
  ): Promise<{ message: string }> {
    await this.findNoteById(userId, noteId);

    const { error } = await supabaseAdmin
      .from('session_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete note error:', error);
      throw new BadRequestException('Failed to delete session note');
    }

    return { message: 'Session note deleted successfully' };
  }
}

// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import { supabaseAdmin } from '../config/supabase.client';
// import {
//   CreateStudySessionDto,
//   UpdateStudySessionDto,
//   StudySessionResponse,
//   StudySessionListResponse,
//   CreateSessionNoteDto,
//   UpdateSessionNoteDto,
//   SessionNoteResponse,
//   SessionNoteListResponse,
//   CreateSessionFileDto,
//   SessionFileResponse,
//   SessionFileListResponse,
// } from './dto/study-session.dto';

// interface StudySessionDbRow {
//   id: string;
//   user_id: string;
//   title: string;
//   subject: string | null;
//   created_at: string;
// }

// interface SessionNoteDbRow {
//   id: string;
//   session_id: string;
//   user_id: string;
//   title: string;
//   content: string | null;
//   file_url: string | null;
//   file_name: string | null;
//   file_type: string | null;
//   created_at: string;
//   updated_at: string;
// }

// interface SessionFileDbRow {
//   id: string;
//   session_id: string;
//   user_id: string;
//   file_name: string;
//   file_url: string;
//   file_type: string;
//   file_size: number;
//   created_at: string;
// }

// @Injectable()
// export class StudySessionService {
//   /**
//    * Helper to map Supabase errors to NestJS Exceptions
//    * Moved inside the class to resolve Scope/Export issues
//    */
//   private mapSupabaseError(error: unknown, operation: string): never {
//     if (error && typeof error === 'object' && 'message' in error) {
//       const errMsg = (error as { message: string }).message.toLowerCase();
//       if (errMsg.includes('row') && errMsg.includes('not found')) {
//         throw new NotFoundException(`${operation} failed: resource not found`);
//       }
//       if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
//         throw new BadRequestException(`${operation} failed: duplicate entry`);
//       }
//       if (errMsg.includes('violates') || errMsg.includes('constraint')) {
//         throw new BadRequestException(
//           `${operation} failed: constraint violation`,
//         );
//       }
//     }
//     throw new InternalServerErrorException(`${operation} failed`);
//   }

//   async create(
//     userId: string,
//     createDto: CreateStudySessionDto,
//   ): Promise<StudySessionResponse> {
//     const { title, subject } = createDto;

//     if (!title || title.trim().length === 0) {
//       throw new BadRequestException('Title cannot be empty');
//     }

//     const { data, error } = (await supabaseAdmin
//       .from('study_sessions')
//       .insert({
//         user_id: userId,
//         title: title.trim(),
//         subject: subject?.trim() || null,
//       })
//       .select()
//       .single()) as { data: StudySessionDbRow | null; error: SupabaseError };

//     if (error) {
//       this.mapSupabaseError(error, 'create session');
//     }

//     if (!data) {
//       throw new BadRequestException(
//         'Failed to create study session: no data returned',
//       );
//     }

//     return {
//       id: data.id,
//       user_id: data.user_id,
//       title: data.title,
//       subject: data.subject,
//       created_at: data.created_at,
//     };
//   }

//   async findAll(userId: string): Promise<StudySessionListResponse> {
//     const { data, error } = (await supabaseAdmin
//       .from('study_sessions')
//       .select('*')
//       .eq('user_id', userId)
//       .order('created_at', { ascending: false })) as {
//       data: StudySessionDbRow[] | null;
//       error: SupabaseError;
//     };

//     if (error) {
//       this.mapSupabaseError(error, 'fetch sessions');
//     }

//     const sessions: StudySessionResponse[] = (data ?? []).map((session) => ({
//       id: session.id,
//       user_id: session.user_id,
//       title: session.title,
//       subject: session.subject,
//       created_at: session.created_at,
//     }));

//     return {
//       sessions,
//       total: sessions.length,
//     };
//   }

//   async findOne(
//     userId: string,
//     sessionId: string,
//   ): Promise<StudySessionResponse> {
//     const { data, error } = (await supabaseAdmin
//       .from('study_sessions')
//       .select('*')
//       .eq('id', sessionId)
//       .eq('user_id', userId)
//       .single()) as { data: StudySessionDbRow | null; error: SupabaseError };

//     if (error || !data) {
//       throw new NotFoundException('Study session not found');
//     }

//     return {
//       id: data.id,
//       user_id: data.user_id,
//       title: data.title,
//       subject: data.subject,
//       created_at: data.created_at,
//     };
//   }

//   async update(
//     userId: string,
//     sessionId: string,
//     updateDto: UpdateStudySessionDto,
//   ): Promise<StudySessionResponse> {
//     const { title } = updateDto;

//     if (!title || title.trim().length === 0) {
//       throw new BadRequestException('Title cannot be empty');
//     }

//     await this.findOne(userId, sessionId);

//     const { data, error } = (await supabaseAdmin
//       .from('study_sessions')
//       .update({ title: title.trim() })
//       .eq('id', sessionId)
//       .eq('user_id', userId)
//       .select()
//       .single()) as { data: StudySessionDbRow | null; error: SupabaseError };

//     if (error || !data) {
//       this.mapSupabaseError(
//         error || new Error('Session not found'),
//         'update session',
//       );
//     }

//     return {
//       id: data.id,
//       user_id: data.user_id,
//       title: data.title,
//       subject: data.subject,
//       created_at: data.created_at,
//     };
//   }

//   async remove(
//     userId: string,
//     sessionId: string,
//   ): Promise<{ message: string }> {
//     await this.findOne(userId, sessionId);

//     const { error } = await supabaseAdmin
//       .from('study_sessions')
//       .delete()
//       .eq('id', sessionId)
//       .eq('user_id', userId);

//     if (error) {
//       this.mapSupabaseError(error, 'delete session');
//     }

//     return { message: 'Study session deleted successfully' };
//   }

//   async createNote(
//     userId: string,
//     createDto: CreateSessionNoteDto,
//   ): Promise<SessionNoteResponse> {
//     const { session_id, title, content, file_url, file_name, file_type } =
//       createDto;

//     await this.findOne(userId, session_id);

//     const { data, error } = (await supabaseAdmin
//       .from('session_notes')
//       .insert({
//         session_id,
//         user_id: userId,
//         title: title.trim(),
//         content: content?.trim() || null,
//         file_url: file_url || null,
//         file_name: file_name || null,
//         file_type: file_type || null,
//       })
//       .select()
//       .single()) as { data: SessionNoteDbRow | null; error: SupabaseError };

//     if (error) {
//       console.error('Supabase insert note error:', error);
//       throw new BadRequestException('Failed to create session note');
//     }

//     if (!data) {
//       throw new BadRequestException('Failed to create session note');
//     }

//     return {
//       id: data.id,
//       session_id: data.session_id,
//       user_id: data.user_id,
//       title: data.title,
//       content: data.content,
//       file_url: data.file_url,
//       file_name: data.file_name,
//       file_type: data.file_type,
//       created_at: data.created_at,
//       updated_at: data.updated_at,
//     };
//   }

//   async findAllNotes(
//     userId: string,
//     sessionId: string,
//   ): Promise<SessionNoteListResponse> {
//     await this.findOne(userId, sessionId);

//     const { data, error } = (await supabaseAdmin
//       .from('session_notes')
//       .select('*')
//       .eq('session_id', sessionId)
//       .eq('user_id', userId)
//       .order('created_at', { ascending: false })) as {
//       data: SessionNoteDbRow[] | null;
//       error: SupabaseError;
//     };

//     if (error) {
//       console.error('Supabase select notes error:', error);
//       throw new BadRequestException('Failed to fetch session notes');
//     }

//     const notes: SessionNoteResponse[] = (data ?? []).map((note) => ({
//       id: note.id,
//       session_id: note.session_id,
//       user_id: note.user_id,
//       title: note.title,
//       content: note.content,
//       file_url: note.file_url,
//       file_name: note.file_name,
//       file_type: note.file_type,
//       created_at: note.created_at,
//       updated_at: note.updated_at,
//     }));

//     return {
//       notes,
//       total: notes.length,
//     };
//   }

//   async findNoteById(
//     userId: string,
//     noteId: string,
//   ): Promise<SessionNoteResponse> {
//     const { data, error } = (await supabaseAdmin
//       .from('session_notes')
//       .select('*')
//       .eq('id', noteId)
//       .eq('user_id', userId)
//       .single()) as { data: SessionNoteDbRow | null; error: SupabaseError };

//     if (error || !data) {
//       throw new NotFoundException('Session note not found');
//     }

//     return {
//       id: data.id,
//       session_id: data.session_id,
//       user_id: data.user_id,
//       title: data.title,
//       content: data.content,
//       file_url: data.file_url,
//       file_name: data.file_name,
//       file_type: data.file_type,
//       created_at: data.created_at,
//       updated_at: data.updated_at,
//     };
//   }

//   async updateNote(
//     userId: string,
//     noteId: string,
//     updateDto: UpdateSessionNoteDto,
//   ): Promise<SessionNoteResponse> {
//     await this.findNoteById(userId, noteId);

//     const updateData: Record<string, unknown> = {};

//     if (updateDto.title !== undefined) {
//       updateData.title = updateDto.title.trim();
//     }
//     if (updateDto.content !== undefined) {
//       updateData.content = updateDto.content?.trim() || null;
//     }
//     if (updateDto.file_url !== undefined) {
//       updateData.file_url = updateDto.file_url || null;
//     }
//     if (updateDto.file_name !== undefined) {
//       updateData.file_name = updateDto.file_name || null;
//     }
//     if (updateDto.file_type !== undefined) {
//       updateData.file_type = updateDto.file_type || null;
//     }

//     updateData.updated_at = new Date().toISOString();

//     const { data, error } = (await supabaseAdmin
//       .from('session_notes')
//       .update(updateData)
//       .eq('id', noteId)
//       .eq('user_id', userId)
//       .select()
//       .single()) as { data: SessionNoteDbRow | null; error: SupabaseError };

//     if (error || !data) {
//       console.error('Supabase update note error:', error);
//       throw new BadRequestException('Failed to update session note');
//     }

//     return {
//       id: data.id,
//       session_id: data.session_id,
//       user_id: data.user_id,
//       title: data.title,
//       content: data.content,
//       file_url: data.file_url,
//       file_name: data.file_name,
//       file_type: data.file_type,
//       created_at: data.created_at,
//       updated_at: data.updated_at,
//     };
//   }

//   async removeNote(
//     userId: string,
//     noteId: string,
//   ): Promise<{ message: string }> {
//     await this.findNoteById(userId, noteId);

//     const { error } = await supabaseAdmin
//       .from('session_notes')
//       .delete()
//       .eq('id', noteId)
//       .eq('user_id', userId);

//     if (error) {
//       console.error('Supabase delete note error:', error);
//       throw new BadRequestException('Failed to delete session note');
//     }

//     return { message: 'Session note deleted successfully' };
//   }

//   async createFile(
//     userId: string,
//     createDto: CreateSessionFileDto,
//   ): Promise<SessionFileResponse> {
//     const { session_id, file_url, file_name, file_type, file_size } = createDto;

//     await this.findOne(userId, session_id);

//     const { data, error } = (await supabaseAdmin
//       .from('session_files')
//       .insert({
//         session_id,
//         user_id: userId,
//         file_url,
//         file_name,
//         file_type,
//         file_size,
//       })
//       .select()
//       .single()) as { data: SessionFileDbRow | null; error: SupabaseError };

//     if (error) {
//       console.error('Supabase insert file error:', error);
//       throw new BadRequestException('Failed to link file to session');
//     }

//     if (!data) {
//       throw new BadRequestException('Failed to link file to session');
//     }

//     return {
//       id: data.id,
//       session_id: data.session_id,
//       user_id: data.user_id,
//       file_name: data.file_name,
//       file_url: data.file_url,
//       file_type: data.file_type,
//       file_size: data.file_size,
//       created_at: data.created_at,
//     };
//   }

//   async findAllFiles(
//     userId: string,
//     sessionId: string,
//   ): Promise<SessionFileListResponse> {
//     await this.findOne(userId, sessionId);

//     const { data, error } = (await supabaseAdmin
//       .from('session_files')
//       .select('*')
//       .eq('session_id', sessionId)
//       .eq('user_id', userId)
//       .order('created_at', { ascending: false })) as {
//       data: SessionFileDbRow[] | null;
//       error: SupabaseError;
//     };

//     if (error) {
//       console.error('Supabase select files error:', error);
//       throw new BadRequestException('Failed to fetch session files');
//     }

//     const files: SessionFileResponse[] = (data ?? []).map((file) => ({
//       id: file.id,
//       session_id: file.session_id,
//       user_id: file.user_id,
//       file_name: file.file_name,
//       file_url: file.file_url,
//       file_type: file.file_type,
//       file_size: file.file_size,
//       created_at: file.created_at,
//     }));

//     return {
//       files,
//       total: files.length,
//     };
//   }

//   async removeFile(
//     userId: string,
//     fileId: string,
//   ): Promise<{ message: string }> {
//     const { data: existingFile, error: findError } = (await supabaseAdmin
//       .from('session_files')
//       .select('*')
//       .eq('id', fileId)
//       .eq('user_id', userId)
//       .single()) as { data: SessionFileDbRow | null; error: SupabaseError };

//     if (findError || !existingFile) {
//       throw new NotFoundException('Session file not found');
//     }

//     const { error } = await supabaseAdmin
//       .from('session_files')
//       .delete()
//       .eq('id', fileId)
//       .eq('user_id', userId);

//     if (error) {
//       console.error('Supabase delete file error:', error);
//       throw new BadRequestException('Failed to remove file from session');
//     }

//     return { message: 'File removed from session successfully' };
//   }
// }

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
  CreateSessionFileDto,
  SessionFileResponse,
  SessionFileListResponse,
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

interface SessionFileDbRow {
  id: string;
  session_id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

function mapSupabaseError(error: unknown, operation: string): never {
  if (error && typeof error === 'object' && 'message' in error) {
    const errMsg = (error as { message: string }).message.toLowerCase();
    if (errMsg.includes('row') && errMsg.includes('not found')) {
      throw new NotFoundException(`${operation} failed: resource not found`);
    }
    if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
      throw new BadRequestException(`${operation} failed: duplicate entry`);
    }
    if (errMsg.includes('violates') || errMsg.includes('constraint')) {
      throw new BadRequestException(
        `${operation} failed: constraint violation`,
      );
    }
  }
  throw new InternalServerErrorException(`${operation} failed`);
}

interface SupabaseError {
  message: string;
}

@Injectable()
export class StudySessionService {
  async create(
    userId: string,
    createDto: CreateStudySessionDto,
  ): Promise<StudySessionResponse> {
    const { title, subject } = createDto;

    if (!title || title.trim().length === 0) {
      throw new BadRequestException('Title cannot be empty');
    }

    console.log(
      `[StudySession] create called - userId: ${userId}, title: ${title}`,
    );

    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .insert({
        user_id: userId,
        title: title.trim(),
        subject: subject?.trim() || null,
      })
      .select()
      .single()) as { data: StudySessionDbRow | null; error: SupabaseError };

    if (error) {
      console.log(`[StudySession] create error: ${error.message}`);
      mapSupabaseError(error, 'create session');
    }

    if (!data) {
      throw new BadRequestException(
        'Failed to create study session: no data returned',
      );
    }

    console.log(`[StudySession] created - sessionId: ${data.id}`);
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      subject: data.subject,
      created_at: data.created_at,
    };
  }

  async findAll(userId: string): Promise<StudySessionListResponse> {
    console.log(`[StudySession] findAll called - userId: ${userId}`);

    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: StudySessionDbRow[] | null;
      error: SupabaseError;
    };

    if (error) {
      console.log(`[StudySession] findAll error: ${error.message}`);
      mapSupabaseError(error, 'fetch sessions');
    }

    console.log(
      `[StudySession] findAll returned ${data?.length ?? 0} sessions`,
    );

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

  async findOne(
    userId: string,
    sessionId: string,
  ): Promise<StudySessionResponse> {
    console.log(
      `[StudySession] findOne called - userId: ${userId}, sessionId: ${sessionId}`,
    );

    const { data, error } = (await supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()) as { data: StudySessionDbRow | null; error: SupabaseError };

    if (error) {
      console.log(`[StudySession] findOne error: ${error.message}`);
    }
    if (!data) {
      console.log(
        `[StudySession] findOne - no data returned for sessionId: ${sessionId}, userId: ${userId}`,
      );
    }

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
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      subject: data.subject,
      created_at: data.created_at,
    };
  }

  async remove(
    userId: string,
    sessionId: string,
  ): Promise<{ message: string }> {
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

  async createNote(
    userId: string,
    createDto: CreateSessionNoteDto,
  ): Promise<SessionNoteResponse> {
    const { session_id, title, content, file_url, file_name, file_type } =
      createDto;

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

  // File management methods
  async createFile(
    userId: string,
    createDto: CreateSessionFileDto,
  ): Promise<SessionFileResponse> {
    const { session_id, file_url, file_name, file_type, file_size } = createDto;

    // Verify session exists
    await this.findOne(userId, session_id);

    const { data, error } = (await supabaseAdmin
      .from('session_files')
      .insert({
        session_id,
        user_id: userId,
        file_url,
        file_name,
        file_type,
        file_size,
      })
      .select()
      .single()) as { data: SessionFileDbRow | null; error: null };

    if (error) {
      console.error('Supabase insert file error:', error);
      throw new BadRequestException('Failed to link file to session');
    }

    if (!data) {
      throw new BadRequestException('Failed to link file to session');
    }

    return {
      id: data.id,
      session_id: data.session_id,
      user_id: data.user_id,
      file_name: data.file_name,
      file_url: data.file_url,
      file_type: data.file_type,
      file_size: data.file_size,
      created_at: data.created_at,
    };
  }

  async findAllFiles(
    userId: string,
    sessionId: string,
  ): Promise<SessionFileListResponse> {
    // Verify session exists
    await this.findOne(userId, sessionId);

    const { data, error } = (await supabaseAdmin
      .from('session_files')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })) as {
      data: SessionFileDbRow[] | null;
      error: null;
    };

    if (error) {
      console.error('Supabase select files error:', error);
      throw new BadRequestException('Failed to fetch session files');
    }

    const files: SessionFileResponse[] = (data ?? []).map((file) => ({
      id: file.id,
      session_id: file.session_id,
      user_id: file.user_id,
      file_name: file.file_name,
      file_url: file.file_url,
      file_type: file.file_type,
      file_size: file.file_size,
      created_at: file.created_at,
    }));

    return {
      files,
      total: files.length,
    };
  }

  async removeFile(
    userId: string,
    fileId: string,
  ): Promise<{ message: string }> {
    // Verify file exists and belongs to user
    const { data: existingFile, error: findError } = (await supabaseAdmin
      .from('session_files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single()) as { data: SessionFileDbRow | null; error: null };

    if (findError || !existingFile) {
      throw new NotFoundException('Session file not found');
    }

    const { error } = await supabaseAdmin
      .from('session_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase delete file error:', error);
      throw new BadRequestException('Failed to remove file from session');
    }

    return { message: 'File removed from session successfully' };
  }
}

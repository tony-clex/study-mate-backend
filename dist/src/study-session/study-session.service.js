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
Object.defineProperty(exports, '__esModule', { value: true });
exports.StudySessionService = void 0;
const common_1 = require('@nestjs/common');
const supabase_client_1 = require('../config/supabase.client');
function mapSupabaseError(error, operation) {
  if (error && typeof error === 'object' && 'message' in error) {
    const errMsg = error.message.toLowerCase();
    if (errMsg.includes('row') && errMsg.includes('not found')) {
      throw new common_1.NotFoundException(
        `${operation} failed: resource not found`,
      );
    }
    if (errMsg.includes('duplicate') || errMsg.includes('unique')) {
      throw new common_1.BadRequestException(
        `${operation} failed: duplicate entry`,
      );
    }
    if (errMsg.includes('violates') || errMsg.includes('constraint')) {
      throw new common_1.BadRequestException(
        `${operation} failed: constraint violation`,
      );
    }
  }
  throw new common_1.InternalServerErrorException(`${operation} failed`);
}
let StudySessionService = class StudySessionService {
  async create(userId, createDto) {
    const { title, subject } = createDto;
    if (!title || title.trim().length === 0) {
      throw new common_1.BadRequestException('Title cannot be empty');
    }
    console.log(
      `[StudySession] create called - userId: ${userId}, title: ${title}`,
    );
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('study_sessions')
      .insert({
        user_id: userId,
        title: title.trim(),
        subject: subject?.trim() || null,
      })
      .select()
      .single();
    if (error) {
      console.log(`[StudySession] create error: ${error.message}`);
      mapSupabaseError(error, 'create session');
    }
    if (!data) {
      throw new common_1.BadRequestException(
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
  async findAll(userId) {
    console.log(`[StudySession] findAll called - userId: ${userId}`);
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.log(`[StudySession] findAll error: ${error.message}`);
      mapSupabaseError(error, 'fetch sessions');
    }
    console.log(
      `[StudySession] findAll returned ${data?.length ?? 0} sessions`,
    );
    const sessions = (data ?? []).map((session) => ({
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
  async findOne(userId, sessionId) {
    console.log(
      `[StudySession] findOne called - userId: ${userId}, sessionId: ${sessionId}`,
    );
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();
    if (error) {
      console.log(`[StudySession] findOne error: ${error.message}`);
    }
    if (!data) {
      console.log(
        `[StudySession] findOne - no data returned for sessionId: ${sessionId}, userId: ${userId}`,
      );
    }
    if (error || !data) {
      throw new common_1.NotFoundException('Study session not found');
    }
    return {
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      subject: data.subject,
      created_at: data.created_at,
    };
  }
  async update(userId, sessionId, updateDto) {
    const { title } = updateDto;
    if (!title || title.trim().length === 0) {
      throw new common_1.BadRequestException('Title cannot be empty');
    }
    await this.findOne(userId, sessionId);
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('study_sessions')
      .update({ title: title.trim() })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !data) {
      mapSupabaseError(
        error || new Error('Session not found'),
        'update session',
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
  async remove(userId, sessionId) {
    await this.findOne(userId, sessionId);
    const { error } = await supabase_client_1.supabaseAdmin
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);
    if (error) {
      mapSupabaseError(error, 'delete session');
    }
    return { message: 'Study session deleted successfully' };
  }
  async createNote(userId, createDto) {
    const { session_id, title, content, file_url, file_name, file_type } =
      createDto;
    await this.findOne(userId, session_id);
    const { data, error } = await supabase_client_1.supabaseAdmin
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
      .single();
    if (error) {
      console.error('Supabase insert note error:', error);
      throw new common_1.BadRequestException('Failed to create session note');
    }
    if (!data) {
      throw new common_1.BadRequestException('Failed to create session note');
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
  async findAllNotes(userId, sessionId) {
    await this.findOne(userId, sessionId);
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('session_notes')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase select notes error:', error);
      throw new common_1.BadRequestException('Failed to fetch session notes');
    }
    const notes = (data ?? []).map((note) => ({
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
  async findNoteById(userId, noteId) {
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('session_notes')
      .select('*')
      .eq('id', noteId)
      .eq('user_id', userId)
      .single();
    if (error || !data) {
      throw new common_1.NotFoundException('Session note not found');
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
  async updateNote(userId, noteId, updateDto) {
    await this.findNoteById(userId, noteId);
    const updateData = {};
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
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('session_notes')
      .update(updateData)
      .eq('id', noteId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !data) {
      console.error('Supabase update note error:', error);
      throw new common_1.BadRequestException('Failed to update session note');
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
  async removeNote(userId, noteId) {
    await this.findNoteById(userId, noteId);
    const { error } = await supabase_client_1.supabaseAdmin
      .from('session_notes')
      .delete()
      .eq('id', noteId)
      .eq('user_id', userId);
    if (error) {
      console.error('Supabase delete note error:', error);
      throw new common_1.BadRequestException('Failed to delete session note');
    }
    return { message: 'Session note deleted successfully' };
  }
  async createFile(userId, createDto) {
    const { session_id, file_url, file_name, file_type, file_size } = createDto;
    await this.findOne(userId, session_id);
    const { data, error } = await supabase_client_1.supabaseAdmin
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
      .single();
    if (error) {
      console.error('Supabase insert file error:', error);
      throw new common_1.BadRequestException('Failed to link file to session');
    }
    if (!data) {
      throw new common_1.BadRequestException('Failed to link file to session');
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
  async findAllFiles(userId, sessionId) {
    await this.findOne(userId, sessionId);
    const { data, error } = await supabase_client_1.supabaseAdmin
      .from('session_files')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Supabase select files error:', error);
      throw new common_1.BadRequestException('Failed to fetch session files');
    }
    const files = (data ?? []).map((file) => ({
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
  async removeFile(userId, fileId) {
    const { data: existingFile, error: findError } =
      await supabase_client_1.supabaseAdmin
        .from('session_files')
        .select('*')
        .eq('id', fileId)
        .eq('user_id', userId)
        .single();
    if (findError || !existingFile) {
      throw new common_1.NotFoundException('Session file not found');
    }
    const { error } = await supabase_client_1.supabaseAdmin
      .from('session_files')
      .delete()
      .eq('id', fileId)
      .eq('user_id', userId);
    if (error) {
      console.error('Supabase delete file error:', error);
      throw new common_1.BadRequestException(
        'Failed to remove file from session',
      );
    }
    return { message: 'File removed from session successfully' };
  }
};
StudySessionService = __decorate(
  [(0, common_1.Injectable)()],
  StudySessionService,
);
exports.StudySessionService = StudySessionService;
//# sourceMappingURL=study-session.service.js.map

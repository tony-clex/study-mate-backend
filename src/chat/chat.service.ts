import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { ProcessingService } from '../documents/processing.service';
import { supabaseAdmin } from '../config/supabase.client';

interface MatchedChunk {
  content: string;
}

interface ChatQuestionInput {
  userId: string;
  question: string;
  documentId?: string;
  sessionId?: string;
  fileName?: string;
  fileUrl?: string;
}

interface SessionFileLookup {
  file_url: string;
  file_name?: string;
}

interface DocumentLookup {
  id: string;
}

interface DocumentRecord {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
}

export interface ChatResponse {
  answer?: string;
  foundInNotes?: boolean;
  provider?: string;
  fallback?: true;
  error?: string;
  documentScoped?: boolean;
  resolvedDocumentId?: string | null;
  chunkCount?: number;
}

interface ProviderResult {
  answer: string;
  provider: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly blockedChunkPhrases = [
    'no meaningful educational text in this pdf',
    'no meaningful educational content',
    'there is no meaningful educational text',
    'the pdf appears to be empty',
    'scanner watermarks',
    'no actual educational content',
    'based on the information provided',
    'based on the provided excerpts',
    'portable document format',
    'a pdf file is a type of digital file',
    'a pdf file is a digital document format',
  ];

  private readonly genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  private readonly groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
  private readonly openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
  });

  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  constructor(private readonly processingService: ProcessingService) {}

  private hasExplicitFileContext(input: ChatQuestionInput): boolean {
    return Boolean(
      input.documentId || input.sessionId || input.fileName || input.fileUrl,
    );
  }

  private async resolveDocumentId({
    userId,
    documentId,
    sessionId,
    fileName,
    fileUrl,
  }: ChatQuestionInput): Promise<string | null> {
    this.logger.log(
      `[Chat] Resolve input userId=${userId} documentId=${documentId ?? 'none'} sessionId=${sessionId ?? 'none'} fileName=${fileName ?? 'none'} fileUrl=${fileUrl ?? 'none'}`,
    );

    if (documentId) {
      this.logger.log(
        `[Chat] Using provided documentId directly: ${documentId}`,
      );
      return documentId;
    }

    let resolvedFileUrl = fileUrl;

    if (sessionId) {
      const sessionFileResult = fileUrl
        ? ((await supabaseAdmin
            .from('session_files')
            .select('file_url')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .eq('file_url', fileUrl)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()) as {
            data: SessionFileLookup | null;
            error: Error | null;
          })
        : fileName
          ? ((await supabaseAdmin
              .from('session_files')
              .select('file_url, file_name')
              .eq('user_id', userId)
              .eq('session_id', sessionId)
              .eq('file_name', fileName)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()) as {
              data: SessionFileLookup | null;
              error: Error | null;
            })
          : ((await supabaseAdmin
            .from('session_files')
            .select('file_url, file_name')
            .eq('user_id', userId)
            .eq('session_id', sessionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()) as {
            data: SessionFileLookup | null;
            error: Error | null;
          });

      if (sessionFileResult.error) {
        this.logger.warn(
          `[Chat] Failed to resolve session file context: ${sessionFileResult.error.message}`,
        );
      } else {
        resolvedFileUrl = sessionFileResult.data?.file_url;
        fileName = fileName ?? sessionFileResult.data?.file_name;
        this.logger.log(
          `[Chat] Session file lookup resolved fileName=${fileName ?? 'none'} fileUrl=${resolvedFileUrl ?? 'none'}`,
        );
      }
    }

    if (!resolvedFileUrl && !fileName) {
      this.logger.warn(
        '[Chat] Document resolution stopped early because neither fileUrl nor fileName could be resolved.',
      );
      return null;
    }

    const documentResult = resolvedFileUrl
      ? ((await supabaseAdmin
          .from('documents')
          .select('id')
          .eq('user_id', userId)
          .eq('file_url', resolvedFileUrl)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()) as {
          data: DocumentLookup | null;
          error: Error | null;
        })
      : ((await supabaseAdmin
          .from('documents')
          .select('id')
          .eq('user_id', userId)
          .eq('file_name', fileName ?? '')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()) as {
          data: DocumentLookup | null;
          error: Error | null;
        });

    if (documentResult.error) {
      this.logger.warn(
        `[Chat] Failed to resolve document context: ${documentResult.error.message}`,
      );
      return null;
    }

    this.logger.log(
      `[Chat] Document lookup resolved id=${documentResult.data?.id ?? 'none'} using fileUrl=${resolvedFileUrl ?? 'none'} fileName=${fileName ?? 'none'}`,
    );

    return documentResult.data?.id ?? null;
  }

  private async findRelevantChunks(
    userId: string,
    queryEmbedding: number[],
    documentId?: string | null,
  ): Promise<MatchedChunk[]> {
    const rpcResult = (await this.supabase.rpc(
      'match_document_chunks_for_user',
      {
        query_embedding: queryEmbedding,
        requesting_user_id: userId,
        filter_document_id: documentId ?? null,
        match_threshold: 0.3,
        match_count: 5,
      },
    )) as {
      data: MatchedChunk[] | null;
      error: Error | null;
    };

    if (!rpcResult.error) {
      return rpcResult.data ?? [];
    }

    this.logger.warn(
      `[Chat] Filtered chunk RPC failed: ${rpcResult.error.message}. Falling back to direct lookup.`,
    );

    const fallbackResult = documentId
      ? ((await supabaseAdmin
          .from('document_chunks')
          .select('content')
          .eq('user_id', userId)
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(5)) as {
          data: MatchedChunk[] | null;
          error: Error | null;
        })
      : ((await supabaseAdmin
          .from('document_chunks')
          .select('content')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)) as {
          data: MatchedChunk[] | null;
          error: Error | null;
        });

    if (fallbackResult.error) {
      this.logger.error(
        `Supabase fallback chunk lookup failed: ${fallbackResult.error.message}`,
      );
      throw fallbackResult.error;
    }

    return fallbackResult.data ?? [];
  }

  private async getRecentChunks(
    userId: string,
    documentId?: string | null,
  ): Promise<MatchedChunk[]> {
    const result = documentId
      ? ((await supabaseAdmin
          .from('document_chunks')
          .select('content')
          .eq('user_id', userId)
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(5)) as {
          data: MatchedChunk[] | null;
          error: Error | null;
        })
      : ((await supabaseAdmin
          .from('document_chunks')
          .select('content')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5)) as {
          data: MatchedChunk[] | null;
          error: Error | null;
        });

    if (result.error) {
      this.logger.warn(
        `[Chat] Direct chunk lookup failed: ${result.error.message}`,
      );
      return [];
    }

    return result.data ?? [];
  }

  private async getDocumentRecord(
    userId: string,
    documentId: string,
  ): Promise<DocumentRecord | null> {
    const documentResult = (await supabaseAdmin
      .from('documents')
      .select('id, file_name, file_url, file_type')
      .eq('user_id', userId)
      .eq('id', documentId)
      .maybeSingle()) as {
      data: DocumentRecord | null;
      error: Error | null;
    };

    if (documentResult.error) {
      this.logger.warn(
        `[Chat] Failed to fetch selected document: ${documentResult.error.message}`,
      );
      return null;
    }

    return documentResult.data;
  }

  private async explainDocumentDirectly(
    question: string,
    document: DocumentRecord,
  ): Promise<ProviderResult | null> {
    try {
      const extractedText =
        await this.processingService.extractTextForQuestionAnswering(
        document.file_url,
        document.file_type,
      );

      const context = extractedText.slice(0, 12000);
      const prompt = `
        You are a brilliant study assistant for the "Study-Mate" app.
        Answer the student's question using the extracted content from their uploaded file.

        FILE NAME:
        ${document.file_name}

        EXTRACTED DOCUMENT TEXT:
        ${context}

        STUDENT QUESTION:
        ${question}

        INSTRUCTION:
        Answer directly and clearly from the document text above.
        If the document text looks partial, noisy, or incomplete, still give the best useful explanation you can from what is present and mention briefly what was unclear.
        If the document text still does not contain the answer, say so briefly.
        Do not explain what CamScanner is unless the document itself is actually about CamScanner.
      `;

      return await this.generateWithFailover(prompt);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `[Chat] Direct document explanation failed: ${message}`,
      );

      if (document.file_type.includes('pdf')) {
        try {
          const answer = await this.processingService.answerQuestionFromPdf(
            document.file_url,
            question,
            document.file_name,
          );

          return {
            answer,
            provider: 'pdf-direct',
          };
        } catch (pdfQaError: unknown) {
          const pdfQaMessage =
            pdfQaError instanceof Error
              ? pdfQaError.message
              : 'Unknown error';
          this.logger.warn(
            `[Chat] Direct PDF Q&A fallback failed: ${pdfQaMessage}`,
          );
        }
      }

      return null;
    }
  }

  private isUsableRetrievedChunk(content: string): boolean {
    const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!normalized || normalized.length < 40) {
      return false;
    }

    return !this.blockedChunkPhrases.some((phrase) =>
      normalized.includes(phrase),
    );
  }

  private buildQuotaFallback(chunks: MatchedChunk[]): ChatResponse {
    if (chunks.length === 0) {
      return {
        answer:
          'AI answers are temporarily unavailable right now. Please try again shortly.',
        foundInNotes: false,
        fallback: true,
        chunkCount: 0,
      };
    }

    const excerpt = chunks
      .map((chunk) => chunk.content.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join('\n\n')
      .slice(0, 1200);

    return {
      answer: `AI is temporarily busy, but I found these note excerpts that may help:\n\n${excerpt}`,
      foundInNotes: true,
      fallback: true,
      chunkCount: chunks.length,
    };
  }

  private async generateWithGemini(prompt: string): Promise<string> {
    const chatModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-001',
    });
    const chatResult = await chatModel.generateContent(prompt);
    const response = chatResult.response;
    return response.text();
  }

  private async generateWithGroq(prompt: string): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
    });
    return completion.choices[0]?.message?.content || '';
  }

  private async generateWithOpenRouter(prompt: string): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'meta-llama/llama-3-8b-instruct',
    });
    return completion.choices[0]?.message?.content || '';
  }

  private async generateWithFailover(prompt: string): Promise<ProviderResult> {
    const providers: Array<{
      name: string;
      generate: () => Promise<string>;
    }> = [
      {
        name: 'openrouter',
        generate: () => this.generateWithOpenRouter(prompt),
      },
      {
        name: 'groq',
        generate: () => this.generateWithGroq(prompt),
      },
      {
        name: 'gemini',
        generate: () => this.generateWithGemini(prompt),
      },
    ];

    const failures: string[] = [];

    for (const provider of providers) {
      try {
        const answer = await provider.generate();
        this.logger.log(
          `[Chat] Successfully generated response with ${provider.name}`,
        );
        return { answer, provider: provider.name };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        failures.push(`${provider.name}: ${message}`);
        this.logger.warn(
          `[Chat] ${provider.name} failed: ${message}. Trying next provider...`,
        );
      }
    }

    throw new Error(failures.join(' | '));
  }

  private async createQueryEmbedding(question: string): Promise<number[] | null> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-embedding-001',
      });
      const result = await model.embedContent(question);
      return result.embedding.values;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `[Chat] Query embedding failed: ${message}. Falling back to direct chunk lookup.`,
      );
      return null;
    }
  }

  async askQuestion(input: ChatQuestionInput): Promise<ChatResponse> {
    try {
      const { userId, question } = input;

      if (!question?.trim()) {
        throw new BadRequestException('question is required');
      }

      this.logger.log(`[Chat] Processing question: ${question}`);
      this.logger.log(
        `[Chat] Incoming file context documentId=${input.documentId ?? 'none'} sessionId=${input.sessionId ?? 'none'} fileName=${input.fileName ?? 'none'} fileUrl=${input.fileUrl ?? 'none'}`,
      );

      // 1. Resolve the exact document when frontend provides file/session context.
      const resolvedDocumentId = await this.resolveDocumentId(input);
      const hasExplicitFileContext = this.hasExplicitFileContext(input);

      if (hasExplicitFileContext && !resolvedDocumentId) {
        this.logger.warn(
          '[Chat] File-specific chat was requested, but no matching document could be resolved. Refusing to answer from unrelated stored notes.',
        );
        return {
          answer:
            'I could not match this question to the selected uploaded file yet. Please resend the chat request with the latest file context or re-open the file and try again.',
          foundInNotes: false,
          provider: 'backend',
          documentScoped: true,
          resolvedDocumentId: null,
          chunkCount: 0,
        };
      }

      const queryEmbedding = await this.createQueryEmbedding(question);
      const rawChunks = queryEmbedding
        ? await this.findRelevantChunks(userId, queryEmbedding, resolvedDocumentId)
        : await this.getRecentChunks(userId, resolvedDocumentId);
      const documentScoped = Boolean(resolvedDocumentId);
      const chunks = rawChunks.filter((chunk) =>
        this.isUsableRetrievedChunk(chunk.content),
      );

      this.logger.log(
        `[Chat] incomingDocumentId=${input.documentId ?? 'none'} resolvedDocumentId=${resolvedDocumentId ?? 'none'} documentScoped=${documentScoped} rawChunkCount=${rawChunks.length} usableChunkCount=${chunks.length}`,
      );

      if (chunks.length > 0) {
        this.logger.log(
          `[Chat] First chunk preview: ${chunks[0].content.slice(0, 200)}`,
        );
      }

      if (documentScoped && chunks.length === 0) {
        const fallbackChunks = await this.getRecentChunks(
          userId,
          resolvedDocumentId,
        );
        const usableFallbackChunks = fallbackChunks.filter((chunk) =>
          this.isUsableRetrievedChunk(chunk.content),
        );

        if (usableFallbackChunks.length > 0) {
          const contextText = usableFallbackChunks
            .map((chunk) => chunk.content)
            .join('\n\n');
          const prompt = `
            You are a brilliant study assistant for the "Study-Mate" app.
            Use the following excerpts from the student's uploaded file to answer the question clearly.

            NOTES:
            ${contextText}

            STUDENT QUESTION:
            ${question}
          `;
          const providerResult = await this.generateWithFailover(prompt);
          return {
            answer: providerResult.answer,
            foundInNotes: true,
            provider: providerResult.provider,
            documentScoped,
            resolvedDocumentId,
            chunkCount: usableFallbackChunks.length,
          };
        }

        const selectedDocument = resolvedDocumentId
          ? await this.getDocumentRecord(userId, resolvedDocumentId)
          : null;

        if (selectedDocument) {
          const directAnswer = await this.explainDocumentDirectly(
            question,
            selectedDocument,
          );

          if (directAnswer) {
            return {
              answer: directAnswer.answer,
              foundInNotes: true,
              provider: `${directAnswer.provider}-direct-document`,
              documentScoped,
              resolvedDocumentId,
              chunkCount: 0,
            };
          }
        }

        return {
          answer:
            'We found the selected file, but I still could not extract enough real study text from it to explain the contents. Please try a clearer PDF, re-upload it, or use a text-based version instead of a scanned copy.',
          foundInNotes: false,
          provider: 'backend',
          documentScoped,
          resolvedDocumentId,
          chunkCount: 0,
        };
      }

      // 3. Prepare the prompt for AI
      const contextText =
        chunks.length > 0
          ? chunks.map((chunk) => chunk.content).join('\n\n')
          : documentScoped
            ? 'No text chunks were found for the selected uploaded file.'
            : 'No relevant study notes found in the database.';

      const hasNotes = chunks.length > 0;
      const prompt = hasNotes
        ? `
        You are a brilliant study assistant for the "Study-Mate" app. 
        Use the following excerpts from the student's own notes to answer their question.
        
        NOTES:
        ${contextText}
        
        STUDENT QUESTION: 
        ${question}
        
        INSTRUCTION: If the answer isn't in the notes, use your general knowledge but mention that it wasn't in their specific documents.
      `
        : `
        You are a brilliant study assistant for the "Study-Mate" app.
        
        STUDENT QUESTION: 
        ${question}
        
        INSTRUCTION: Answer the question directly using your general knowledge. Do not mention notes or documents.
      `;

      try {
        const providerResult = await this.generateWithFailover(prompt);

        return {
          answer: providerResult.answer,
          foundInNotes: chunks.length > 0,
          provider: providerResult.provider,
          documentScoped,
          resolvedDocumentId,
          chunkCount: chunks.length,
        };
      } catch (providerError: unknown) {
        const message =
          providerError instanceof Error
            ? providerError.message
            : 'Unknown error';
        this.logger.error(`[Chat] All AI providers failed. ${message}`);
        return this.buildQuotaFallback(chunks);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      this.logger.error(`Chat Error: ${message}`);

      if (e instanceof BadRequestException) {
        throw e;
      }

      return {
        error:
          "I'm having trouble connecting to my brain right now. Try again?",
        documentScoped: false,
        resolvedDocumentId: null,
        chunkCount: 0,
      };
    }
  }
}

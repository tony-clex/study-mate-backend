'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
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
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
var ProcessingService_1;
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProcessingService = void 0;
const common_1 = require('@nestjs/common');
const mammoth = __importStar(require('mammoth'));
const axios_1 = __importDefault(require('axios'));
const pdf_parse_fork_1 = __importDefault(require('pdf-parse-fork'));
const ai_service_1 = require('../ai/ai.service');
let ProcessingService = (ProcessingService_1 = class ProcessingService {
  aiService;
  logger = new common_1.Logger(ProcessingService_1.name);
  blockedExtractionPhrases = [
    'no meaningful educational text in this pdf',
    'no meaningful educational content',
    'there is no meaningful educational text',
    'the pdf appears to be empty',
    'the uploaded file seemed to be empty',
    'the file may have been a scan of a blank page',
    'scanner watermarks',
    'only scanner watermarks',
    'no actual educational content',
    'without any specific information',
    'based on the information provided',
    'based on the provided excerpts',
    'from the notes provided',
    'i could not find any specific information',
    'i do not have any specific details about the pdf file uploaded',
    'portable document format',
    'a pdf file is a type of digital file',
    'a pdf file is a digital document format',
  ];
  imageMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/heic',
    'image/heif',
    'image/x-heic',
    'image/x-heif',
  ];
  constructor(aiService) {
    this.aiService = aiService;
  }
  isImageFile(fileType) {
    return this.imageMimeTypes.some((type) =>
      fileType.toLowerCase().includes(type.replace('image/', '')),
    );
  }
  normalizeForQualityChecks(text) {
    return text.toLowerCase().replace(/\s+/g, ' ').trim();
  }
  containsBlockedExtractionSummary(text) {
    const normalized = this.normalizeForQualityChecks(text);
    if (
      this.blockedExtractionPhrases.some((phrase) =>
        normalized.includes(phrase),
      )
    ) {
      return true;
    }
    const blockedPatterns = [
      /appears to be (an )?empty file/,
      /no .*educational text/,
      /no .*educational content/,
      /only .*watermark/,
      /generic explanation of (what )?a pdf/,
      /from (the )?general knowledge/,
      /without more context/,
    ];
    return blockedPatterns.some((pattern) => pattern.test(normalized));
  }
  sanitizeExtractedText(text) {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const normalized = line.toLowerCase();
        return (
          line.length > 0 &&
          normalized !== 'camscanner' &&
          !normalized.includes('scanned by camscanner') &&
          !normalized.includes('camscanner')
        );
      })
      .join('\n')
      .replace(/\t/g, ' ')
      .replace(/ +/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }
  shouldUsePdfFallback(text) {
    const normalized = text.toLowerCase();
    const compactLength = text.replace(/\s/g, '').length;
    const watermarks = ['camscanner', 'scanned by', 'scan by'];
    const watermarkHits = watermarks.filter((term) =>
      normalized.includes(term),
    ).length;
    return compactLength < 200 || watermarkHits > 0;
  }
  async extractPdfWithTextParser(pdfBuffer) {
    this.logger.log('[AI-Prep] Extracting PDF text with local parser...');
    const parsed = await (0, pdf_parse_fork_1.default)(pdfBuffer);
    const extractedText = parsed.text?.trim() || '';
    if (!extractedText) {
      throw new Error('Local PDF parser returned empty text.');
    }
    this.logger.log(
      `[AI-Prep] Local PDF parser extracted ${extractedText.length} characters.`,
    );
    return extractedText;
  }
  isMeaningfulEducationalText(text) {
    const normalized = this.normalizeForQualityChecks(text);
    if (!normalized || normalized.length < 80) {
      return false;
    }
    if (this.containsBlockedExtractionSummary(normalized)) {
      return false;
    }
    const words = normalized.split(/\s+/).filter(Boolean);
    return words.length >= 20;
  }
  isUsableStudyChunk(text) {
    const normalized = this.normalizeForQualityChecks(text);
    if (!normalized || normalized.length < 30) {
      return false;
    }
    return !this.containsBlockedExtractionSummary(normalized);
  }
  async downloadFileBuffer(fileUrl) {
    const response = await axios_1.default.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
    });
    return Buffer.from(response.data);
  }
  async answerQuestionFromPdf(fileUrl, question, fileName) {
    try {
      this.logger.log(`[AI-Prep] Downloading PDF for direct Q&A: ${fileUrl}`);
      const buffer = await this.downloadFileBuffer(fileUrl);
      return await this.aiService.answerQuestionAboutPdf(
        buffer,
        question,
        fileName,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[AI-Prep] Direct PDF Q&A Failure: ${message}`);
      throw new common_1.InternalServerErrorException(
        `Document Q&A Error: ${message}`,
      );
    }
  }
  async extractText(fileUrl, fileType) {
    return this.extractTextInternal(fileUrl, fileType, true);
  }
  async extractTextForQuestionAnswering(fileUrl, fileType) {
    return this.extractTextInternal(fileUrl, fileType, false);
  }
  async extractTextInternal(fileUrl, fileType, requireMeaningfulText) {
    try {
      this.logger.log(`[AI-Prep] Downloading file for extraction: ${fileUrl}`);
      const buffer = await this.downloadFileBuffer(fileUrl);
      let extractedText = '';
      if (this.isImageFile(fileType)) {
        this.logger.log('[AI-Prep] Processing image with Gemini Vision OCR...');
        extractedText = await this.aiService.extractTextFromImage(
          buffer,
          fileType,
        );
      } else if (fileType.includes('pdf')) {
        try {
          extractedText = await this.extractPdfWithTextParser(buffer);
          if (this.shouldUsePdfFallback(extractedText)) {
            throw new Error(
              'Local PDF parser only found weak or watermarked text.',
            );
          }
          this.logger.log(
            '[AI-Prep] Local PDF parser successfully extracted PDF text',
          );
        } catch (localParserError) {
          const localParserMessage =
            localParserError instanceof Error
              ? localParserError.message
              : 'Unknown error';
          this.logger.warn(
            `[AI-Prep] Local PDF parser was insufficient: ${localParserMessage}. Trying AI vision...`,
          );
          try {
            extractedText =
              await this.aiService.extractStudyTextFromPdf(buffer);
            this.logger.log('[AI-Prep] Gemini successfully extracted PDF text');
          } catch (geminiError) {
            const geminiMessage =
              geminiError instanceof Error
                ? geminiError.message
                : 'Unknown error';
            this.logger.warn(
              `[AI-Prep] Gemini PDF extraction failed: ${geminiMessage}. Trying Groq...`,
            );
            try {
              extractedText = await this.aiService.extractPdfWithGroq(buffer);
              this.logger.log('[AI-Prep] Groq successfully extracted PDF text');
            } catch (groqError) {
              const groqMessage =
                groqError instanceof Error
                  ? groqError.message
                  : 'Unknown error';
              this.logger.error(`[AI-Prep] Groq also failed: ${groqMessage}`);
              throw new Error(
                `All AI providers failed to read this PDF: ${geminiMessage} | ${groqMessage}`,
              );
            }
          }
        }
      } else if (
        fileType.includes('word') ||
        fileType.includes('officedocument')
      ) {
        this.logger.log('[AI-Prep] Processing Word document...');
        const data = await mammoth.extractRawText({ buffer });
        extractedText = data.value;
      } else {
        this.logger.log('[AI-Prep] Processing as plain text.');
        extractedText = buffer.toString('utf-8');
      }
      const cleanText = this.sanitizeExtractedText(extractedText);
      if (!cleanText || cleanText.length < 10) {
        throw new Error(
          `Extraction resulted in empty text. Ensure the PDF is not just a scanned image.`,
        );
      }
      if (
        requireMeaningfulText &&
        !this.isMeaningfulEducationalText(cleanText)
      ) {
        throw new Error(
          'Extraction did not produce meaningful educational text for this document.',
        );
      }
      this.logger.log(
        `[AI-Prep] Extraction successful: ${cleanText.length} characters.`,
      );
      return cleanText;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[AI-Prep] Final Extraction Failure: ${message}`);
      throw new common_1.InternalServerErrorException(
        `Document Processing Error: ${message}`,
      );
    }
  }
  splitTextIntoChunks(text, chunkSize = 1000, chunkOverlap = 200) {
    const chunks = [];
    if (!text) {
      return [];
    }
    let currentIndex = 0;
    while (currentIndex < text.length) {
      const end = Math.min(currentIndex + chunkSize, text.length);
      const chunk = text.slice(currentIndex, end);
      if (this.isUsableStudyChunk(chunk)) {
        chunks.push(chunk);
      }
      currentIndex += chunkSize - chunkOverlap;
      if (chunkSize <= chunkOverlap) {
        break;
      }
    }
    this.logger.log(
      `[AI-Prep] Content split into ${chunks.length} usable chunks.`,
    );
    return chunks;
  }
  async extractPdfWithGroq(pdfBuffer) {
    return this.aiService.extractPdfWithGroq(pdfBuffer);
  }
});
ProcessingService = ProcessingService_1 = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [ai_service_1.AiService]),
  ],
  ProcessingService,
);
exports.ProcessingService = ProcessingService;
//# sourceMappingURL=processing.service.js.map

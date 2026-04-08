declare module 'pdf-parse-fork' {
  interface PdfParseResult {
    text: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    version?: string;
  }

  function pdfParse(buffer: Buffer): Promise<PdfParseResult>;

  export = pdfParse;
}

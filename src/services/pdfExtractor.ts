import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to match the installed pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedPdfResult {
  text: string;
  wordCount: number;
  pageCount: number;
}

export class PdfExtractionError extends Error {
  constructor(message: string, public code: 'INVALID_FILE' | 'EMPTY_FILE' | 'NO_TEXT' | 'TOO_SHORT' | 'CORRUPT_PDF') {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

/**
 * Extracts raw textual content from an uploaded PDF File and validates completeness.
 */
export async function extractTextFromPdf(file: File): Promise<ExtractedPdfResult> {
  if (!file) {
    throw new PdfExtractionError('No file provided.', 'INVALID_FILE');
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfExtractionError('Please upload a PDF document (.pdf).', 'INVALID_FILE');
  }

  if (file.size === 0) {
    throw new PdfExtractionError('The uploaded PDF file is empty (0 bytes).', 'EMPTY_FILE');
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    throw new PdfExtractionError('Unable to read the PDF file data.', 'CORRUPT_PDF');
  }

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: true,
    });
    pdf = await loadingTask.promise;
  } catch (err: any) {
    throw new PdfExtractionError(
      'Could not parse the document as a valid PDF. The file may be damaged or password-protected.',
      'CORRUPT_PDF'
    );
  }

  const pageCount = pdf.numPages;
  if (pageCount === 0) {
    throw new PdfExtractionError('The PDF has 0 pages.', 'EMPTY_FILE');
  }

  let fullText = '';
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');

      fullText += pageText + '\n';
    } catch (err) {
      console.warn(`Failed to extract text from PDF page ${pageNum}:`, err);
    }
  }

  const cleanedText = fullText.replace(/\s+/g, ' ').trim();

  // Validate non-empty extractable text
  if (cleanedText.length === 0) {
    throw new PdfExtractionError(
      'The PDF resume does not contain extractable text. If this is a scanned document or photo, please upload a text-based PDF.',
      'NO_TEXT'
    );
  }

  // Validate word count >= 50 words
  const words = cleanedText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 50) {
    throw new PdfExtractionError(
      `The extracted resume text is too brief (${wordCount} words). Please upload a complete, detailed resume.`,
      'TOO_SHORT'
    );
  }

  return {
    text: fullText.trim(),
    wordCount,
    pageCount,
  };
}

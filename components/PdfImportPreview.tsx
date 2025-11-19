'use client';

import React, { useState, useRef } from 'react';
interface PdfRow {
  [index: string]: string;
}

interface PdfPageData {
  pageNumber: number;
  content: PdfRow[];
}
interface PdfImportPreviewProps {
  onPdfProcessed: (data: PdfPageData[]) => void;
}

interface PdfInternalData {
  numPages: number;
  pageTexts: string[]; // Raw extracted text from PDF pages
  processedData?: PdfPageData[]; // Processed data in the requested format
}

const PdfImportPreview: React.FC<PdfImportPreviewProps> = ({ onPdfProcessed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<PdfInternalData | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setFile(null);
    setPdfData(null);
    setCurrentPage(1);
    setIsLoading(false);
    setError(null);
    onPdfProcessed([]);
  };

  const hasMyanmarText = (texts: string[]): boolean => {
    const myanmarRegex = /[\u1000-\u109F\uA9E0-\uA9FF\uAA60-\uAA7F]/;
    return texts.some((text) => myanmarRegex.test(text));
  };

  const extractTextWithPdfJs = async (pdf: any): Promise<string[]> => {
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      let text = '';

      // join items in order
      for (const item of textContent.items) {
        if (typeof (item as any).str === 'string') {
          text += (item as any).str;
        }
      }

      // Keep structure simple; do not over-normalize
      // Optional: trim trailing spaces
      text = text.replace(/\s+$/g, '');

      // Try to normalize Unicode composition (helps Myanmar)
      try {
        text = text.normalize('NFC');
      } catch {
        // ignore if environment doesn't support normalize
      }

      pageTexts.push(text);
    }

    return pageTexts;
  };

  const runMyanmarOcrOnPdf = async (
    pdf: any,
    updateStatus: (msg: string) => void
  ): Promise<string[]> => {
    const Tesseract = await import('tesseract.js');
    const { createWorker } = Tesseract;

    const langPaths = [
      'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/lang-data/',
      'https://tessdata.projectnaptha.com/4.0.0/',
      'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/',
    ];

    let worker: any = null;
    let lastError: any = null;

    for (const path of langPaths) {
      try {
        worker = await createWorker('mya', 1, {
          langPath: path,
          logger: (m: any) => console.log('OCR Progress:', m),
        });
        break;
      } catch (err) {
        console.warn(`Failed to load language data from ${path}:`, err);
        lastError = err;
      }
    }

    if (!worker) {
      throw new Error(
        `Failed to load Myanmar language data for OCR. Last error: ${lastError?.message}`
      );
    }

    const pageTexts: string[] = [];

    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        updateStatus(`Processing page ${i} of ${pdf.numPages} with OCR…`);

        const page = await pdf.getPage(i);
        const scale = 2; // decent quality vs speed
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          canvas.remove();
          pageTexts.push('');
          continue;
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        try {
          const imageData = canvas.toDataURL('image/png');
          const result = await worker.recognize(imageData, {
            tessjs_create_pdf: '0',
          });
          let text = result.data.text || '';
          try {
            text = text.normalize('NFC');
          } catch {
            // ignore
          }
          pageTexts.push(text);
        } catch (ocrErr) {
          console.error(`OCR failed on page ${i}:`, ocrErr);
          pageTexts.push('');
        } finally {
          canvas.remove();
        }
      }
    } finally {
      try {
        await worker.terminate();
      } catch (e) {
        console.warn('Error terminating OCR worker:', e);
      }
    }

    return pageTexts;
  };

  const processPdfFile = async (selectedFile: File) => {
    setIsLoading(true);
    setError(null);

    let workerBlobUrl: string | null = null;

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const workerModule = await import('pdfjs-dist/build/pdf.worker.mjs');

      workerBlobUrl = URL.createObjectURL(
        new Blob([workerModule.default], { type: 'application/javascript' })
      );
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = workerBlobUrl;

      const typedArray = await selectedFile.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({
        data: typedArray,
        enableXfa: true,
        disableFontFace: false,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true,
        isEvalSupported: false,
      }).promise;

      // 1) Try normal text extraction
      let pageTexts = await extractTextWithPdfJs(pdf);

      const anyNonEmpty = pageTexts.some((t) => t.trim() !== '');
      const hasMyanmarChars = hasMyanmarText(pageTexts);

      if (!anyNonEmpty || !hasMyanmarChars) {
        console.log('Standard extraction failed to find Myanmar text – using OCR');
        setError('Standard text extraction failed. Running OCR for Myanmar text (may be slower)…');

        pageTexts = await runMyanmarOcrOnPdf(pdf, (msg) => setError(msg));
      }

      // Convert each page's text into a row-based format
      const dataset: PdfPageData[] = pageTexts.map((content, index) => {
        // Split content by newlines to create rows
        const rows = content.split('\n').filter(row => row.trim() !== '');

        // Convert each row into an indexed object format
        const rowArray: PdfRow[] = rows.map((row, rowIndex) => ({
          [rowIndex.toString()]: row.trim()
        }));

        return {
          pageNumber: index + 1,
          content: rowArray,
        };
      });

      setPdfData({
        numPages: pdf.numPages,
        pageTexts,
        processedData: dataset,
      });

      onPdfProcessed(dataset);
    } catch (err: any) {
      console.error('Error processing PDF:', err);
      setError(
        'Failed to process PDF. The file may be corrupted, image-only, or use unsupported fonts/encoding for Myanmar text.'
      );
    } finally {
      setIsLoading(false);
      if (workerBlobUrl) {
        try {
          URL.revokeObjectURL(workerBlobUrl);
        } catch (e) {
          console.warn('Could not revoke worker URL:', e);
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('File size exceeds 20MB limit. Please select a smaller file.');
      return;
    }

    setFile(selectedFile);
    await processPdfFile(selectedFile);
  };

  const goToPage = (page: number) => {
    if (!pdfData) return;
    if (page < 1 || page > pdfData.numPages) return;
    setCurrentPage(page);
  };

  const handleExportFromComponent = () => {
    if (!pdfData || !pdfData.processedData || !pdfData.processedData.length) {
      setError('No data to export. Please process a PDF file first.');
      return;
    }

    const blob = new Blob([JSON.stringify(pdfData.processedData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file
      ? `${file.name.replace(/\.pdf$/i, '')}-dataset.json`
      : 'extracted-pdf-content.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">PDF Import & Preview</h2>

      <div className="mb-6">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          id="pdf-upload"
        />
        <label
          htmlFor="pdf-upload"
          className={`flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${error ? 'border-red-500' : 'border-gray-300 hover:border-blue-500'}
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-4 text-gray-500"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 20 16"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF file (MAX. 20MB)</p>
            {file && (
              <p className="mt-3 text-xs text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> (
                {(file.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}
          </div>
        </label>

        {error && (
          <p className="mt-2 text-sm text-red-600 whitespace-pre-line">{error}</p>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {pdfData && !isLoading && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-gray-700">
              Page {currentPage} of {pdfData.numPages}
            </h3>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`px-4 py-2 rounded-md text-sm ${
                  currentPage <= 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Previous
              </button>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pdfData.numPages}
                className={`px-4 py-2 rounded-md text-sm ${
                  currentPage >= pdfData.numPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Next
              </button>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Go to:</span>
                <input
                  type="number"
                  min={1}
                  max={pdfData.numPages}
                  value={currentPage}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) goToPage(v);
                  }}
                  className="w-20 border rounded px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50 max-h-[500px] overflow-y-auto">
            <pre className="text-gray-800 text-sm whitespace-pre-wrap">
              {(() => {
                // Convert the page text to row format for display
                const pageContent = pdfData.pageTexts[currentPage - 1];
                const rows = pageContent.split('\n').filter(row => row.trim() !== '');
                return rows.join('\n');
              })()}
            </pre>
          </div>

          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Pages: <span className="font-semibold">{pdfData.numPages}</span>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportFromComponent}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center text-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
                Export JSON
              </button>

              <button
                onClick={resetState}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfImportPreview;

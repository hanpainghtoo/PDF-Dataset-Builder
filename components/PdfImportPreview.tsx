'use client';

import React, { useState, useRef } from 'react';

interface PdfPageData {
  pageNumber: number;
  content: string;
}

interface PdfImportPreviewProps {
  onPdfProcessed: (data: PdfPageData[]) => void;
}

const PdfImportPreview: React.FC<PdfImportPreviewProps> = ({ onPdfProcessed }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pdfData, setPdfData] = useState<{ numPages: number; pageTexts: string[] } | null>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    resetState();
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    // Check if the file is a PDF
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size exceeds 10MB limit. Please select a smaller file.');
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);
    setError(null);

    try {
      const pdfjsLib = await import('pdfjs-dist');
      const { getDocument } = pdfjsLib;
      const worker = await import('pdfjs-dist/build/pdf.worker.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
        new Blob([worker.default], { type: 'application/javascript' })
      );

      const typedArray = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(typedArray).promise;

      const pageTexts: string[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        pageTexts.push(text);
      }

      setPdfData({
        numPages: pdf.numPages,
        pageTexts
      });

      // Output the dataset: { pageNumber, content }
      const dataset: PdfPageData[] = pageTexts.map((content, index) => ({
        pageNumber: index + 1,
        content
      }));
      
      onPdfProcessed(dataset);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Failed to process PDF. The file may be corrupted or invalid.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToPage = (page: number) => {
    if (pdfData && page >= 1 && page <= pdfData.numPages) {
      setCurrentPage(page);
    }
  };

  const handleExport = () => {
    if (!pdfData || !pdfData.pageTexts || pdfData.pageTexts.length === 0) {
      setError('No data to export. Please process a PDF file first.');
      return;
    }

    // Create the dataset to export
    const dataset: PdfPageData[] = pdfData.pageTexts.map((content, index) => ({
      pageNumber: index + 1,
      content
    }));

    // Convert to JSON string
    const jsonString = JSON.stringify(dataset, null, 2);

    // Create a blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extracted-pdf-content.json`;
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">PDF Import Preview</h2>

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
            <p className="text-xs text-gray-500">
              PDF file (MAX. 10MB)
            </p>
          </div>
        </label>

        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center my-8">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {pdfData && !isLoading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-700">
              Page {currentPage} of {pdfData.numPages}
            </h3>

            <div className="flex space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className={`px-4 py-2 rounded-md ${
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
                className={`px-4 py-2 rounded-md ${
                  currentPage >= pdfData.numPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Next
              </button>
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50 max-h-[500px] overflow-y-auto">
            <div className="text-gray-700 whitespace-pre-wrap">
              {pdfData.pageTexts[currentPage - 1]}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Pages: {pdfData.numPages}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Export JSON
              </button>

              <button
                onClick={resetState}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
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
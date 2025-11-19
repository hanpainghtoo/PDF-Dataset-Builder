'use client';

import React, { useState } from 'react';
import PdfImportPreview from '../../components/PdfImportPreview';
 interface PdfPageData {
  pageNumber: number;
  content: string;
}

const PdfImportPage: React.FC = () => {
  const [pdfData, setPdfData] = useState<PdfPageData[]>([]);
  const [status, setStatus] = useState<'idle' | 'processed'>('idle');

  const handlePdfProcessed = (data: PdfPageData[]) => {
    setPdfData(data);
    setStatus(data.length > 0 ? 'processed' : 'idle');
  };

  const handleExportFromParent = () => {
    if (!pdfData.length) return;

    const blob = new Blob([JSON.stringify(pdfData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'myanmar-book-dataset.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Myanmar Book PDF → Dataset
          </h1>
          <p className="text-lg text-gray-600">
            Upload a Myanmar book PDF to extract text page-by-page and export as JSON dataset.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <PdfImportPreview onPdfProcessed={handlePdfProcessed} />
        </div>

        {status === 'processed' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Extracted Content Summary
              </h2>
              <button
                onClick={handleExportFromParent}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                Export Dataset JSON
              </button>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {pdfData.map((page) => (
                <div
                  key={page.pageNumber}
                  className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded"
                >
                  <h3 className="font-semibold text-gray-700">
                    Page {page.pageNumber}
                  </h3>
                  <p className="text-gray-600 mt-1 line-clamp-2">
                    {page.content.substring(0, 200)}
                    {page.content.length > 200 ? '…' : ''}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-500">
              Total pages in dataset: <span className="font-semibold">{pdfData.length}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfImportPage;

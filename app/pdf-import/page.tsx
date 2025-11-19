'use client';

import React, { useState } from 'react';
import PdfImportPreview from '@/components/PdfImportPreview';

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

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Import Preview</h1>
          <p className="text-lg text-gray-600">
            Upload a PDF file to preview its content and extract text
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <PdfImportPreview onPdfProcessed={handlePdfProcessed} />
        </div>

        {status === 'processed' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Extracted Content Summary</h2>
            <div className="space-y-4">
              {pdfData.map((page) => (
                <div key={page.pageNumber} className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded">
                  <h3 className="font-semibold text-gray-700">Page {page.pageNumber}</h3>
                  <p className="text-gray-600 mt-1 truncate">{page.content.substring(0, 150)}{page.content.length > 150 ? '...' : ''}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PdfImportPage;
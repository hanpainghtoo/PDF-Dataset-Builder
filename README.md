# PDF-Dataset-Builder

## PDF Import Preview Component

This project provides a Next.js-based PDF import preview component that allows users to upload PDF files, preview their content, extract text from each page, and handle errors appropriately.

## Features

- PDF file upload with validation
- Page-by-page preview of PDF content
- Text extraction from each page
- Error handling for invalid/corrupted PDFs
- Responsive UI with Tailwind CSS
- Output dataset with page numbers and extracted content
- Export extracted content as JSON file

## Installation

To run this project, first install the required dependencies:

```bash
npm install
```

The project requires the following dependencies:

- `next` - Next.js framework
- `react` and `react-dom` - React libraries
- `pdfjs-dist` - PDF processing library
- `tailwindcss`, `postcss`, `autoprefixer` - Styling libraries

## Usage

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/pdf-import` in your browser.

3. Click the upload area or drag and drop a PDF file to begin.

4. The component will process the PDF, extract text from each page, and display a preview.

5. Use the navigation buttons to move between pages.

6. The extracted content will be displayed in the summary section below.

## Component API

The `PdfImportPreview` component accepts the following props:

- `onPdfProcessed`: A callback function that receives an array of objects in the format `{ pageNumber: number, content: { [index: string]: string }[] }` when the PDF has been processed successfully.

## Export Functionality

The component includes an "Export JSON" button that allows users to download the extracted content as a JSON file. When clicked, the button creates a downloadable file containing an array of objects with the format:
```
[
  {
    "pageNumber": 1,
    "content": [ {"0": "first row of text"}, {"1": "second row of text"}, {"2": "third row of text"} ]
  },
  {
    "pageNumber": 2,
    "content": [ {"0": "first row of text"}, {"1": "second row of text"}, {"2": "third row of text"} ]
  },
  ...
]
```

## Features

- PDF file upload with validation
- Page-by-page preview of PDF content
- Text extraction from each page, split into rows
- Error handling for invalid/corrupted PDFs
- Responsive UI with Tailwind CSS
- Output dataset with page numbers and extracted content as row-based arrays
- Export extracted content as JSON file

## File Structure

- `/components/PdfImportPreview.tsx` - The main PDF import component
- `/app/pdf-import/page.tsx` - The Next.js page using the component
- `/app/layout.tsx` - Root layout file
- `/app/globals.css` - Global styles with Tailwind directives
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration

## Dependencies

This project uses:

- `pdfjs-dist` for PDF processing and text extraction
- `tailwindcss` for styling
- Next.js 14 with the App Router
import React, { useEffect, useState, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';

// Import worker from the package directly for better reliability in Vite
// @ts-ignore - Vite handles the ?url suffix
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PDFPreviewProps {
  file: File;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ file }) => {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isMounted = true;

    const generateThumbnail = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ 
          data: arrayBuffer,
          useWorkerFetch: false,
          isEvalSupported: false,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Fill background with white
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: context as any,
          viewport: viewport,
          // @ts-ignore - some versions of pdfjs require the canvas element
          canvas: canvas,
        }).promise;

        if (isMounted) {
          setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
        }

        // Cleanup
        await pdf.destroy();
      } catch (err) {
        console.error('Error generating thumbnail for ' + file.name + ':', err);
        if (isMounted) setError(true);
      }
    };

    generateThumbnail();

    return () => {
      isMounted = false;
    };
  }, [file]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs">
        Preview Error
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-zinc-50 flex items-center justify-center border border-zinc-200 rounded-md">
      <canvas ref={canvasRef} className="hidden" />
      {thumbnail ? (
        <img src={thumbnail} alt="PDF Preview" className="max-w-full max-h-full object-contain shadow-sm" />
      ) : (
        <div className="animate-pulse bg-zinc-200 w-full h-full" />
      )}
    </div>
  );
};

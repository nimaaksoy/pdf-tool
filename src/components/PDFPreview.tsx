import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    let isMounted = true;
    let isCancelled = false;
    let activeLoadingTask: any = null;
    let activePdf: any = null;
    let activeRenderTask: any = null;
    let activePage: any = null;

    const generateThumbnail = async () => {
      try {
        setError(false);
        setThumbnail(null);

        const data = new Uint8Array(await file.arrayBuffer());
        const loadPdf = async (disableWorker: boolean) => {
          activeLoadingTask = pdfjs.getDocument({
            data,
            useWorkerFetch: false,
            isEvalSupported: false,
            disableWorker,
            stopAtErrors: false,
          } as any);
          const pdf = await activeLoadingTask.promise;
          activeLoadingTask = null;
          return pdf;
        };

        try {
          activePdf = await loadPdf(false);
        } catch (workerError) {
          // In some in-app browsers, worker loading fails under nested base paths.
          // Retry without a worker so previews still render.
          activePdf = await loadPdf(true);
          console.warn('PDF preview worker failed, falling back to workerless mode:', workerError);
        }

        if (isCancelled || !activePdf) return;

        activePage = await activePdf.getPage(1);
        const viewport = activePage.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Fill background with white
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        activeRenderTask = activePage.render({
          canvasContext: context as any,
          viewport: viewport,
        });
        await activeRenderTask.promise;
        activeRenderTask = null;

        if (isMounted && !isCancelled) {
          setThumbnail(canvas.toDataURL('image/jpeg', 0.8));
        }

        // Cleanup
        activePage.cleanup();
        activePage = null;
        await activePdf.destroy();
        activePdf = null;
      } catch (err) {
        if ((err as any)?.name === 'RenderingCancelledException' || isCancelled) {
          return;
        }
        console.error('Error generating thumbnail for ' + file.name + ':', err);
        if (isMounted) setError(true);
      }
    };

    generateThumbnail();

    return () => {
      isMounted = false;
      isCancelled = true;
      try {
        activeRenderTask?.cancel?.();
      } catch {}
      try {
        activeLoadingTask?.destroy?.();
      } catch {}
      try {
        activePage?.cleanup?.();
      } catch {}
      try {
        activePdf?.destroy?.();
      } catch {}
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
      {thumbnail ? (
        <img src={thumbnail} alt="PDF Preview" className="max-w-full max-h-full object-contain shadow-sm" />
      ) : (
        <div className="animate-pulse bg-zinc-200 w-full h-full" />
      )}
    </div>
  );
};

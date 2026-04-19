import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Upload, 
  FileText, 
  GripVertical, 
  X, 
  Download, 
  RefreshCw,
  Plus,
  Trash2,
  ArrowLeft,
  Settings,
  Image as ImageIcon,
  Lock,
  Scissors,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';
import { mergePDFs } from './utils/pdf';
import { PDFPreview } from './components/PDFPreview';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PDFFile {
  id: string;
  file: File;
}

interface SortableItemProps {
  id: string;
  pdfFile: PDFFile;
  onRemove: (id: string) => void;
  key?: React.Key;
}

const SortablePDFItem = ({ id, pdfFile, onRemove }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-4 p-3 bg-white border border-zinc-200 rounded-xl transition-all",
        isDragging ? "shadow-xl border-zinc-300 scale-[1.02]" : "hover:border-zinc-300 hover:shadow-sm"
      )}
    >
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        <GripVertical size={20} />
      </div>

      <div className="w-16 h-20 flex-shrink-0">
        <PDFPreview file={pdfFile.file} />
      </div>

      <div className="flex-grow min-w-0">
        <p className="text-sm font-medium text-zinc-900 truncate">
          {pdfFile.file.name}
        </p>
        <p className="text-xs text-zinc-500">
          {(pdfFile.file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      <button
        onClick={() => onRemove(id)}
        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

type View = 'home' | 'merge';

const SEO_CONFIG: Record<View, { title: string; description: string; path: string }> = {
  home: {
    title: 'PDF Tools | Fast, Private PDF Utilities',
    description:
      'Fast, private PDF tools in your browser. Merge PDF files instantly with drag-and-drop sorting and previews.',
    path: '/',
  },
  merge: {
    title: 'PDF Merge | Combine PDF Files Online Free',
    description:
      'Open PDF Merge on /pdf-merge to combine multiple PDF files in seconds with drag-and-drop reordering and previews.',
    path: '/pdf-merge',
  },
};

function getViewFromPath(pathname: string): View {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === '/pdf-merge' ? 'merge' : 'home';
}

function setMetaTag(selector: string, content: string) {
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute('content', content);
  }
}

export default function App() {
  const [view, setView] = useState<View>(() => getViewFromPath(window.location.pathname));
  const [pdfFiles, setPdfFiles] = useState<PDFFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file
      }));
      setPdfFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setPdfFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPdfFiles((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleMerge = async () => {
    if (pdfFiles.length === 0) return;
    
    setIsMerging(true);
    try {
      const buffers = await Promise.all(pdfFiles.map(f => f.file.arrayBuffer()));
      const mergedPdfBytes = await mergePDFs(buffers);
      
      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'combined.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Merge failed:', error);
      alert('Failed to merge PDFs. Please try again.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleRefresh = () => {
    setPdfFiles([]);
  };

  const navigateToView = useCallback((nextView: View) => {
    const nextPath = SEO_CONFIG[nextView].path;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setView(nextView);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setView(getViewFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  useEffect(() => {
    const seo = SEO_CONFIG[view];
    const absoluteUrl = `https://pdf.nimaaksoy.com${seo.path}`;

    document.title = seo.title;
    setMetaTag('meta[name="description"]', seo.description);
    setMetaTag('meta[property="og:title"]', seo.title);
    setMetaTag('meta[property="og:description"]', seo.description);
    setMetaTag('meta[property="og:url"]', absoluteUrl);
    setMetaTag('meta[name="twitter:title"]', seo.title);
    setMetaTag('meta[name="twitter:description"]', seo.description);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', absoluteUrl);
    }
  }, [view]);

  return (
    <div className="min-h-screen bg-[#f8f8f7] text-zinc-900 font-sans selection:bg-zinc-200 flex flex-col">
      <div className="max-w-4xl mx-auto w-full px-6 py-12 md:py-20 flex-grow">
        
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* Home Header */}
              <header className="text-center space-y-4">
                <h1 className="text-5xl font-light tracking-tight text-zinc-900">
                  PDF <span className="font-semibold">Tools</span>
                </h1>
                <p className="text-zinc-500 text-lg max-w-lg mx-auto leading-relaxed">
                  Simple, fast, and secure tools to handle your documents natively in your browser.
                </p>
              </header>

              {/* Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* PDF Merge Tool */}
                <button 
                  onClick={() => navigateToView('merge')}
                  className="group relative p-8 bg-white border border-zinc-200 rounded-3xl text-left transition-all hover:border-zinc-400 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="w-12 h-12 bg-zinc-900 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <LayoutGrid size={24} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">PDF Merge</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    Combine multiple PDF documents into one single file with easy reordering.
                  </p>
                  <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-900 transition-colors">
                    Open Tool <Plus size={14} />
                  </div>
                </button>

                {/* Coming Soon Tools */}
                {[
                  { title: 'PDF to Image', desc: 'Convert PDF pages into high-quality JPEG or PNG images.', icon: <ImageIcon size={24} /> },
                  { title: 'Split PDF', desc: 'Extract pages from your PDF or split one file into many.', icon: <Scissors size={24} /> },
                  { title: 'Protect PDF', desc: 'Add password protection and permissions to your documents.', icon: <Lock size={24} /> }
                ].map((tool, i) => (
                  <div 
                    key={i}
                    className="group p-8 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-3xl text-left opacity-70"
                  >
                    <div className="w-12 h-12 bg-zinc-200 text-zinc-400 rounded-2xl flex items-center justify-center mb-6">
                      {tool.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-400 mb-2">{tool.title}</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {tool.desc}
                    </p>
                    <div className="mt-8 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                      Coming Soon
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="merge"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Merge Header */}
              <header className="flex items-end justify-between border-b border-zinc-200 pb-8">
                <div className="space-y-4">
                  <button 
                    onClick={() => navigateToView('home')}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors mb-4"
                  >
                    <ArrowLeft size={14} /> Back to Tools
                  </button>
                  <div>
                    <h2 className="text-4xl font-light tracking-tight text-zinc-900">
                      PDF <span className="font-semibold">Merge</span>
                    </h2>
                    <p className="text-zinc-500 text-sm mt-1">
                      Combine and reorder your PDF documents instantly.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-white rounded-full transition-all border border-transparent hover:border-zinc-200"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </header>

              <main className="space-y-8 pt-4">
                {/* Upload Area */}
                <div className="relative group">
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-zinc-200 group-hover:border-zinc-400 bg-white rounded-3xl p-12 transition-all flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Plus className="text-zinc-400 group-hover:text-zinc-600" size={32} />
                    </div>
                    <p className="text-lg font-medium text-zinc-900 mb-1">
                      Click or drag PDFs here
                    </p>
                    <p className="text-sm text-zinc-500">
                      Support for multiple files at once
                    </p>
                  </div>
                </div>

                {/* PDF List */}
                {pdfFiles.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                        Files to Merge ({pdfFiles.length})
                      </h2>
                      <span className="text-xs text-zinc-400">Drag to reorder</span>
                    </div>

                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={pdfFiles.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {pdfFiles.map((pdfFile) => (
                            <SortablePDFItem
                              key={pdfFile.id}
                              id={pdfFile.id}
                              pdfFile={pdfFile}
                              onRemove={removeFile}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {/* Action Button */}
                    <div className="pt-6">
                      <button
                        onClick={handleMerge}
                        disabled={isMerging || pdfFiles.length === 0}
                        className={cn(
                          "w-full py-4 rounded-3xl flex items-center justify-center gap-3 text-lg font-medium transition-all shadow-lg",
                          isMerging 
                            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" 
                            : "bg-zinc-900 text-white hover:bg-black hover:shadow-xl active:scale-[0.98]"
                        )}
                      >
                        {isMerging ? (
                          <>
                            <RefreshCw className="animate-spin" size={24} />
                            Merging Documents...
                          </>
                        ) : (
                          <>
                            <Download size={24} />
                            Merge & Download
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty State Hint */}
                {pdfFiles.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-zinc-200 mb-4" size={48} />
                    <p className="text-zinc-400 text-sm">No files selected yet.</p>
                  </div>
                )}
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-6 py-12 border-t border-zinc-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left space-y-2">
            <p className="text-sm font-medium text-zinc-900 flex items-center gap-2 justify-center md:justify-start">
              <span>Sponsor:</span>
              <a 
                href="https://Bowora.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-black transition-colors underline underline-offset-4 decoration-zinc-300"
              >
                Bowora.com
              </a>
            </p>
            <p className="text-xs text-zinc-400 italic">
              All processing happens in your browser. Your files are never uploaded to a server.
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <span className="hidden md:inline text-zinc-200">/</span>
            <span className="text-zinc-500">Fast</span>
            <span className="text-zinc-200">•</span>
            <span className="text-zinc-500">Secure</span>
            <span className="text-zinc-200">•</span>
            <span className="text-zinc-500">Private</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

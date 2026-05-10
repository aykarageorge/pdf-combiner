import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { FileItem, Page } from '@/types';
import { processFile, combineToPdf } from '@/lib/pdf-processor';
import UploadZone from '@/components/UploadZone';
import PageSection, { ItemOverlay } from '@/components/PageSection';
import CombineButton from '@/components/CombineButton';

function createEmptyPage(): Page {
  return { id: 'page-' + crypto.randomUUID(), items: [] };
}

function findPageContainingItem(pages: Page[], itemId: string): Page | undefined {
  return pages.find((p) => p.items.some((i) => i.id === itemId));
}

export default function App() {
  const [pages, setPages] = useState<Page[]>([createEmptyPage()]);
  const [activeItem, setActiveItem] = useState<FileItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const totalItems = useMemo(
    () => pages.reduce((sum, p) => sum + p.items.length, 0),
    [pages]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleFilesSelected = useCallback(async (files: File[]) => {
    setIsUploading(true);
    try {
      const results: FileItem[] = [];
      for (const file of files) {
        try {
          const fileItems = await processFile(file);
          results.push(...fileItems);
        } catch (err) {
          alert(
            `Error processing "${file.name}": ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      }
      if (results.length > 0) {
        setPages((prev) => {
          const updated = [...prev];
          const lastPage = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...lastPage,
            items: [...lastPage.items, ...results],
          };
          return updated;
        });
      }
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRemoveItem = useCallback((itemId: string) => {
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        items: page.items.filter((i) => i.id !== itemId),
      }))
    );
  }, []);

  const handleClearAll = useCallback(() => {
    setPages([createEmptyPage()]);
  }, []);

  const handleAddPage = useCallback(() => {
    setPages((prev) => [...prev, createEmptyPage()]);
  }, []);

  const handleDeletePage = useCallback((pageId: string) => {
    setPages((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((p) => p.id === pageId);
      if (idx === -1) return prev;

      const deletedPage = prev[idx];
      const mergeTargetIdx = idx === 0 ? 1 : idx - 1;

      return prev
        .map((page, i) => {
          if (i === mergeTargetIdx) {
            // When deleting first page, prepend its items (they were visually first)
            const mergedItems =
              idx === 0
                ? [...deletedPage.items, ...page.items]
                : [...page.items, ...deletedPage.items];
            return { ...page, items: mergedItems };
          }
          return page;
        })
        .filter((p) => p.id !== pageId);
    });
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const sourcePage = findPageContainingItem(pages, String(active.id));
      if (sourcePage) {
        const item = sourcePage.items.find((i) => i.id === active.id);
        setActiveItem(item ?? null);
      }
    },
    [pages]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setPages((prev) => {
      const activeContainer = prev.find((p) =>
        p.items.some((i) => i.id === activeId)
      );
      if (!activeContainer) return prev;

      // Determine the target container
      let overContainer: Page | undefined;
      if (overId.startsWith('page-')) {
        overContainer = prev.find((p) => p.id === overId);
      } else {
        overContainer = prev.find((p) =>
          p.items.some((i) => i.id === overId)
        );
      }
      if (!overContainer) return prev;

      // Same container -- no cross-container move needed
      if (activeContainer.id === overContainer.id) return prev;

      // Cross-container move
      const activeItemData = activeContainer.items.find(
        (i) => i.id === activeId
      );
      if (!activeItemData) return prev;

      // Determine insertion index in target
      let insertIndex: number;
      if (overId.startsWith('page-')) {
        // Dropped on page container itself (empty area)
        insertIndex = overContainer.items.length;
      } else {
        insertIndex = overContainer.items.findIndex((i) => i.id === overId);
        if (insertIndex === -1) insertIndex = overContainer.items.length;
      }

      return prev.map((page) => {
        if (page.id === activeContainer.id) {
          return {
            ...page,
            items: page.items.filter((i) => i.id !== activeId),
          };
        }
        if (page.id === overContainer.id) {
          const newItems = [...page.items];
          newItems.splice(insertIndex, 0, activeItemData);
          return { ...page, items: newItems };
        }
        return page;
      });
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    setPages((prev) => {
      const container = prev.find((p) =>
        p.items.some((i) => i.id === activeId)
      );
      if (!container) return prev;

      // Only reorder within same container
      const overInSame = container.items.some((i) => i.id === overId);
      if (!overInSame) return prev;

      const oldIndex = container.items.findIndex((i) => i.id === activeId);
      const newIndex = container.items.findIndex((i) => i.id === overId);
      if (oldIndex === newIndex) return prev;

      return prev.map((page) => {
        if (page.id === container.id) {
          return {
            ...page,
            items: arrayMove(page.items, oldIndex, newIndex),
          };
        }
        return page;
      });
    });
  }, []);

  const handleCombine = useCallback(async () => {
    if (totalItems === 0) return;
    setIsProcessing(true);
    try {
      const pdfBytes = await combineToPdf(pages);
      const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'combined.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(
        `Error combining files: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      setIsProcessing(false);
    }
  }, [pages, totalItems]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">PDF Combiner</h1>
          <p className="text-slate-400 mt-1">
            Upload images and multi-page PDFs — each page becomes a separate item you can rearrange, group across pages, and combine into one PDF.
          </p>
        </header>

        <UploadZone
          onFilesSelected={handleFilesSelected}
          disabled={isUploading || isProcessing}
        />

        {totalItems > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-slate-200">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </h2>
              <button
                onClick={handleClearAll}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="flex flex-col gap-6">
                {pages.map((page, i) => (
                  <PageSection
                    key={page.id}
                    page={page}
                    pageIndex={i}
                    totalPages={pages.length}
                    onRemoveItem={handleRemoveItem}
                    onDeletePage={handleDeletePage}
                  />
                ))}
              </div>

              <button
                onClick={handleAddPage}
                className="mt-4 w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-sm text-slate-400 hover:border-slate-500 hover:text-slate-300 transition-colors"
              >
                + Add Page
              </button>

              <DragOverlay>
                {activeItem ? <ItemOverlay item={activeItem} /> : null}
              </DragOverlay>
            </DndContext>

            <div className="mt-8 flex justify-center">
              <CombineButton
                disabled={totalItems === 0}
                isProcessing={isProcessing}
                onClick={handleCombine}
              />
            </div>
          </div>
        )}

        {isUploading && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Processing files...
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-12">
        <section className="mt-16 border-t border-slate-800 pt-12">
          <h2 className="text-2xl font-bold text-white mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <article className="bg-slate-800/50 rounded-lg p-6">
              <div className="text-blue-500 text-2xl font-bold mb-3">1</div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload Your Files</h3>
              <p className="text-slate-400">
                Drag and drop your images (JPG, PNG) and PDF files into the
                upload area. Multi-page PDFs are automatically split — each page
                becomes its own item you can work with individually.
              </p>
            </article>
            <article className="bg-slate-800/50 rounded-lg p-6">
              <div className="text-blue-500 text-2xl font-bold mb-3">2</div>
              <h3 className="text-lg font-semibold text-white mb-2">Arrange &amp; Group</h3>
              <p className="text-slate-400">
                Pick individual pages from different PDFs and mix them with images.
                Add output pages and drag items between them to control exactly
                what goes where.
              </p>
            </article>
            <article className="bg-slate-800/50 rounded-lg p-6">
              <div className="text-blue-500 text-2xl font-bold mb-3">3</div>
              <h3 className="text-lg font-semibold text-white mb-2">Download Your PDF</h3>
              <p className="text-slate-400">
                Click the combine button and your merged PDF downloads instantly.
                No waiting, no email required.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-16 border-t border-slate-800 pt-12">
          <h2 className="text-2xl font-bold text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <article className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Is PDF Combiner free to use?</h3>
              <p className="text-slate-400">Yes, PDF Combiner is completely free with no hidden fees, subscriptions, or usage limits.</p>
            </article>
            <article className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Are my files safe and private?</h3>
              <p className="text-slate-400">Absolutely. All processing happens directly in your browser. Your files are never uploaded to any server, ensuring complete privacy.</p>
            </article>
            <article className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">What file types can I combine?</h3>
              <p className="text-slate-400">You can combine JPG, PNG, and PDF files into a single PDF document.</p>
            </article>
            <article className="bg-slate-800/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Is there a limit on the number of files?</h3>
              <p className="text-slate-400">There is no hard limit. You can add as many images and PDF pages as your browser can handle.</p>
            </article>
          </div>
        </section>
      </div>

      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} PDF Combiner by Aykara Tools. Free online PDF merge tool.</p>
        </div>
      </footer>
    </div>
  );
}

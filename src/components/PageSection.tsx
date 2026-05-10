import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import type { FileItem, Page } from '@/types';

interface PageSectionProps {
  page: Page;
  pageIndex: number;
  totalPages: number;
  onRemoveItem: (id: string) => void;
  onDeletePage: (pageId: string) => void;
}

function SortableItem({
  item,
  onRemove,
}: {
  item: FileItem;
  onRemove: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group bg-slate-800 rounded-lg overflow-hidden border border-slate-700
        ${isDragging ? 'shadow-xl shadow-blue-500/20 z-10' : 'hover:border-slate-500'}
      `}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <div className="aspect-[3/4] flex items-center justify-center p-2 bg-slate-800/80">
          <img
            src={item.thumbnail}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded"
            draggable={false}
          />
        </div>
      </div>

      <div className="p-2 border-t border-slate-700">
        <p className="text-xs text-slate-300 truncate" title={item.name}>
          {item.name}
        </p>
        {item.type === 'pdf-page' && item.pageNumber != null && (
          <p className="text-xs text-slate-500">Page {item.pageNumber}</p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(item.id);
        }}
        className="
          absolute top-1 right-1 w-6 h-6 rounded-full
          bg-red-600/80 hover:bg-red-500 text-white text-xs
          flex items-center justify-center
          opacity-0 group-hover:opacity-100 transition-opacity
        "
        aria-label={`Remove ${item.name}`}
      >
        X
      </button>
    </div>
  );
}

export function ItemOverlay({ item }: { item: FileItem }) {
  return (
    <div className="relative bg-slate-800 rounded-lg overflow-hidden border border-blue-500 shadow-xl shadow-blue-500/30 w-44">
      <div className="aspect-[3/4] flex items-center justify-center p-2 bg-slate-800/80">
        <img
          src={item.thumbnail}
          alt={item.name}
          className="max-w-full max-h-full object-contain rounded"
          draggable={false}
        />
      </div>
      <div className="p-2 border-t border-slate-700">
        <p className="text-xs text-slate-300 truncate">{item.name}</p>
      </div>
    </div>
  );
}

export default function PageSection({
  page,
  pageIndex,
  totalPages,
  onRemoveItem,
  onDeletePage,
}: PageSectionProps) {
  const { setNodeRef } = useDroppable({ id: page.id });

  return (
    <div
      ref={setNodeRef}
      className="border border-slate-700 rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3 bg-slate-800/50 -mx-4 -mt-4 px-4 py-2 rounded-t-xl">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-200">
            Page {pageIndex + 1}
          </h3>
          <span className="text-xs text-slate-500">
            ({page.items.length} {page.items.length === 1 ? 'item' : 'items'})
          </span>
        </div>
        <button
          onClick={() => onDeletePage(page.id)}
          disabled={totalPages === 1}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
          aria-label={`Delete page ${pageIndex + 1}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <SortableContext
        items={page.items.map((i) => i.id)}
        strategy={rectSortingStrategy}
      >
        {page.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {page.items.map((item) => (
              <SortableItem key={item.id} item={item} onRemove={onRemoveItem} />
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-700 rounded-lg py-8 flex items-center justify-center">
            <p className="text-sm text-slate-500">Drag items here</p>
          </div>
        )}
      </SortableContext>
    </div>
  );
}

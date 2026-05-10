import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import type { FileItem } from '@/types';

interface FileListProps {
  items: FileItem[];
  onReorder: (items: FileItem[]) => void;
  onRemove: (id: string) => void;
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
      {/* Drag handle area */}
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

      {/* File info */}
      <div className="p-2 border-t border-slate-700">
        <p className="text-xs text-slate-300 truncate" title={item.name}>
          {item.name}
        </p>
        {item.type === 'pdf-page' && item.pageNumber != null && (
          <p className="text-xs text-slate-500">Page {item.pageNumber}</p>
        )}
      </div>

      {/* Remove button */}
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

export default function FileList({ items, onReorder, onRemove }: FileListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <SortableItem key={item.id} item={item} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

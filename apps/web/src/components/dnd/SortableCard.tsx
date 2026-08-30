import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Card = {
  id: string;
  title: string;
  description?: string;
};

export default function SortableCard({ card }: { card: Card }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: 'none',
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`kanban-card${isDragging ? ' kanban-card-dragging' : ''}`}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      <div className="kanban-card-title">
        {card.title}
      </div>

      {card.description && (
        <div className="kanban-card-description">
          {card.description}
        </div>
      )}

      <div className="kanban-card-drag-hint">
        Drag to move
      </div>
    </article>
  );
}
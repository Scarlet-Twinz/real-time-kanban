import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableCard({ card }: { card: any }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    border: '1px solid #eee',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    background: '#fafafa',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-testid={`card-${card.id}`}>
      <strong>{card.title}</strong>
      <div style={{ fontSize: 12, color: '#444' }}>{card.description}</div>
    </div>
  );
}
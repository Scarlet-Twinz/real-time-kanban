import React from 'react';
import dynamic from 'next/dynamic';
import {
  DndContext as BaseDndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableCard from './SortableCard';
import { getAccessToken } from '../../../src/utils/auth';
import { api } from '../../../src/utils/api';

// Cast DndContext to avoid React 18 / TypeScript type mismatch errors
const DndContext = BaseDndContext as unknown as React.FC<any>;

type Props = {
  board: any;
  setBoard: (b: any) => void;
  reloadBoard: () => Promise<void>;
};

export default function DndBoardClient({ board, setBoard, reloadBoard }: Props) {
  const sensors = useSensors(useSensor(PointerSensor));

  function findCardPosition(cardId: string) {
    if (!board) return null;
    for (let ci = 0; ci < (board.columns || []).length; ci++) {
      const c = board.columns[ci];
      const idx = (c.cards || []).findIndex((card: any) => card.id === cardId);
      if (idx >= 0) return { columnId: c.id, index: idx };
    }
    return null;
  }

  async function commitReorder(placements: { id: string; columnId: string; order: number }[]) {
    if (!board) return;
    try {
      const token = getAccessToken();
      await api.post(`/boards/${board.id}/reorder`, { placements }, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
    } catch (err) {
      console.error('reorder failed', err);
      await reloadBoard();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!active || !over || !board) return;
    const activeId = active.id as string;
    const overId = over.id as string;

    let destColumnId: string | null = null;
    if (overId.startsWith('col-')) {
      destColumnId = overId.replace('col-', '');
    } else {
      const pos = findCardPosition(overId);
      if (pos) destColumnId = pos.columnId;
    }
    const srcPos = findCardPosition(activeId);
    if (!srcPos || !destColumnId) return;

    const newColumns = board.columns.map((c: any) => ({ ...c, cards: [...(c.cards || [])] }));
    const srcCol = newColumns.find((c: any) => c.id === srcPos.columnId)!;
    const movingCard = srcCol.cards.splice(srcPos.index, 1)[0];

    let insertIndex = newColumns.find((c: any) => c.id === destColumnId)!.cards.length;
    if (!overId.startsWith('col-')) {
      const destPos = findCardPosition(overId);
      if (destPos) {
        insertIndex = destPos.index;
      }
    }

    newColumns.find((c: any) => c.id === destColumnId)!.cards.splice(insertIndex, 0, { ...movingCard, columnId: destColumnId });

    const placements: { id: string; columnId: string; order: number }[] = [];
    for (const c of newColumns) {
      for (let i = 0; i < (c.cards || []).length; i++) {
        placements.push({ id: c.cards[i].id, columnId: c.id, order: i });
      }
    }

    setBoard((prev: any) => ({ ...prev, columns: newColumns }));
    await commitReorder(placements);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {(board.columns || []).map((col: any) => (
          <div key={col.id} id={`col-${col.id}`} style={{ width: 260, background: '#fff', padding: 8, borderRadius: 6 }}>
            <h3>{col.title}</h3>
            <SortableContext items={(col.cards || []).map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
              <div>
                {(col.cards || []).map((card: any) => (
                  <SortableCard key={card.id} card={card} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}

export const DndBoard = dynamic(() => Promise.resolve((props: Props) => <DndBoardClient {...props} />), { ssr: false });
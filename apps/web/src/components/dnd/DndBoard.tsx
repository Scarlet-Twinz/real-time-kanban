import React, { useState } from 'react';
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

const DndContext = BaseDndContext as unknown as React.FC<any>;

type Props = {
  board: any;
  setBoard: (b: any) => void;
  reloadBoard: () => Promise<void>;
  onCreateCard: (
    columnId: string,
    title: string,
    description?: string
  ) => Promise<void>;
};

export default function DndBoardClient({
  board,
  setBoard,
  reloadBoard,
  onCreateCard,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  );

  function findCardPosition(cardId: string) {
    if (!board) return null;

    for (const column of board.columns || []) {
      const index = (column.cards || []).findIndex(
        (card: any) => card.id === cardId
      );

      if (index >= 0) {
        return {
          columnId: column.id,
          index,
        };
      }
    }

    return null;
  }

  async function commitReorder(
    placements: {
      id: string;
      columnId: string;
      order: number;
    }[]
  ) {
    if (!board) return;

    try {
      const token = getAccessToken();

      await api.post(
        `/boards/${board.id}/reorder`,
        { placements },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        }
      );
    } catch (err) {
      console.error('reorder failed', err);
      await reloadBoard();
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!active || !over || !board) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    const source = findCardPosition(activeId);

    if (!source) return;

    let destinationColumnId: string | null = null;

    if (overId.startsWith('col-')) {
      destinationColumnId = overId.replace('col-', '');
    } else {
      const destination = findCardPosition(overId);

      if (destination) {
        destinationColumnId = destination.columnId;
      }
    }

    if (!destinationColumnId) return;

    const newColumns = (board.columns || []).map(
      (column: any) => ({
        ...column,
        cards: [...(column.cards || [])],
      })
    );

    const sourceColumn = newColumns.find(
      (column: any) => column.id === source.columnId
    );

    const destinationColumn = newColumns.find(
      (column: any) => column.id === destinationColumnId
    );

    if (!sourceColumn || !destinationColumn) return;

    const movingCard = sourceColumn.cards.splice(
      source.index,
      1
    )[0];

    if (!movingCard) return;

    let insertIndex = destinationColumn.cards.length;

    if (!overId.startsWith('col-')) {
      const destinationIndex =
        destinationColumn.cards.findIndex(
          (card: any) => card.id === overId
        );

      if (destinationIndex >= 0) {
        insertIndex = destinationIndex;
      }
    }

    destinationColumn.cards.splice(insertIndex, 0, {
      ...movingCard,
      columnId: destinationColumn.id,
    });

    const placements: {
      id: string;
      columnId: string;
      order: number;
    }[] = [];

    for (const column of newColumns) {
      for (
        let index = 0;
        index < column.cards.length;
        index++
      ) {
        placements.push({
          id: column.cards[index].id,
          columnId: column.id,
          order: index,
        });
      }
    }

    setBoard((prev: any) => ({
      ...prev,
      columns: newColumns,
    }));

    await commitReorder(placements);
  }

  async function moveCard(
    cardId: string,
    direction: 'left' | 'right'
  ) {
    if (!board) return;

    const source = findCardPosition(cardId);

    if (!source) return;

    const columns = board.columns || [];

    const sourceColumnIndex = columns.findIndex(
      (column: any) => column.id === source.columnId
    );

    if (sourceColumnIndex === -1) return;

    const targetColumnIndex =
      direction === 'left'
        ? sourceColumnIndex - 1
        : sourceColumnIndex + 1;

    if (
      targetColumnIndex < 0 ||
      targetColumnIndex >= columns.length
    ) {
      return;
    }

    const newColumns = columns.map((column: any) => ({
      ...column,
      cards: [...(column.cards || [])],
    }));

    const sourceColumn = newColumns[sourceColumnIndex];
    const targetColumn = newColumns[targetColumnIndex];

    const cardIndex = sourceColumn.cards.findIndex(
      (card: any) => card.id === cardId
    );

    if (cardIndex === -1) return;

    const [movingCard] = sourceColumn.cards.splice(
      cardIndex,
      1
    );

    targetColumn.cards.push({
      ...movingCard,
      columnId: targetColumn.id,
    });

    const placements: {
      id: string;
      columnId: string;
      order: number;
    }[] = [];

    for (const column of newColumns) {
      for (
        let index = 0;
        index < column.cards.length;
        index++
      ) {
        placements.push({
          id: column.cards[index].id,
          columnId: column.id,
          order: index,
        });
      }
    }

    setBoard((prev: any) => ({
      ...prev,
      columns: newColumns,
    }));

    await commitReorder(placements);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <section className="kanban-board">
        {(board.columns || []).map((column: any) => (
          <KanbanColumn
            key={column.id}
            column={column}
            onCreateCard={onCreateCard}
            onMoveCard={moveCard}
            columnIndex={(board.columns || []).findIndex(
              (c: any) => c.id === column.id
            )}
            totalColumns={(board.columns || []).length}
          />
        ))}
      </section>
    </DndContext>
  );
}

function KanbanColumn({
  column,
  onCreateCard,
  onMoveCard,
  columnIndex,
  totalColumns,
}: {
  column: any;
  onCreateCard: (
    columnId: string,
    title: string,
    description?: string
  ) => Promise<void>;
  onMoveCard: (
    cardId: string,
    direction: 'left' | 'right'
  ) => Promise<void>;
  columnIndex: number;
  totalColumns: number;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) return;

    setCreating(true);

    try {
      await onCreateCard(
        column.id,
        title.trim(),
        description.trim() || undefined
      );

      setTitle('');
      setDescription('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <section
      className="kanban-column"
      id={`col-${column.id}`}
    >
      <div className="kanban-column-header">
        <div>
          <h3>{column.title}</h3>

          <span className="kanban-column-count">
            {(column.cards || []).length}{' '}
            {(column.cards || []).length === 1
              ? 'card'
              : 'cards'}
          </span>
        </div>
      </div>

      <form
        className="kanban-create-card"
        onSubmit={handleSubmit}
      >
        <input
          className="input"
          placeholder="Card title"
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
        />

        <input
          className="input"
          placeholder="Description (optional)"
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
        />

        <button
          className="btn"
          type="submit"
          disabled={creating || !title.trim()}
        >
          {creating ? 'Adding…' : 'Add card'}
        </button>
      </form>

      <SortableContext
        items={(column.cards || []).map(
          (card: any) => card.id
        )}
        strategy={verticalListSortingStrategy}
      >
        <div className="kanban-card-list">
          {(column.cards || []).map((card: any) => (
            <div
              key={card.id}
              style={{
                position: 'relative',
              }}
            >
              <SortableCard card={card} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 6,
                  marginTop: -6,
                  marginBottom: 10,
                  paddingRight: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    onMoveCard(card.id, 'left')
                  }
                  disabled={columnIndex === 0}
                  aria-label="Move card left"
                  title="Move card left"
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,.08)',
                    background:
                      'rgba(255,255,255,.04)',
                    color: 'var(--text)',
                    cursor:
                      columnIndex === 0
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      columnIndex === 0 ? 0.35 : 1,
                    boxShadow: 'none',
                  }}
                >
                  ◀
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onMoveCard(card.id, 'right')
                  }
                  disabled={
                    columnIndex === totalColumns - 1
                  }
                  aria-label="Move card right"
                  title="Move card right"
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,.08)',
                    background:
                      'rgba(255,255,255,.04)',
                    color: 'var(--text)',
                    cursor:
                      columnIndex ===
                      totalColumns - 1
                        ? 'not-allowed'
                        : 'pointer',
                    opacity:
                      columnIndex ===
                      totalColumns - 1
                        ? 0.35
                        : 1,
                    boxShadow: 'none',
                  }}
                >
                  ▶
                </button>
              </div>
            </div>
          ))}

          {(column.cards || []).length === 0 && (
            <div className="kanban-empty">
              Drop a card here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}

export const DndBoard = dynamic(
  () =>
    Promise.resolve(
      (props: Props) => (
        <DndBoardClient {...props} />
      )
    ),
  { ssr: false }
);
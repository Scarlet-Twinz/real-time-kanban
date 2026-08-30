import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../src/utils/api';
import { getAccessToken } from '../../src/utils/auth';
import {
  initSocket,
  joinBoard,
  leaveBoard,
  getSocket,
} from '../../src/hooks/useSocket';
import Nav from '../../src/components/nav';
import { DndBoard } from '../../src/components/dnd/DndBoard';

type User = {
  id: string;
  name: string;
  email?: string;
};

type Card = {
  id: string;
  title: string;
  description?: string;
  order: number;
  columnId: string;
};

type Column = {
  id: string;
  title: string;
  order: number;
  boardId: string;
  cards?: Card[];
};

type Board = {
  id: string;
  title: string;
  columns?: Column[];
  members?: User[];
};

export default function BoardView(): JSX.Element {
  const router = useRouter();
  const { id } = router.query;

  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [creatingCol, setCreatingCol] = useState(false);

  /*
   * Prevent hydration mismatch.
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * Load board and initialize socket.
   */
  useEffect(() => {
    if (!mounted || !id) return;

    let active = true;

    async function loadBoard() {
      try {
        const token = getAccessToken();

        const res = await api.get('/boards', {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
          },
        });

        if (!active) return;

        const target = (res.data || []).find(
          (b: Board) => b.id === String(id)
        );

        setBoard(target || null);

        initSocket(token || undefined);
        joinBoard(String(id));
      } catch (err) {
        console.error('load board error:', err);
      }
    }

    loadBoard();

    return () => {
      active = false;

      if (id) {
        leaveBoard(String(id));
      }
    };
  }, [mounted, id]);

  /*
   * Socket events.
   */
  useEffect(() => {
    if (!mounted) return;

    const socket = getSocket();

    if (!socket) return;

    function onColumnCreated(data: Column) {
      setBoard((prev) => {
        if (!prev) return prev;

        if (
          (prev.columns || []).some(
            (column) => column.id === data.id
          )
        ) {
          return prev;
        }

        return {
          ...prev,
          columns: [
            ...(prev.columns || []),
            {
              ...data,
              cards: [],
            },
          ],
        };
      });
    }

    function onCardCreated(data: Card) {
      setBoard((prev) => {
        if (!prev) return prev;

        const columns = (prev.columns || []).map((column) => {
          if (column.id !== data.columnId) {
            return column;
          }

          if (
            (column.cards || []).some(
              (card) => card.id === data.id
            )
          ) {
            return column;
          }

          return {
            ...column,
            cards: [
              ...(column.cards || []),
              data,
            ],
          };
        });

        return {
          ...prev,
          columns,
        };
      });
    }

    function onCardUpdated(data: Card) {
      setBoard((prev) => {
        if (!prev) return prev;

        const columns = (prev.columns || []).map((column) => ({
          ...column,
          cards: (column.cards || []).map((card) =>
            card.id === data.id ? data : card
          ),
        }));

        return {
          ...prev,
          columns,
        };
      });
    }

    function onCardDeleted(data: { id: string }) {
      setBoard((prev) => {
        if (!prev) return prev;

        const columns = (prev.columns || []).map((column) => ({
          ...column,
          cards: (column.cards || []).filter(
            (card) => card.id !== data.id
          ),
        }));

        return {
          ...prev,
          columns,
        };
      });
    }

    socket.on('column_created', onColumnCreated);
    socket.on('card_created', onCardCreated);
    socket.on('card_updated', onCardUpdated);
    socket.on('card_deleted', onCardDeleted);

    return () => {
      socket.off('column_created', onColumnCreated);
      socket.off('card_created', onCardCreated);
      socket.off('card_updated', onCardUpdated);
      socket.off('card_deleted', onCardDeleted);
    };
  }, [mounted]);

  /*
   * Create a column.
   */
  async function handleCreateColumn(
    event?: React.FormEvent
  ) {
    event?.preventDefault();

    const title = colTitle.trim();

    if (!title || !board) return;

    setCreatingCol(true);

    try {
      const token = getAccessToken();

      const res = await api.post(
        `/boards/${board.id}/columns`,
        {
          title,
          order: (board.columns || []).length,
        },
        {
          headers: {
            Authorization: token
              ? `Bearer ${token}`
              : '',
          },
        }
      );

      const createdColumn = res.data;

      if (createdColumn) {
        setBoard((prev) => {
          if (!prev) return prev;

          if (
            (prev.columns || []).some(
              (column) => column.id === createdColumn.id
            )
          ) {
            return prev;
          }

          return {
            ...prev,
            columns: [
              ...(prev.columns || []),
              {
                ...createdColumn,
                cards: [],
              },
            ],
          };
        });
      }

      setColTitle('');
    } catch (err) {
      console.error('create column failed:', err);
    } finally {
      setCreatingCol(false);
    }
  }

  /*
   * Create a card.
   */
  async function handleCreateCard(
    columnId: string,
    title: string,
    description?: string
  ): Promise<void> {
    const cleanTitle = title.trim();

    if (!cleanTitle) return;

    try {
      const token = getAccessToken();

      const res = await api.post(
        `/columns/${columnId}/cards`,
        {
          title: cleanTitle,
          description,
          order: 0,
        },
        {
          headers: {
            Authorization: token
              ? `Bearer ${token}`
              : '',
          },
        }
      );

      const createdCard = res.data;

      if (!createdCard) return;

      setBoard((prev) => {
        if (!prev) return prev;

        const columns = (prev.columns || []).map(
          (column) => {
            if (column.id !== columnId) {
              return column;
            }

            if (
              (column.cards || []).some(
                (card) => card.id === createdCard.id
              )
            ) {
              return column;
            }

            return {
              ...column,
              cards: [
                ...(column.cards || []),
                createdCard,
              ],
            };
          }
        );

        return {
          ...prev,
          columns,
        };
      });
    } catch (err) {
      console.error('create card failed:', err);
    }
  }

  /*
   * Reload board from API.
   */
  async function reloadBoard(): Promise<void> {
    if (!id) return;

    try {
      const token = getAccessToken();

      const res = await api.get('/boards', {
        headers: {
          Authorization: token
            ? `Bearer ${token}`
            : '',
        },
      });

      const target = (res.data || []).find(
        (b: Board) => b.id === String(id)
      );

      setBoard(target || null);
    } catch (err) {
      console.error('reload board failed:', err);
    }
  }

  /*
   * Do not render browser-dependent board UI during SSR.
   */
  if (!mounted) {
    return (
      <main className="container">
        <div style={{ padding: 24 }}>
          Loading board...
        </div>
      </main>
    );
  }

  if (!board) {
    return (
      <main className="container">
        <Nav />

        <div style={{ padding: 24 }}>
          Loading board...
        </div>
      </main>
    );
  }

  return (
    <main className="container">
      <Nav />

      <div className="header">
        <div>
          <h1>{board.title}</h1>

          <p className="small">
            Organize your work with columns and
            draggable cards.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleCreateColumn}
        className="create-controls"
      >
        <input
          className="input"
          placeholder="New column title"
          value={colTitle}
          onChange={(event) =>
            setColTitle(event.target.value)
          }
          disabled={creatingCol}
        />

        <button
          className="btn"
          type="submit"
          disabled={
            creatingCol || !colTitle.trim()
          }
        >
          {creatingCol
            ? 'Creating…'
            : 'Create column'}
        </button>
      </form>

      <DndBoard
        board={board}
        setBoard={setBoard}
        reloadBoard={reloadBoard}
        onCreateCard={handleCreateCard}
      />
    </main>
  );
}
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../src/utils/api';
import { getAccessToken } from '../../src/utils/auth';
import { initSocket, joinBoard, leaveBoard, getSocket } from '../../src/hooks/useSocket';
import Nav from '../../src/components/nav';

type User = { id: string; name: string; email?: string };
type Card = { id: string; title: string; description?: string; order: number; columnId: string };
type Column = { id: string; title: string; order: number; boardId: string; cards?: Card[] };
type Board = { id: string; title: string; columns?: Column[]; members?: User[] };

export default function BoardView(): JSX.Element {
  const router = useRouter();
  const { id } = router.query;
  const [board, setBoard] = useState<Board | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [creatingCol, setCreatingCol] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const token = getAccessToken();
        const res = await api.get('/boards', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const target = (res.data || []).find((b: Board) => b.id === id);
        setBoard(target || null);
        initSocket(token || undefined);
        joinBoard(String(id));
      } catch (err) {
        console.error('load board error', err);
      }
    }
    load();

    return () => {
      if (id) leaveBoard(String(id));
    };
  }, [id]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return;

    function onColumnCreated(data: Column) {
      setBoard((prev: any) => {
        if (!prev) return prev;
        if ((prev.columns || []).some((c: Column) => c.id === data.id)) return prev;
        return { ...prev, columns: [...(prev.columns || []), { ...data, cards: [] }] };
      });
    }

    function onCardCreated(data: Card) {
      setBoard((prev: any) => {
        if (!prev) return prev;
        const cols = (prev.columns || []).map((c: Column) => {
          if (c.id === data.columnId) {
            if ((c.cards || []).some((card: Card) => card.id === data.id)) return c;
            return { ...c, cards: [...(c.cards || []), data] };
          }
          return c;
        });
        return { ...prev, columns: cols };
      });
    }

    function onCardUpdated(data: Card) {
      setBoard((prev: any) => {
        if (!prev) return prev;
        const cols = (prev.columns || []).map((c: Column) => {
          return { ...c, cards: (c.cards || []).map((card: Card) => (card.id === data.id ? data : card)) };
        });
        return { ...prev, columns: cols };
      });
    }

    function onCardDeleted(data: { id: string }) {
      setBoard((prev: any) => {
        if (!prev) return prev;
        const cols = (prev.columns || []).map((c: Column) => ({
          ...c,
          cards: (c.cards || []).filter((card: Card) => card.id !== data.id),
        }));
        return { ...prev, columns: cols };
      });
    }

    s.on('column_created', onColumnCreated);
    s.on('card_created', onCardCreated);
    s.on('card_updated', onCardUpdated);
    s.on('card_deleted', onCardDeleted);

    return () => {
      s.off('column_created', onColumnCreated);
      s.off('card_created', onCardCreated);
      s.off('card_updated', onCardUpdated);
      s.off('card_deleted', onCardDeleted);
    };
  }, []);

  async function handleCreateColumn(e?: React.FormEvent) {
    e?.preventDefault();
    if (!colTitle || !board) return;
    setCreatingCol(true);
    try {
      const token = getAccessToken();
      const res = await api.post(
        `/boards/${board.id}/columns`,
        { title: colTitle, order: (board.columns || []).length },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      
      const createdColumn = res.data;
      if (createdColumn) {
        setBoard((prev: any) => {
          if (!prev) return prev;
          if ((prev.columns || []).some((c: Column) => c.id === createdColumn.id)) return prev;
          return { ...prev, columns: [...(prev.columns || []), { ...createdColumn, cards: [] }] };
        });
      }

      setColTitle('');
    } catch (err) {
      console.error('create column failed', err);
    } finally {
      setCreatingCol(false);
    }
  }

  async function handleCreateCard(columnId: string, title: string, description?: string) {
    if (!title) return;
    try {
      const token = getAccessToken();
      const res = await api.post(
        `/columns/${columnId}/cards`,
        { title, description, order: 0 },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );

      const createdCard = res.data;
      if (createdCard) {
        setBoard((prev: any) => {
          if (!prev) return prev;
          const cols = (prev.columns || []).map((c: Column) => {
            if (c.id === columnId) {
              if ((c.cards || []).some((card: Card) => card.id === createdCard.id)) return c;
              return { ...c, cards: [...(c.cards || []), createdCard] };
            }
            return c;
          });
          return { ...prev, columns: cols };
        });
      }
    } catch (err) {
      console.error('create card failed', err);
    }
  }

  async function moveCard(cardId: string, direction: 'left' | 'right') {
    if (!board) return;
    let sourceColumn: Column | undefined;
    let sourceColIndex = -1;
    for (let i = 0; i < (board.columns || []).length; i++) {
      const c = board.columns![i];
      if ((c.cards || []).some((card: Card) => card.id === cardId)) {
        sourceColumn = c;
        sourceColIndex = i;
        break;
      }
    }
    if (!sourceColumn) return;
    const targetIndex = direction === 'left' ? sourceColIndex - 1 : sourceColIndex + 1;
    if (targetIndex < 0 || targetIndex >= (board.columns || []).length) return;
    const targetColumn = board.columns![targetIndex];
    if (!targetColumn) return;

    // Clone columns for optimistic update and building placements
    const newColumns = (board.columns || []).map(c => ({
      ...c,
      cards: [...(c.cards || [])]
    }));

    const sourceColObj = newColumns.find(c => c.id === sourceColumn!.id);
    const targetColObj = newColumns.find(c => c.id === targetColumn.id);
    if (!sourceColObj || !targetColObj) return;

    const movedCardIndex = sourceColObj.cards.findIndex(card => card.id === cardId);
    if (movedCardIndex === -1) return;
    const [movedCard] = sourceColObj.cards.splice(movedCardIndex, 1);
    
    const updatedCard = { ...movedCard, columnId: targetColumn.id };
    targetColObj.cards.push(updatedCard);

    // Build placements array for all cards across all columns
    const placements: { id: string; columnId: string; order: number }[] = [];
    for (const c of newColumns) {
      for (let i = 0; i < c.cards.length; i++) {
        placements.push({
          id: c.cards[i].id,
          columnId: c.id,
          order: i
        });
      }
    }

    // Optimistic UI update
    setBoard((prev: any) => {
      if (!prev) return prev;
      return { ...prev, columns: newColumns };
    });

    try {
      const token = getAccessToken();
      await api.post(
        `/boards/${board.id}/reorder`,
        { placements },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
    } catch (err) {
      console.error('batch move failed', err);
      reloadBoard();
    }
  }

  async function reloadBoard() {
    if (!id) return;
    try {
      const token = getAccessToken();
      const res = await api.get('/boards', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      const target = (res.data || []).find((b: Board) => b.id === id);
      setBoard(target || null);
    } catch (err) {
      console.error('reload board failed', err);
    }
  }

  if (!board) return <div style={{ padding: 24 }}>Loading board...</div>;

  return (
    <main className="container">
      <Nav />
      <h1>{board.title}</h1>

      <form onSubmit={handleCreateColumn} className="form" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="New column title" value={colTitle} onChange={e => setColTitle(e.target.value)} />
        <button className="btn" type="submit" disabled={creatingCol}>{creatingCol ? 'Creating…' : 'Create column'}</button>
      </form>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {(board.columns || []).map((col: Column) => (
          <section key={col.id} style={{ width: 260, background: '#fff', padding: 8, borderRadius: 6 }}>
            <h3>{col.title}</h3>
            <CreateCardForm columnId={col.id} onCreate={handleCreateCard} />
            <ul>
              {(col.cards || []).map((card: Card) => (
                <li key={card.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{card.title}</strong>
                    <div>
                      <button onClick={() => moveCard(card.id, 'left')} style={{ marginRight: 6 }} aria-label="Move left">◀</button>
                      <button onClick={() => moveCard(card.id, 'right')} aria-label="Move right">▶</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#444' }}>{card.description}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

function CreateCardForm({ columnId, onCreate }: { columnId: string; onCreate: (colId: string, title: string, desc?: string) => void }) {
  const [title, setTitle] = useState('');
  const [desc, sethDesc] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onCreate(columnId, title, desc); setTitle(''); sethDesc(''); }} style={{ marginBottom: 8 }}>
      <input className="input" placeholder="Card title" value={title} onChange={e => setTitle(e.target.value)} />
      <input className="input" placeholder="Description (optional)" value={desc} onChange={e => sethDesc(e.target.value)} />
      <button className="btn" type="submit">Add card</button>
    </form>
  );
}
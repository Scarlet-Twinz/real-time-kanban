import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { api } from '../../src/utils/api';
import { getAccessToken } from '../../src/utils/auth';
import { initSocket, joinBoard, leaveBoard, getSocket } from '../../src/hooks/useSocket';
import Nav from '../../src/components/Nav';

export default function BoardView() {
  const router = useRouter();
  const { id } = router.query;
  const [board, setBoard] = useState<any | null>(null);
  const [colTitle, setColTitle] = useState('');
  const [creatingCol, setCreatingCol] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const token = getAccessToken();
        const res = await api.get('/boards', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const target = (res.data || []).find((b: any) => b.id === id);
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
    function onColumnCreated(data: any) {
      setBoard(prev => {
        if (!prev) return prev;
        return { ...prev, columns: [...(prev.columns || []), { ...data, cards: [] }] };
      });
    }
    function onCardCreated(data: any) {
      setBoard(prev => {
        if (!prev) return prev;
        const cols = (prev.columns || []).map((c: any) =>
          c.id === data.columnId ? { ...c, cards: [...(c.cards || []), data] } : c
        );
        return { ...prev, columns: cols };
      });
    }
    function onCardUpdated(data: any) {
      setBoard(prev => {
        if (!prev) return prev;
        const cols = (prev.columns || []).map((c: any) => {
          return { ...c, cards: (c.cards || []).map((card: any) => (card.id === data.id ? data : card)) };
        });
        return { ...prev, columns: cols };
      });
    }
    function onCardDeleted(data: any) {
      setBoard(prev => {
        if (!prev) return prev;
        const cols = (prev.columns || []).map((c: any) => ({
          ...c,
          cards: (c.cards || []).filter((card: any) => card.id !== data.id),
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
      await api.post(
        `/boards/${board.id}/columns`,
        { title: colTitle, order: (board.columns || []).length },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
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
      await api.post(
        `/columns/${columnId}/cards`,
        { title, description, order: 0 },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
    } catch (err) {
      console.error('create card failed', err);
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
        {(board.columns || []).map((col: any) => (
          <section key={col.id} style={{ width: 260, background: '#fff', padding: 8, borderRadius: 6 }}>
            <h3>{col.title}</h3>
            <CreateCardForm columnId={col.id} onCreate={handleCreateCard} />
            <ul>
              {(col.cards || []).map((card: any) => (
                <li key={card.id} style={{ marginBottom: 8 }}>
                  <strong>{card.title}</strong>
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
  const [desc, setDesc] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onCreate(columnId, title, desc); setTitle(''); setDesc(''); }} style={{ marginBottom: 8 }}>
      <input className="input" placeholder="Card title" value={title} onChange={e => setTitle(e.target.value)} />
      <input className="input" placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
      <button className="btn" type="submit">Add card</button>
    </form>
  );
}
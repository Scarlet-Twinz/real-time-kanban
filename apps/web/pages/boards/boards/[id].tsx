import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import { getAccessToken } from '../../src/utils/auth';
import { initSocket, joinBoard, leaveBoard, getSocket } from '../../src/hooks/useSocket';

export default function BoardView() {
  const router = useRouter();
  const { id } = router.query;
  const [board, setBoard] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        const token = getAccessToken();
        const res = await axios.get('/boards', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        const target = (res.data || []).find((b: any) => b.id === id);
        setBoard(target || null);
        
        const tokenVal = getAccessToken();
        initSocket(tokenVal);
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
      setBoard(prev => prev ? { ...prev, columns: [...(prev.columns || []), data] } : prev);
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
        const cols = (prev.columns || []).map((c: any) => ({
          ...c,
          cards: (c.cards || []).map((card: any) => (card.id === data.id ? data : card))
        }));
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

  if (!board) return <div style={{ padding: 24 }}>Loading board...</div>;

  return (
    <main style={{ padding: 24 }}>
      <h1>{board.title}</h1>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {(board.columns || []).map((col: any) => (
          <section key={col.id} style={{ width: 260, background: '#f4f4f4', padding: 8, borderRadius: 6 }}>
            <h3>{col.title}</h3>
            <ul>
              {(col.cards || []).map((card: any) => (
                <li key={card.id}>
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
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { getAccessToken } from '../../src/utils/auth';
import { useRouter } from 'next/router';

export default function BoardsPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const token = getAccessToken();
        const res = await axios.get('/boards', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
        setBoards(res.data || []);
      } catch (err) {
        console.error('failed to load boards', err);
      }
    }
    load();
  }, []);

  async function createBoard(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title) return;
    try {
      const token = getAccessToken();
      const res = await axios.post('/boards', { title }, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      setBoards(prev => [res.data, ...prev]);
      setTitle('');
      router.push(`/boards/${res.data.id}`);
    } catch (err) {
      console.error('create board failed', err);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Your Boards</h1>
      <form onSubmit={createBoard} style={{ marginBottom: 16 }}>
        <input placeholder="New board title" value={title} onChange={e => setTitle(e.target.value)} />
        <button type="submit">Create</button>
      </form>

      <ul>
        {boards.map(b => (
          <li key={b.id}>
            <a href={`/boards/${b.id}`}>{b.title}</a> — members: {b.members?.length ?? 0}
          </li>
        ))}
      </ul>
    </main>
  );
}
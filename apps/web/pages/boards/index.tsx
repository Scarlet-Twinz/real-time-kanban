import React, { useEffect, useState } from 'react';
import { api } from '../../src/utils/api';
import { getAccessToken } from '../../src/utils/auth';
import { useRouter } from 'next/router';
import Nav from '../../src/components/nav';

export default function BoardsPage() {
  const [boards, setBoards] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const token = getAccessToken();
        const res = await api.get('/boards', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
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
      const res = await api.post('/boards', { title }, { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      router.push(`/boards/${res.data.id}`);
      setTitle('');
    } catch (err) {
      console.error('create board failed', err);
    }
  }

  return (
    <main className="container">
      <Nav />
      <h1>Your Boards</h1>

      <form onSubmit={createBoard} style={{ marginBottom: 16 }} className="form">
        <input className="input" placeholder="New board title" value={title} onChange={e => setTitle(e.target.value)} />
        <button className="btn" type="submit">Create board</button>
      </form>

      <ul>
        {boards.map(b => (
          <li key={b.id} style={{ marginBottom: 8 }}>
            <a href={`/boards/${b.id}`}>{b.title}</a> — members: {b.members?.length ?? 0}
          </li>
        ))}
      </ul>
    </main>
  );
}

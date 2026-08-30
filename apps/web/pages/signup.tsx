import React, { useState } from 'react';
import { api } from '@/utils/api';
import { setAccessToken } from '@/utils/auth';
import { useRouter } from 'next/router';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSignup(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/register', { email: email || undefined, phone: phone || undefined, name, password });
      const { accessToken } = res.data;
      setAccessToken(accessToken);
      router.push('/boards');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Signup failed');
    }
  }

  return (
    <main className="container">
      <div className="header">
        <h1>Sign up</h1>
        <a href="/login">Sign in</a>
      </div>

      <form className="form" onSubmit={handleSignup}>
        <input className="input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="input" placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" placeholder="Phone (optional, include country code)" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="input" placeholder="Password (min 6 chars)" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="btn" type="submit">Create account</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>
    </main>
  );
}
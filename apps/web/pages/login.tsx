import React, { useState } from 'react';
import { api } from '@/utils/api';
import { setAccessToken } from '@/utils/auth';
import { useRouter } from 'next/router';

export default function Login() {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    try {
      const payload: any = { password };
      if (emailOrPhone.includes('@')) payload.email = emailOrPhone;
      else payload.phone = emailOrPhone;
      const res = await api.post('/auth/login', payload);
      const { accessToken } = res.data;
      setAccessToken(accessToken);
      router.push('/boards');
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Login failed');
    }
  }

  return (
    <main className="container">
      <div className="header">
        <h1>Sign in</h1>
        <a href="/signup">Sign up</a>
      </div>

      <form className="form" onSubmit={handleLogin}>
        <input className="input" placeholder="Email or phone" value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} required />
        <input className="input" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="btn" type="submit">Sign in</button>
        {error && <div style={{ color: 'red' }}>{error}</div>}
      </form>
    </main>
  );
}
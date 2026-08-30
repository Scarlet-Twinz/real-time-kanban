import React, { useEffect, useState } from 'react';
import { clearAccessToken, getAccessToken } from '../utils/auth';
import { useRouter } from 'next/router';

export default function Nav() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(!!getAccessToken());
  }, []);

  function goTo(path: string) {
    router.push(path);
  }

  function logout() {
    clearAccessToken();
    setLoggedIn(false);
    router.push('/login');
  }

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <div>
        <button
          type="button"
          onClick={() => goTo('/boards')}
          className="btn"
        >
          Home
        </button>
      </div>

      <div>
        {loggedIn === null ? null : loggedIn ? (
          <button
            type="button"
            onClick={logout}
            style={{ marginLeft: 12 }}
            className="btn"
          >
            Logout
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => goTo('/login')}
              className="btn"
              style={{ marginRight: 8 }}
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => goTo('/signup')}
              className="btn"
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
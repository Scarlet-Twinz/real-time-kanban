export function setAccessToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function clearAccessToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
}
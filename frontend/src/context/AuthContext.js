'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private mode / blocked storage */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

// Expiry time (ms) from the JWT payload, or 0 if it can't be read
export function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

function readSession() {
  const token = storage.get('token');
  const rawUser = storage.get('user');
  if (!token || !rawUser) return null;
  try {
    const user = JSON.parse(rawUser);
    const exp = tokenExpiry(token);
    if (!user || (exp && exp <= Date.now())) return null;
    return { token, user };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    storage.remove('token');
    storage.remove('user');
  }, []);

  useEffect(() => {
    const session = readSession();
    if (session) {
      setToken(session.token);
      setUser(session.user);
    } else {
      logout();
    }
    setLoading(false);

    const onExpired = () => logout();
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [logout]);

  // Sign out exactly when the token expires instead of waiting for a failed request
  useEffect(() => {
    if (!token) return;
    const msLeft = tokenExpiry(token) - Date.now();
    if (msLeft <= 0 || msLeft > 2 ** 31 - 1) return;
    const timer = setTimeout(logout, msLeft);
    return () => clearTimeout(timer);
  }, [token, logout]);

  function login(tokenVal, userVal) {
    setToken(tokenVal);
    setUser(userVal);
    storage.set('token', tokenVal);
    storage.set('user', JSON.stringify(userVal));
  }

  function updateUser(userVal, tokenVal) {
    setUser(userVal);
    storage.set('user', JSON.stringify(userVal));
    if (tokenVal) {
      setToken(tokenVal);
      storage.set('token', tokenVal);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, loading, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

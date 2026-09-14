// Global auth state hook — JWT stored in localStorage
import { useState, useCallback, createContext, useContext } from 'react';

const AuthContext = createContext(null);

const API_BASE = 'http://127.0.0.1:8000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('resqmap_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('resqmap_token') || null);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('resqmap_token', data.access_token);
    localStorage.setItem('resqmap_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password, role = 'citizen') => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    setToken(data.access_token);
    setUser(data.user);
    localStorage.setItem('resqmap_token', data.access_token);
    localStorage.setItem('resqmap_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('resqmap_token');
    localStorage.removeItem('resqmap_user');
  }, []);

  const canDispatch = user?.role === 'operator' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, canDispatch, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

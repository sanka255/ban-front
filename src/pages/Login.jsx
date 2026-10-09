import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await axios.post('/api/auth/login', form);
      login(data.token);
      navigate('/hall-setup');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(circle at top left, rgba(245,158,11,0.08), transparent 25%), var(--bg-primary)' }}>
      <div className="glass-card w-full max-w-sm rounded-3xl p-8 shadow-[0_12px_30px_rgba(0,0,0,0.28)]" style={{ borderColor: 'rgba(245,158,11,0.18)' }}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>Synora Banquet</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sign in with your Synora account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none"
              style={{ backgroundColor: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-3 py-2 border" style={{ color: '#fca5a5', backgroundColor: 'rgba(127,29,29,0.18)', borderColor: 'rgba(248,113,113,0.3)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold rounded-xl py-2.5 text-sm transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#111827', boxShadow: '0 0 22px rgba(245,158,11,0.20)' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs mt-5 text-center" style={{ color: 'var(--text-muted)' }}>
          Uses your ella_pms credentials — no separate login needed.
        </p>
      </div>
    </div>
  );
}

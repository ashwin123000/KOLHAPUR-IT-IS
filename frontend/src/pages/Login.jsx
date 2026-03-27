import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Login({ role }) {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const isFreelancer = role === 'freelancer';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const loginFn = isFreelancer ? authAPI.loginFreelancer : authAPI.loginClient;
      const res  = await loginFn(email, password);
      // API wraps payload in res.data.data
      const data = res.data?.data || res.data;
      localStorage.setItem('token',    data.token    || '');
      localStorage.setItem('userId',   data.userId   || '');
      localStorage.setItem('role',     data.role     || role);
      localStorage.setItem('username', data.username || '');
      navigate(isFreelancer ? '/freelancer-dashboard' : '/client-dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">
            {isFreelancer ? 'Freelancer Portal' : 'Client Portal'}
          </h2>
          <p className="text-slate-500 mt-2">
            Sign in to access your {isFreelancer ? 'jobs & analytics' : 'projects & hiring'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email" required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password" required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-semibold transition ${
              isFreelancer ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-60`}
          >
            {loading ? 'Signing in…' : `Sign In as ${isFreelancer ? 'Freelancer' : 'Client'}`}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <button
            onClick={() => navigate(isFreelancer ? '/signup-freelancer' : '/signup-client')}
            className="text-indigo-600 font-medium hover:underline"
          >
            Register here
          </button>
        </div>

        <div className="mt-3 text-center text-sm text-slate-500">
          Want to switch portal?{' '}
          {isFreelancer ? (
            <button onClick={() => navigate('/login-client')} className="text-indigo-600 font-medium hover:underline">Go to Client Login</button>
          ) : (
            <button onClick={() => navigate('/login-freelancer')} className="text-emerald-600 font-medium hover:underline">Go to Freelancer Login</button>
          )}
        </div>
      </div>
    </div>
  );
}

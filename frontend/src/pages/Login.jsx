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
      // ✅ SYNCED: Your new api.js uses a single authAPI.login for all roles
      const res = await authAPI.login(email, password);
      
      // ✅ SYNCED: FastAPI returns { success: true, data: { token, userId } }
      const data = res.data?.data || res.data;

if (data.token) {
        const actualRole = data.token.split(':')[1] || '';

        // ✅ Block wrong portal login
        if (actualRole !== role) {
          setError(
            role === 'client'
              ? 'This account is a Freelancer account. Please use the Freelancer portal.'
              : 'This account is a Client account. Please use the Client portal.'
          );
          return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId || '');
        localStorage.setItem('role', actualRole);

        if (actualRole === 'freelancer') {
          navigate('/freelancer-dashboard');
        } else {
          navigate('/client-dashboard');
        }
      }
 } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail === 'Email already exists') {
        setError('This email is already registered. Please log in instead.');
      } else {
        setError(detail || 'Invalid email or password.');
      }
    }finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-10">
          <div className={`inline-block p-3 rounded-2xl mb-4 ${isFreelancer ? 'bg-indigo-50' : 'bg-emerald-50'}`}>
             <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl ${isFreelancer ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {isFreelancer ? 'F' : 'C'}
             </div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
            {isFreelancer ? 'Freelancer Portal' : 'Client Portal'}
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-2">
            Welcome back. Please enter your details.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
            <input
              type="email" required
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 transition-all"
              placeholder="name@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input
              type="password" required
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 ${
              isFreelancer ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
            } disabled:opacity-50`}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

<div className="mt-8 pt-8 border-t border-slate-50 text-center space-y-3">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">
            Don't have an account?{' '}
            <button
              onClick={() => navigate(isFreelancer ? '/signup-freelancer' : '/signup-client')}
              className="text-indigo-600 hover:underline"
            >
              Create one now
            </button>
          </p>
          <p className="text-xs text-slate-400">
            {isFreelancer ? 'Are you a client?' : 'Are you a freelancer?'}{' '}
            <button
              onClick={() => navigate(isFreelancer ? '/login-client' : '/login-freelancer')}
              className="text-emerald-600 font-bold hover:underline"
            >
              {isFreelancer ? 'Switch to Client Portal →' : 'Switch to Freelancer Portal →'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
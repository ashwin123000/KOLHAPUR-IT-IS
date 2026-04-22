import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, ShieldCheck } from 'lucide-react';

// Minimal top-right toast (same pattern as RegistrationFlow)
function WelcomeToast({ name, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl
        shadow-lg border bg-white border-emerald-200 text-slate-700 text-sm font-medium max-w-xs"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
      <span className="flex-1">Welcome back, <strong>{name}</strong>! 👋</span>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function Login({ role }) {
  const navigate = useNavigate();
  // Form details
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [otpValue, setOtpValue]   = useState('');
  
  // UI States
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [otpStep, setOtpStep]         = useState(1); // 1 = Enter Email, 2 = Enter OTP
  
  // Status states
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [welcomeName, setWelcomeName] = useState('');

  const isFreelancer = role === 'freelancer';

  const processLoginData = (data) => {
    const actualRole = data.token.split(':')[1] || '';

    // Block cross-portal login
    if (actualRole !== role) {
      setError(
        role === 'client'
          ? 'This account is a Freelancer account. Please use the Freelancer portal.'
          : 'This account is a Client account. Please use the Client portal.'
      );
      return false;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.userId || '');
    localStorage.setItem('role', actualRole);
    if (data.full_name) localStorage.setItem('full_name', data.full_name);

    // Show welcome toast briefly before navigating
    const displayName = data.full_name || email.split('@')[0];
    setWelcomeName(displayName);

    setTimeout(() => {
      if (actualRole === 'freelancer') navigate('/freelancer-dashboard');
      else navigate('/client-dashboard');
    }, 1800);
    return true;
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use loginV2 for freelancers (returns full_name); fall back to legacy for clients
      const loginFn = isFreelancer ? authAPI.loginV2 : authAPI.login;
      const res = await loginFn(email, password);
      const data = res.data?.data || res.data;
      if (data.token) processLoginData(data);
    } catch (err) {
      const detail = err.response?.data?.detail || '';
      if (detail === 'Email already exists') {
        setError('This email is already registered. Please log in instead.');
      } else {
        setError(detail || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.sendOtp(email);
      setOtpStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyOtp(email, otpValue);
      const data = res.data?.data || res.data;
      if (data.token) processLoginData(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <AnimatePresence>
        {welcomeName && (
          <WelcomeToast name={welcomeName} onDismiss={() => setWelcomeName('')} />
        )}
      </AnimatePresence>

      <div className="w-full max-w-md p-10 bg-white rounded-3xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <div className={`inline-block p-3 rounded-2xl mb-4 ${isFreelancer ? 'bg-indigo-50' : 'bg-emerald-50'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl
              ${isFreelancer ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'}`}>
              {isFreelancer ? 'F' : 'C'}
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
            {isFreelancer ? 'Freelancer Portal' : 'Client Portal'}
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-2">Welcome back. Please enter your details.</p>
        </div>

        {/* Toggle between Password and OTP */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${loginMethod === 'password' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => { setLoginMethod('password'); setError(''); }}
          >
            Password 
          </button>
          <button
            type="button"
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${loginMethod === 'otp' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            onClick={() => { setLoginMethod('otp'); setError(''); }}
          >
            OTP Code
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-xl text-xs font-bold uppercase tracking-wider">
            {error}
          </div>
        )}

        {loginMethod === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" required
                  className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 transition-all"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password" required
                  className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className={`w-full mt-2 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-lg
                transition-all active:scale-95 flex justify-center items-center gap-2
                ${isFreelancer ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          otpStep === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email" required
                    className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 transition-all"
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading}
                className={`w-full mt-2 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-lg
                  transition-all active:scale-95 flex justify-center items-center gap-2
                  ${isFreelancer ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          ) : (
             <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm font-semibold text-slate-600">Code sent to: {email}</p>
                <button type="button" onClick={() => {setOtpStep(1); setOtpValue('');}} className="text-xs text-indigo-600 hover:underline">Change email</button>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">6-Digit OTP</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text" required maxLength={6}
                    className="w-full pl-11 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-medium text-slate-700 transition-all text-center tracking-[0.5em]"
                    placeholder="123456"
                    value={otpValue}
                    onChange={e => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              </div>
              <button
                type="submit" disabled={loading || otpValue.length !== 6}
                className={`w-full mt-2 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-lg
                  transition-all active:scale-95 flex justify-center items-center gap-2
                  ${isFreelancer ? 'bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700' : 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
            </form>
          )
        )}

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
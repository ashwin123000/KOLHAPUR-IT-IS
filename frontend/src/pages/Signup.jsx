import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Signup({ role }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    companyName: '',
    collegeName: '',
    studyYear: 1,
    skills: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isFreelancer = role === 'freelancer';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };

      if (isFreelancer) {
        payload.collegeName = formData.collegeName;
        payload.studyYear = parseInt(formData.studyYear);
        payload.skills = formData.skills.split(',').map(s => s.trim());
        await authAPI.registerFreelancer(payload);
      } else {
        payload.companyName = formData.companyName;
        await authAPI.registerClient(payload);
      }

      navigate(isFreelancer ? '/login-freelancer' : '/login-client');
    } catch (err) {
      const serverMessage = err.response?.data?.error || err.response?.data?.message;
      setError(serverMessage || err.message || 'Registration failed. Please check your input and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-lg p-8 bg-white rounded-xl shadow-lg border border-slate-200">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">
            {isFreelancer ? 'Join as Freelancer' : 'Join as Client'}
          </h2>
          <p className="text-slate-500 mt-2">
            Create an account to start {isFreelancer ? 'working' : 'hiring'}
          </p>
        </div>
        
        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input name="username" type="text" required onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="johndoe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input name="email" type="email" required onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input name="password" type="password" required onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="••••••••" />
          </div>

          {isFreelancer ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">College Name (Optional)</label>
                <input name="collegeName" type="text" onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. MIT" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Study Year (Optional)</label>
                <input name="studyYear" type="number" min="1" max="4" onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skills (comma separated)</label>
                <input name="skills" type="text" required onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="React, C++, Node" />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input name="companyName" type="text" required onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Acme Corp" />
            </div>
          )}

          <button type="submit" disabled={loading} className={`w-full py-3 mt-4 rounded-lg text-white font-semibold transition ${isFreelancer ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-60`}>
            {loading ? 'Creating Account…' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <button onClick={() => navigate(isFreelancer ? '/login-freelancer' : '/login-client')} className="text-indigo-600 font-medium hover:underline">Log in</button>
        </div>
      </div>
    </div>
  );
}

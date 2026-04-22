import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Briefcase, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { jobsAPI } from '../services/api';

const initialForm = {
  title: 'Lead Agentic AI Engineer',
  company: '',
  description: '',
  location: 'Remote',
  work_mode: 'Remote',
  job_type: 'Full-time',
  duration: 'Ongoing',
  stipend: 0,
  category: 'Artificial Intelligence',
  skills: 'Python, LangChain, FastAPI, React, RAG, Agents',
  trust_score: 0,
  match_score: 0,
  github_url: '',
};

export default function AICareerRoleBuilder() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [createdJob, setCreatedJob] = useState(null);

  const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const trustScore = Math.max(0, Math.min(Number(form.trust_score) || 0, 1));
  const matchScore = Math.max(0, Math.min(Number(form.match_score) || 0, 100));
  const verifiedMatch = Number((matchScore * (0.7 + 0.3 * trustScore)).toFixed(2));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('saving');
    setError('');
    setCreatedJob(null);

    try {
      const payload = {
        ...form,
        company: form.company.trim() || 'Architect-X Client',
        stipend: Number(form.stipend) || 0,
        trust_score: trustScore,
        match_score: matchScore,
        skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean),
        jd: [
          form.description.trim(),
          'Design, ship, and operate agentic AI workflows against production data.',
        ].filter(Boolean),
        jr: form.skills.split(',').map(skill => `${skill.trim()} experience`).filter(Boolean),
      };
      const response = await jobsAPI.create(payload);
      setCreatedJob(response.data.data);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err.response?.data?.detail || err.message || 'Could not write job to SQLite.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Job Posting</h1>
          <p className="text-gray-500 mt-2">Writes directly to the SQLite jobs table. Discovery reads it back with a fresh GET.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase">Title</span>
              <input className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.title} onChange={e => setField('title', e.target.value)} required />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase">Company</span>
              <input className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.company} onChange={e => setField('company', e.target.value)} placeholder="Architect-X Client" />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase">Location</span>
              <input className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.location} onChange={e => setField('location', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase">Monthly Stipend</span>
              <input type="number" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.stipend} onChange={e => setField('stipend', e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-gray-500 uppercase">Description</span>
            <textarea className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3 min-h-32" value={form.description} onChange={e => setField('description', e.target.value)} required />
          </label>

          <label className="block">
            <span className="text-xs font-bold text-gray-500 uppercase">Skills</span>
            <input className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.skills} onChange={e => setField('skills', e.target.value)} />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase">Match Score</span>
              <input type="number" min="0" max="100" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.match_score} onChange={e => setField('match_score', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500 uppercase">Trust Score</span>
              <input type="number" min="0" max="1" step="0.01" className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.trust_score} onChange={e => setField('trust_score', e.target.value)} />
            </label>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-bold text-emerald-700 uppercase">Verified Match</div>
              <div className="text-3xl font-black text-emerald-700 mt-1">{verifiedMatch}%</div>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-bold text-gray-500 uppercase">GitHub Scraper URL</span>
            <input className="mt-1 w-full border border-gray-200 rounded-xl px-4 py-3" value={form.github_url} onChange={e => setField('github_url', e.target.value)} placeholder="https://github.com/org/repo" />
          </label>

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex gap-3">
              <AlertCircle className="shrink-0" size={20} />
              <span>{error}</span>
            </div>
          )}

          {status === 'success' && createdJob && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2"><CheckCircle2 size={20} /> Saved to SQLite: {createdJob.title}</span>
              <button type="button" onClick={() => navigate('/jobs')} className="font-bold text-emerald-700 hover:underline">Open Discovery</button>
            </div>
          )}

          <button disabled={status === 'saving'} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2">
            {status === 'saving' ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            Post Job
          </button>
        </form>

        <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 flex items-start gap-3">
          <Briefcase className="text-emerald-400 shrink-0" />
          <p className="text-sm leading-relaxed">
            Verified_Match = Match_Score x (0.7 + 0.3 x Trust_Score). The same value is persisted by the backend, so refreshes and deleted DB rows reflect the real database state.
          </p>
        </div>
      </div>
    </div>
  );
}

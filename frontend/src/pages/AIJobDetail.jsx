import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Banknote, CheckCircle2, Clock, Loader2, MapPin, Sparkles } from 'lucide-react';
import { jobsAPI } from '../services/api';

function scoreColor(score) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

export default function AIJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    jobsAPI.getById(id)
      .then(res => {
        if (active) setJob(res.data.data);
      })
      .catch(err => {
        if (active) setError(err.response?.data?.detail || err.message || 'Failed to load job from backend.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  const verifiedMatch = Number(job?.verified_match || 0);
  const weakAreas = useMemo(() => (job?.skills || []).filter(Boolean), [job]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 max-w-lg flex gap-3">
          <AlertCircle className="shrink-0" />
          <div>
            <p className="font-bold">Job unavailable</p>
            <p className="text-sm mt-1">{error}</p>
            <button onClick={() => navigate('/jobs')} className="mt-4 font-bold text-red-700 hover:underline">Back to Discovery</button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <button onClick={() => navigate('/jobs')} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <ArrowLeft size={18} /> Back to Jobs
        </button>
        <button
          onClick={() => setApplied(true)}
          className={`px-5 py-2 rounded-xl font-bold text-sm ${applied ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-green-600 hover:bg-green-500 text-white'}`}
        >
          {applied ? 'Applied' : 'Apply Now'}
        </button>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <section className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{job.company} · {job.category}</p>
            <h1 className="text-3xl font-black text-gray-900 leading-tight">{job.title}</h1>
            <p className="text-gray-600 leading-relaxed mt-4">{job.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <MapPin size={16} className="text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Location</p>
                <p className="text-sm font-bold">{job.location}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Clock size={16} className="text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-sm font-bold">{job.duration}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Banknote size={16} className="text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Pay</p>
                <p className="text-sm font-bold">{job.stipendLabel}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <Sparkles size={16} className="text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Mode</p>
                <p className="text-sm font-bold">{job.work_mode}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-gray-900 mb-4">Job Description</h2>
            <ul className="space-y-3">
              {(job.jd?.length ? job.jd : [job.description]).map((item, index) => (
                <li key={index} className="flex gap-3 text-sm text-gray-700">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-gray-900 mb-4">Requirements</h2>
            <div className="flex flex-wrap gap-2">
              {(job.skills || []).map(skill => (
                <span key={skill} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 font-semibold">{skill}</span>
              ))}
            </div>
          </div>
        </section>

        <aside className="bg-white rounded-2xl border border-gray-100 p-6 sticky top-[72px]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-green-600" />
            <span className="font-bold text-gray-900 text-sm">Verified Match</span>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black" style={{ color: scoreColor(verifiedMatch) }}>{verifiedMatch}%</div>
            <p className="text-xs text-gray-500 mt-3">
              Match Score x (0.7 + 0.3 x Trust Score)
            </p>
          </div>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Signals</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Match Score</span><strong>{job.match_score || 0}%</strong></div>
              <div className="flex justify-between"><span>Trust Score</span><strong>{Math.round((job.trust_score || 0) * 100)}%</strong></div>
              <div className="flex justify-between"><span>GitHub</span><strong>{job.github_url ? 'Connected' : 'Not linked'}</strong></div>
            </div>
          </div>

          {weakAreas.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <p className="text-xs font-bold text-gray-500 uppercase mb-3">Skill Focus</p>
              <ul className="space-y-2">
                {weakAreas.slice(0, 5).map(skill => (
                  <li key={skill} className="text-sm text-gray-700 flex gap-2"><span className="text-green-600">•</span>{skill}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

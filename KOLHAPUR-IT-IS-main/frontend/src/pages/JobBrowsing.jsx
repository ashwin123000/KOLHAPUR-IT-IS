import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Clock, X, CheckCircle
} from 'lucide-react';
import { projectsAPI, applyAPI, matchAPI, seekerAPI } from '../services/api';

function MatchSummary({ match }) {
  if (!match) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Match score will appear once your seeker profile is loaded.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm font-black text-slate-800">
        {match.totalScore}% match
      </p>
      <p className="mt-1 text-xs text-slate-500">{match.explanation}</p>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p className="font-bold uppercase tracking-wide">Strong</p>
          <p className="mt-1">{match.strongLabel}</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <p className="font-bold uppercase tracking-wide">Improve</p>
          <p className="mt-1">{match.improveLabel}</p>
        </div>
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <p className="font-bold uppercase tracking-wide">Missing</p>
          <p className="mt-1">{match.missingLabel}</p>
        </div>
      </div>
    </div>
  );
}

export default function JobBrowsing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [seeker, setSeeker] = useState(null);
  const [matchByJob, setMatchByJob] = useState({});
  const [matchStatus, setMatchStatus] = useState('idle');

  const [applyModal, setApplyModal] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const freelancerId = localStorage.getItem('userId');

    // Fetch all jobs and the freelancer's specific projects to check "Applied" status
    const fetches = [projectsAPI.getAll()];
    if (freelancerId) {
      fetches.push(projectsAPI.getForFreelancer(freelancerId));
      fetches.push(seekerAPI.getById(freelancerId).catch((err) => {
        console.log('[JOB_BROWSING] seeker fetch fallback', err?.response?.data || err.message);
        return null;
      }));
    }

    Promise.all(fetches)
      .then(([allRes, freelancerRes, seekerRes]) => {
        // FastAPI returns { success: true, data: [...] }
        const allJobs = allRes.data?.data || [];

        // Ensure every job uses 'id' for the key and modal logic
        const normalized = allJobs.map(job => ({
          ...job,
          id: job.projectId || job.id
        }));
        setJobs(normalized);
        console.log('[JOB_BROWSING] jobs fetched', normalized);

        // Build a set of IDs the user has already interacted with
        if (freelancerRes) {
          const myProjects = freelancerRes.data?.data || [];
          const ids = new Set(myProjects.map(p => p.projectId || p.id));
          setAppliedIds(ids);
        }

        const seekerPayload = seekerRes?.data?.seeker || null;
        console.log('[JOB_BROWSING] seeker payload', seekerPayload);
        setSeeker(seekerPayload);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const freelancerId = localStorage.getItem('userId');
    if (!freelancerId || !jobs.length) return;

    const hasSkills = seeker?.skills?.length > 0;
    if (!hasSkills) {
      setMatchStatus('waiting_for_data');
      return;
    }

    let cancelled = false;
    setMatchStatus('loading');

    Promise.all(
      jobs.map(async (job) => {
        try {
          const response = await matchAPI.calculate(freelancerId, job.id);
          console.log('[JOB_BROWSING] match payload', job.id, response.data);
          const payload = response.data || {};
          const matchedSkills = payload.matchedSkills || [];
          const gaps = payload.gaps || [];
          return [
            job.id,
            {
              ...payload,
              strongLabel: matchedSkills.length ? matchedSkills.slice(0, 2).join(', ') : 'Build a clearer skill signal',
              improveLabel: payload.missing?.length ? payload.missing.join(', ') : 'Keep adding proof through projects',
              missingLabel: gaps.length ? gaps.slice(0, 2).map((gap) => gap.skill || gap).join(', ') : 'No blocking gaps detected',
            },
          ];
        } catch (err) {
          console.error('[JOB_BROWSING] match error', job.id, err?.response?.data || err.message);
          return [
            job.id,
            {
              totalScore: 0,
              explanation: err?.response?.data?.detail || err?.response?.data?.error || 'Match calculation failed',
              strongLabel: 'Not available',
              improveLabel: 'Check seeker profile completeness',
              missingLabel: 'Match engine unavailable',
              matchedSkills: [],
              gaps: [],
            },
          ];
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setMatchByJob(Object.fromEntries(entries));
      setMatchStatus('ready');
    });

    return () => {
      cancelled = true;
    };
  }, [jobs, seeker]);

  const openApplyModal = (job) => {
    setApplyModal(job);
    setCoverLetter('');
    setApplyMsg('');
  };

  const handleApply = async () => {
    const freelancerId = localStorage.getItem('userId');
    const projectId = applyModal?.id;

    if (!projectId || !freelancerId) {
      setApplyMsg("❌ Missing project or user information");
      return;
    }

    setApplying(true);
    setApplyMsg('');

    try {
      // ✅ Matches your FastAPI /api/apply/secure endpoint
      await applyAPI.apply({
        projectId,
        freelancerId,
        coverLetter: coverLetter || "No proposal"
      });

      setApplyMsg("✅ Application submitted successfully!");
      setAppliedIds(prev => new Set([...prev, projectId]));
      
      // Auto-close modal after success
      setTimeout(() => setApplyModal(null), 1500);
    } catch (err) {
      // Use the detail message from FastAPI HTTPException
      const errorMsg = err.response?.data?.detail || "Application failed";
      setApplyMsg(`❌ ${errorMsg}`);
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter(j =>
    j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* SEARCH BAR */}
      <div className="max-w-4xl mx-auto bg-white p-4 rounded-xl shadow-sm mb-6 flex gap-4 items-center border">
        <Search className="text-slate-400" />
        <input
          className="flex-1 outline-none text-slate-700"
          placeholder="Search jobs by title or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="max-w-4xl mx-auto">
        <p className="mb-4 text-slate-500 font-medium">
          {loading ? "Finding opportunities..." : `Showing ${filteredJobs.length} available projects`}
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white rounded-xl animate-pulse border" />)}
          </div>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="bg-white p-6 rounded-xl shadow-sm mb-4 border hover:border-blue-300 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{job.title}</h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1">{job.status?.replace('_', ' ') || 'Open'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-800">${job.budget}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Budget</p>
                </div>
              </div>

              <div className="flex gap-4 text-sm mt-4 text-slate-500">
                <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                  <MapPin size={14} /> {job.location || 'Remote'}
</span>
                {job.deadline && (
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                    <Clock size={14} /> {job.deadline}
                  </span>
                )}
              </div>

              <p className="mt-4 text-slate-600 leading-relaxed">
                {job.description || "No description provided for this project."}
              </p>

              <div className="mt-4">
                <MatchSummary match={matchByJob[job.id]} />
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                <div className="text-xs text-slate-400">
                  {matchStatus === 'waiting_for_data'
                    ? 'Complete your seeker profile to unlock match scoring.'
                    : matchStatus === 'loading'
                      ? 'Calculating fit from your stored seeker profile...'
                      : 'Scored from seeker profile, projects, and required skills.'}
                </div>

                {appliedIds.has(job.id) ? (
                  <button
                    disabled
                    className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border border-emerald-100"
                  >
                    <CheckCircle size={16} /> Already Applied
                  </button>
                ) : (
                  <button
                    onClick={() => openApplyModal(job)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                  >
                    Apply for Project
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* APPLY MODAL */}
      {applyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setApplyModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-1">{applyModal.title}</h2>
            <p className="text-slate-500 mb-6 font-medium">Set your terms for this project</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Why should we hire you?</label>
                <textarea
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Describe your experience and how you can help..."
                  className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              {applyMsg && (
                <div className={`p-3 rounded-lg text-xs font-bold text-center ${applyMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {applyMsg}
                </div>
              )}

              <button
                onClick={handleApply}
                className="bg-blue-600 text-white py-4 w-full rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                disabled={applying}
              >
                {applying ? "Sending Proposal..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

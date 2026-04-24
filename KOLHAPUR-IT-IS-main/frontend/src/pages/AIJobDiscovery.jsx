import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Briefcase, Loader2, Search, Sparkles } from "lucide-react";
import { hiringOSAPI } from "../services/api";

function MatchRing({ percentage, disabled }) {
  const stroke = 2 * Math.PI * 40;
  const offset = stroke - stroke * ((percentage || 0) / 100);
  const color = disabled ? "#94a3b8" : percentage >= 70 ? "#16a34a" : percentage >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={stroke}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-slate-900">{disabled ? "--" : `${percentage}%`}</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">Match</span>
      </div>
    </div>
  );
}

export default function AIJobDiscovery() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") || "";
  const [jobs, setJobs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!userId) {
        setError("Login required.");
        setLoading(false);
        return;
      }
      try {
        const [jobsRes, profileRes] = await Promise.all([
          hiringOSAPI.getAIJobs({ userId }),
          hiringOSAPI.getFreelancerProfile(userId),
        ]);
        if (!active) return;
        setJobs(jobsRes.data.jobs || []);
        setProfile(profileRes.data.data || null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.response?.data?.detail || loadError.message || "Failed to load AI jobs.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return jobs;
    return jobs.filter((job) => {
      const title = job.compiledDashboard?.roleHeader?.title || job.basicDetails?.projectTitle || "";
      const domain = job.compiledDashboard?.roleHeader?.domain || "";
      return title.toLowerCase().includes(query) || domain.toLowerCase().includes(query);
    });
  }, [jobs, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={30} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-2">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-wide">Freelancer AI Jobs</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900">Jobs compiled into recruiter intelligence</h1>
            <p className="text-slate-600 mt-2">
              Match scores appear only when your profile supports a real calculation.
            </p>
          </div>
          <button onClick={() => navigate("/create-project")} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold">
            Post Job
          </button>
        </div>

        <div className="grid lg:grid-cols-[0.7fr_0.3fr] gap-6 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or domain"
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Profile Completeness</div>
            <div className="text-3xl font-black text-slate-900">
              {profile?.matchingProfile?.percentage ?? 0}%
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {profile?.matchingProfile?.warning || "Your matching profile is ready."}
            </div>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6">{error}</div>
        ) : null}

        {!error && filteredJobs.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <Briefcase className="mx-auto text-slate-300 mb-4" size={36} />
            <h2 className="text-xl font-bold text-slate-900">No AI-enhanced jobs yet</h2>
            <p className="text-slate-500 mt-2">Publish the first recruiter-side job to populate this board.</p>
          </div>
        ) : null}

        <div className="grid md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => {
            const header = job.compiledDashboard?.roleHeader || {};
            const salary = job.basicDetails?.salary || {};
            const incompleteJob = !header.title || !(job.compiledDashboard?.skillGraph?.length) || !(job.compiledDashboard?.domainTable?.length);
            return (
              <button
                key={job.id}
                onClick={() => !incompleteJob && navigate(`/jobs/${job.id}`)}
                disabled={incompleteJob}
                className="text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-sm transition disabled:opacity-70 disabled:hover:border-slate-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                        AI Enhanced
                      </span>
                      <span className="px-2 py-1 rounded-full bg-slate-50 text-slate-600 text-xs font-semibold border border-slate-200">
                        {job.jobSource}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{header.title || job.basicDetails?.projectTitle}</h3>
                    <div className="text-sm text-slate-500 mt-1">{header.domain || job.basicDetails?.domain}</div>
                    <div className="text-sm text-slate-500 mt-3">
                      {job.basicDetails?.experienceRequired || "Flexible"} · {job.basicDetails?.workMode || "remote"} · {job.basicDetails?.timeCommitment || "fulltime"}
                    </div>
                    <div className="text-sm text-slate-700 mt-3 font-semibold">
                      {salary.disclosed ? `${salary.currency || "USD"} ${salary.min || 0} - ${salary.max || 0}` : "Not disclosed"}
                    </div>
                    {job.matchMeta?.reason ? (
                      <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                        {job.matchMeta.reason}
                      </div>
                    ) : null}
                    {incompleteJob ? (
                      <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                        <AlertTriangle size={14} />
                        Incomplete job data
                      </div>
                    ) : null}
                  </div>
                  <MatchRing percentage={job.matchPercentage || 0} disabled={job.matchScoreValue == null} />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Top skills</div>
                  <div className="flex flex-wrap gap-2">
                    {(job.compiledDashboard?.skillGraph || []).slice(0, 5).map((skill) => (
                      <span key={skill.skill} className="px-2 py-1 rounded-full bg-slate-50 text-slate-700 text-xs border border-slate-200">
                        {skill.skill}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

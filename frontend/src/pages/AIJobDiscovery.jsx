import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Clock, SlidersHorizontal, ChevronDown,
  Sparkles, CheckCircle2, TrendingUp, Users, Zap, X, Bell, Filter
} from 'lucide-react';
import { mockJobs, userProfile } from '../data/mockJobs';

/* ─── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 bg-[#111827] text-white px-5 py-3 rounded-xl shadow-2xl border border-green-500/40 animate-slide-in"
          style={{ animation: 'slideInRight 0.3s ease' }}
        >
          <CheckCircle2 size={18} className="text-green-400 shrink-0" />
          <span className="text-sm font-medium">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-2 text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ─── Skeleton Card ──────────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
      <div className="flex gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-6 bg-gray-200 rounded-full w-20" />
        <div className="h-6 bg-gray-200 rounded-full w-16" />
        <div className="h-6 bg-gray-200 rounded-full w-24" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 rounded w-4/5 mb-4" />
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <div className="h-5 bg-gray-200 rounded w-24" />
        <div className="h-9 bg-gray-200 rounded-xl w-28" />
      </div>
    </div>
  );
}

/* ─── Featured Match Banner ──────────────────────────────────────────────────── */
function FeaturedBanner({ job, onApply, applied, onView }) {
  return (
    <div
      onClick={() => onView(job.id)}
      className="relative bg-gradient-to-r from-[#0f1f0f] to-[#1a3a1a] rounded-2xl p-6 mb-6 cursor-pointer group overflow-hidden border border-green-900/50"
    >
      {/* bg glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-green-400" />
            <span className="text-green-400 text-xs font-bold uppercase tracking-widest">These Matches</span>
          </div>
          <div className="space-y-2 mb-4">
            {job.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-slate-200 text-sm">
                <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                {h}
              </div>
            ))}
          </div>
          <p className="text-slate-400 text-xs font-medium">167 open positions</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onApply(job); }}
          className={`shrink-0 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            applied
              ? 'bg-green-900/50 text-green-400 border border-green-700 cursor-default'
              : 'bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-500/25'
          }`}
        >
          {applied ? '✓ Applied' : 'Apply Now'}
        </button>
      </div>
    </div>
  );
}

/* ─── Job Card ───────────────────────────────────────────────────────────────── */
function JobCard({ job, applied, onApply, onView }) {
  const [applying, setApplying] = useState(false);

  const handleApply = async (e) => {
    e.stopPropagation();
    if (applied || applying) return;
    setApplying(true);
    await new Promise(r => setTimeout(r, 800));
    setApplying(false);
    onApply(job);
  };

  return (
    <div
      onClick={() => onView(job.id)}
      className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer group hover:border-green-300 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-200"
    >
      <div className="flex gap-3 mb-4">
        {/* Company Logo */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: job.companyColor + '22', color: job.companyColor, border: `1.5px solid ${job.companyColor}44` }}
        >
          {job.companyLogo}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-green-700 transition-colors line-clamp-2">
            {job.title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="font-medium text-gray-700">{job.company}</span>
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {job.postedAgo}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-2 flex-wrap mb-4">
        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100">
          {job.type}
        </span>
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-100">
          {job.location}
        </span>
        <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium border border-purple-100">
          {job.duration}
        </span>
      </div>

      {/* Description Snippet */}
      <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">{job.description}</p>

      {/* Skills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {job.skills.slice(0, 4).map(s => (
          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
            {s}
          </span>
        ))}
        {job.skills.length > 4 && (
          <span className="text-xs text-gray-400 px-1 py-0.5">+{job.skills.length - 4}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <p className="text-sm font-bold text-gray-900">{job.stipendLabel}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <Users size={10} /> {job.applicants}
          </p>
        </div>
        <button
          onClick={handleApply}
          className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
            applied
              ? 'bg-green-50 text-green-700 border border-green-200 cursor-default'
              : applying
              ? 'bg-green-100 text-green-600 cursor-wait'
              : 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-600/20'
          }`}
        >
          {applied ? '✓ Applied' : applying ? 'Applying…' : 'Apply Now'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function AIJobDiscovery() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const toastRef = useRef(0);

  // ── Filter State ──
  const [roleFilter, setRoleFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [stipendRange, setStipendRange] = useState([0, 100000]);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Load with realistic delay ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setJobs(mockJobs);
      setLoading(false);
    }, 1600);
    return () => clearTimeout(timer);
  }, []);

  const addToast = (message) => {
    const id = ++toastRef.current;
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => removeToast(id), 3500);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleApply = async (job) => {
    if (appliedIds.has(job.id)) return;
    setAppliedIds(prev => new Set([...prev, job.id]));
    addToast(`✅ Application Submitted for "${job.title}"`);
  };

  const handleViewJob = (id) => navigate(`/jobs/${id}`);

  // ── Filter Logic ──
  const roles = ['All', 'Artificial Intelligence', 'Data Science', 'Machine Learning', 'Full Stack', 'AI / Robotics'];
  const locations = ['All', 'Remote', 'Hybrid', 'On-site'];

  const filtered = jobs.filter(job => {
    const matchRole = roleFilter === 'All' || job.category === roleFilter;
    const matchLoc = locationFilter === 'All' || job.location === locationFilter || (locationFilter === 'On-site' && !['Remote', 'Hybrid'].includes(job.location));
    const matchStipend = job.stipend >= stipendRange[0] && job.stipend <= stipendRange[1];
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || job.title.toLowerCase().includes(q) || job.company.toLowerCase().includes(q) || job.skills.some(s => s.toLowerCase().includes(q));
    return matchRole && matchLoc && matchStipend && matchSearch;
  });

  const featured = jobs[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Top Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center gap-4 px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-black text-gray-900 text-lg">YourAIJobs</span>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-xl relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/20 transition-all bg-gray-50"
              placeholder="Search AI/ML roles, companies, skills..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Nav pills */}
          <nav className="flex items-center gap-1 ml-4">
            {['Projects', 'Applicants', 'Inbox'].map(n => (
              <button key={n} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${n === 'Projects' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {n}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <button className="relative text-gray-500 hover:text-gray-800">
              <Bell size={20} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
              AJ
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        {/* ── Left Filter Panel ── */}
        <aside className="w-64 bg-white border-r border-gray-200 p-5 overflow-y-auto shrink-0">
          <div className="flex items-center gap-2 mb-5">
            <Filter size={16} className="text-green-600" />
            <span className="font-bold text-gray-800 text-sm">Smart Signal Filters</span>
          </div>

          {/* Preference toggle */}
          <div className="flex items-center gap-2 mb-5 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <div className="w-4 h-4 bg-green-600 rounded flex items-center justify-center">
              <CheckCircle2 size={10} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-green-700">As per my preferences</span>
          </div>

          {/* Role Filter */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Role</label>
            <div className="relative">
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="w-full appearance-none bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg pr-7 font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {roles.map(r => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-600 pointer-events-none" />
            </div>
          </div>

          {/* Location Filter */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Location</label>
            <div className="relative">
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-lg pr-7 font-medium focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {locations.map(l => <option key={l}>{l}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {/* Stipend Slider */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
              Desired monthly stipend
            </label>
            <input
              type="range"
              min={0}
              max={100000}
              step={5000}
              value={stipendRange[1]}
              onChange={e => setStipendRange([0, Number(e.target.value)])}
              className="w-full accent-green-600 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1 font-medium">
              <span>₹0</span>
              <span>₹{(stipendRange[1] / 1000).toFixed(0)}K</span>
            </div>
          </div>

          <button
            onClick={() => { setRoleFilter('All'); setLocationFilter('All'); setStipendRange([0, 100000]); setSearchQuery(''); }}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-md shadow-green-600/20"
          >
            Apply Filters
          </button>

          <button className="w-full text-center text-sm text-gray-400 hover:text-gray-700 mt-3 flex items-center justify-center gap-1 transition-colors">
            <SlidersHorizontal size={13} /> View more filters
          </button>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-auto px-6 py-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-black text-gray-900">
                Latest <span className="text-green-600">AI/ML</span> Internships
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {loading ? 'Scanning opportunities...' : `${filtered.length} open positions`}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-lg px-3 py-2">
              <TrendingUp size={13} className="text-green-500" />
              <span className="font-medium">AI-ranked for you</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-2xl h-36 animate-pulse opacity-60" />
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <>
              {/* Featured Banner */}
              {featured && (
                <FeaturedBanner
                  job={featured}
                  applied={appliedIds.has(featured.id)}
                  onApply={handleApply}
                  onView={handleViewJob}
                />
              )}

              {/* Get Hired Section */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  <Zap size={16} className="text-green-500" />
                  Get Hired for {roleFilter === 'All' ? 'Data Science' : roleFilter}
                </h2>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">3+ applicants</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">≡ Sort</span>
                </div>
              </div>

              {/* Job Cards */}
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Search size={48} className="mb-3 opacity-30" />
                  <p className="text-lg font-semibold">No jobs match your filters</p>
                  <p className="text-sm mt-1">Try adjusting the role, location, or stipend range</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filtered.slice(1).map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      applied={appliedIds.has(job.id)}
                      onApply={handleApply}
                      onView={handleViewJob}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in { animation: slideInRight 0.3s ease; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}

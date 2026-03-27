import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, DollarSign, Clock, TrendingUp, Filter, ChevronRight, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, applyAPI } from '../services/api';

export default function JobBrowsing() {
  const navigate = useNavigate();
  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  // Apply modal
  const [applyModal, setApplyModal] = useState(null);   // job object
  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount]     = useState('');
  const [applying, setApplying]       = useState(false);
  const [applyMsg, setApplyMsg]       = useState('');

  const categories = [
    { name: 'MNCs', count: '2.2K+ Companies' },
    { name: 'Internet', count: '244 Companies' },
    { name: 'Manufacturing', count: '1.1K+ Companies' },
    { name: 'Fortune 500', count: '158 Companies' },
    { name: 'Product', count: '1.2K+ Companies' },
  ];

  useEffect(() => {
    projectsAPI.getAll()
      .then(res => setJobs(res.data?.data || []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  const openApplyModal = (job) => {
    setApplyModal(job);
    setCoverLetter('');
    setBidAmount(job.budget ? String(job.budget) : '');
    setApplyMsg('');
  };

  const handleApply = async () => {
    const freelancerId = localStorage.getItem('userId');
    if (!freelancerId) { setApplyMsg('Please log in as a freelancer first.'); return; }
    setApplying(true);
    setApplyMsg('');
    try {
      await applyAPI.apply({
        projectId:   applyModal.id,
        freelancerId,
        coverLetter,
        bidAmount:   parseFloat(bidAmount) || 0,
      });
      setApplyMsg('✅ Application submitted successfully!');
      setTimeout(() => setApplyModal(null), 1600);
    } catch (err) {
      setApplyMsg('❌ ' + (err.response?.data?.error || 'Failed to apply. Try again.'));
    } finally {
      setApplying(false);
    }
  };

  const filteredJobs = jobs.filter(j =>
    searchQuery === '' || j.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">

      {/* Apply Modal */}
      {applyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
            <button
              onClick={() => setApplyModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-slate-800 mb-1">{applyModal.title}</h2>
            <p className="text-sm text-slate-500 mb-4">Budget: ${applyModal.budget?.toLocaleString()}</p>

            <label className="block text-sm font-medium text-slate-700 mb-1">Your Bid (₹ / $)</label>
            <input
              type="number"
              value={bidAmount}
              onChange={e => setBidAmount(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your amount"
            />

            <label className="block text-sm font-medium text-slate-700 mb-1">Cover Letter</label>
            <textarea
              rows={4}
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              className="w-full mb-4 px-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Why are you the best fit for this project?"
            />

            {applyMsg && (
              <p className={`text-sm mb-3 font-medium ${applyMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                {applyMsg}
              </p>
            )}

            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition disabled:opacity-60"
            >
              {applying ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      )}

      {/* Search Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 flex items-center gap-4">
        <Search className="text-slate-400" />
        <input
          type="text"
          placeholder="Search jobs by title, skills, or company"
          className="flex-1 outline-none text-slate-800 text-lg"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition">
          Find Jobs
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-4 overflow-x-auto pb-4 mb-6">
        {categories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`min-w-[180px] text-left p-4 rounded-xl border ${
              activeCategory === cat.name
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            } transition`}
          >
            <h3 className="font-bold text-slate-800 text-lg mb-1">{cat.name}</h3>
            <p className="text-sm font-semibold text-blue-600 flex items-center justify-between">
              {cat.count} <ChevronRight size={16} />
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Filter size={18} /> All Filters
              </h3>
            </div>
            <div className="border-t border-slate-100 pt-4 mb-4">
              <h4 className="font-semibold text-slate-800 mb-3 text-sm">Job Type</h4>
              <div className="space-y-2.5">
                {['Remote', 'On-site', 'Hybrid', 'Contract'].map(f => (
                  <label key={f} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">{f}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h4 className="font-semibold text-slate-800 mb-3 text-sm">Budget Range</h4>
              <div className="space-y-2.5">
                {['< $1,000', '$1k – $5k', '$5k – $15k', '$15k+'].map(f => (
                  <label key={f} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600">{f}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Job Listings */}
        <div className="flex-1">
          <div className="mb-4 text-slate-600 font-medium text-sm">
            {loading ? 'Loading…' : `Showing ${filteredJobs.length} project${filteredJobs.length !== 1 ? 's' : ''}`}
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 h-40 animate-pulse" />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <p className="text-lg font-semibold">No projects found</p>
              <p className="text-sm mt-1">Check back later or ask a client to post a project.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredJobs.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2
                        className="text-xl font-bold text-slate-800 leading-tight mb-1 cursor-pointer hover:text-blue-600"
                        onClick={() => navigate(`/project/${job.id}`)}
                      >
                        {job.title}
                      </h2>
                      <div className="flex items-center gap-3">
                        <p className="text-slate-600 font-medium">Client Project</p>
                        <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          <TrendingUp size={12} />
                          {job.status === 'open' ? 'Actively Hiring' : job.status}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center font-bold text-slate-400 text-lg">
                      {(job.title || 'P')[0]}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1.5"><MapPin size={16} className="text-slate-400" /> Remote</div>
                    <div className="flex items-center gap-1.5"><DollarSign size={16} className="text-slate-400" /> ${job.budget?.toLocaleString() || 'Negotiable'}</div>
                    <div className="flex items-center gap-1.5"><Clock size={16} className="text-slate-400" />
                      {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Flexible'}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">{job.description || 'Exciting opportunity — click to read more.'}</p>

                  {Array.isArray(job.requiredSkills) && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.requiredSkills.map(s => (
                        <span key={s} className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">{s}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button
                      onClick={() => navigate(`/project/${job.id}`)}
                      className="text-sm text-blue-600 font-semibold hover:underline"
                    >
                      View Details →
                    </button>

                    {localStorage.getItem('role') === 'freelancer' && (
                      <button
                        onClick={() => openApplyModal(job)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

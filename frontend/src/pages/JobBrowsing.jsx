import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, DollarSign, Clock, X, CheckCircle
} from 'lucide-react';
import { projectsAPI, applyAPI } from '../services/api';

export default function JobBrowsing() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedIds, setAppliedIds] = useState(new Set());

  const [applyModal, setApplyModal] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [bidAmount, setBidAmount] = useState('');
  const [applyMsg, setApplyMsg] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const freelancerId = localStorage.getItem('userId');
    
    // Fetch all jobs and the freelancer's specific projects to check "Applied" status
    const fetches = [projectsAPI.getAll()];
    if (freelancerId) {
      fetches.push(projectsAPI.getForFreelancer(freelancerId));
    }

    Promise.all(fetches)
      .then(([allRes, freelancerRes]) => {
        // FastAPI returns { success: true, data: [...] }
        const allJobs = allRes.data?.data || [];
        
        // Ensure every job uses 'id' for the key and modal logic
        const normalized = allJobs.map(job => ({
          ...job,
          id: job.projectId || job.id 
        }));
        setJobs(normalized);

        // Build a set of IDs the user has already interacted with
        if (freelancerRes) {
          const myProjects = freelancerRes.data?.data || [];
          const ids = new Set(myProjects.map(p => p.projectId || p.id));
          setAppliedIds(ids);
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setJobs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const openApplyModal = (job) => {
    setApplyModal(job);
    setBidAmount(job.budget ? String(job.budget) : '');
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
        bidAmount: Number(bidAmount) || 0,
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

              <div className="flex justify-between items-center mt-6 pt-4 border-t">
                

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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Bid Amount ($)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>

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
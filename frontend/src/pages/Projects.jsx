import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Star, Clock, Briefcase, ChevronRight, 
  CheckCircle2, XCircle, AlertTriangle, MonitorPlay, 
  Trash2, ArrowRight, Eye, User, Loader2
} from 'lucide-react';
import { applyAPI } from '../services/api';

const ScoreCircle = ({ score }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = "text-emerald-500";
  if (score < 40) color = "text-red-500";
  else if (score < 70) color = "text-blue-500";

  return (
    <div className={`relative flex items-center justify-center w-12 h-12 ${color}`}>
      <svg className="transform -rotate-90 w-12 h-12">
        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="opacity-20" />
        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-in-out" strokeLinecap="round" />
      </svg>
      <span className="absolute text-[13px] font-black text-slate-700">{score}</span>
    </div>
  );
};

export default function MyWorkspace() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState(null);

  const freelancerId = localStorage.getItem('userId');

  const fetchApplications = async () => {
    if (!freelancerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await applyAPI.getFreelancerApplications(freelancerId);
      const raw = res.data?.data || [];
      const mapped = raw.map(app => {
        const isArray = Array.isArray(app);
        // Backend returns: [id, project_id, freelancer_id, status, cover_letter, bid_amount, title, budget, project_status]
        return {
          id: isArray ? app[0] : (app.id || app.applicationId),
          projectId: isArray ? app[1] : (app.projectId || app.project_id),
          title: isArray ? app[6] : app.title,
          company: "Client", 
          status: isArray ? app[3] : app.status,
          score: 80, // Default for now
          budget: isArray ? app[7] : app.budget,
          bidAmount: isArray ? app[5] : (app.bidAmount || app.bid_amount),
          appliedDate: "Recently",
          feedback: isArray ? app[4] : app.cover_letter,
          expectedSkills: [],
          rejectionReason: ""
        };
      });
      console.log("📂 [WORKSPACE] Mapped applications:", mapped);
      setJobs(mapped);
      if (mapped.length > 0) setSelectedJob(mapped[0]);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [freelancerId]);

  const counts = {
    All: jobs.length,
    Applied: jobs.filter(j => j.status === 'pending').length,
    Shortlisted: jobs.filter(j => j.status === 'shortlisted' || j.status === 'accepted').length,
    'VM Test': jobs.filter(j => j.status === 'vm_test').length,
    Passed: jobs.filter(j => j.status === 'passed' || j.status === 'completed').length,
    Rejected: jobs.filter(j => j.status === 'rejected').length,
  };

  const statuses = [
    { label: 'All', value: 'All', icon: Briefcase, color: 'text-slate-600 bg-slate-100', active: 'bg-slate-200 text-slate-800' },
    { label: 'Pending', value: 'Applied', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', active: 'bg-emerald-100 text-emerald-800 shadow-sm' },
    { label: 'Hired/Shortlist', value: 'Shortlisted', icon: Star, color: 'text-blue-600 bg-blue-50', active: 'bg-blue-100 text-blue-800 shadow-sm' },
    { label: 'VM Test', value: 'VM Test', icon: MonitorPlay, color: 'text-purple-600 bg-purple-50', active: 'bg-purple-100 text-purple-800 shadow-sm' },
    { label: 'Passed', value: 'Passed', icon: CheckCircle2, color: 'text-green-600 bg-green-50', active: 'bg-green-100 text-green-800 shadow-sm' },
    { label: 'Rejected', value: 'Rejected', icon: XCircle, color: 'text-red-600 bg-red-50', active: 'bg-red-100 text-red-800 shadow-sm' },
  ];

  const getStatusBadge = (status) => {
    const s = status.toLowerCase();
    if (s === 'pending') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 'accepted' || s === 'shortlisted') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (s === 'rejected') return 'text-red-700 bg-red-50 border-red-200';
    return 'text-slate-700 bg-slate-50 border-slate-200';
  };

  const filteredJobs = activeFilter === 'All' ? jobs : jobs.filter(j => {
    const s = j.status.toLowerCase();
    if (activeFilter === 'Applied') return s === 'pending';
    if (activeFilter === 'Shortlisted') return s === 'accepted' || s === 'shortlisted';
    if (activeFilter === 'Rejected') return s === 'rejected';
    return s === activeFilter.toLowerCase().replace(' ', '_');
  });

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-20 flex flex-col items-center justify-center">
        <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">My Workspace</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage your hiring pipeline and track applications.</p>
        </div>
        <button 
          onClick={() => navigate('/jobs')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          Find More Projects
        </button>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6 relative">
        
        {/* LEFT NAV */}
        <aside className="w-full lg:w-56 shrink-0 lg:sticky top-6 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {statuses.map(st => {
            const Icon = st.icon;
            const isActive = activeFilter === st.value;
            return (
              <button
                key={st.value}
                onClick={() => setActiveFilter(st.value)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all w-full text-left font-semibold text-sm shrink-0 min-w-[140px]
                  ${isActive ? st.active : 'bg-transparent text-slate-500 hover:bg-slate-100'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={16} className={isActive ? '' : 'text-slate-400'} />
                  {st.label}
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-white/50' : 'bg-slate-200 text-slate-600'}`}>
                  {counts[st.value]}
                </span>
              </button>
            )
          })}
        </aside>

        {/* CENTER GRID */}
        <main className="flex-1 w-full grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredJobs.length === 0 ? (
             <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
               <Briefcase size={48} className="text-slate-200 mb-4" />
               <p className="text-lg font-bold text-slate-400">No applications found in this stage.</p>
               <button onClick={() => navigate('/jobs')} className="mt-4 text-emerald-600 font-bold hover:underline">Browse Marketplace →</button>
             </div>
          ) : (
            filteredJobs.map(job => (
              <div 
                key={job.id} 
                onClick={() => setSelectedJob(job)}
                className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between
                  ${selectedJob?.id === job.id ? 'border-emerald-500 shadow-md ring-2 ring-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}
                `}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg leading-tight mb-1 text-slate-900">{job.title}</h3>
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                        <Briefcase size={12} /> {job.company}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <ScoreCircle score={job.score} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status</p>
                       <p className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Clock size={12}/> {job.status}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Bid</p>
                       <p className="text-xs font-semibold text-emerald-700">${job.bidAmount}</p>
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${getStatusBadge(job.status)}`}>
                    {job.status}
                  </span>
                  <div className="flex items-center gap-2">
                     <button className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors">
                        <Eye size={14} />
                     </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </main>

        {/* RIGHT PANEL */}
        <aside className="w-full lg:w-[320px] shrink-0 lg:sticky top-6">
          {selectedJob ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto">
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Application Insights</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                     <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-snug">Alex Thompson</h2>
                    <p className="text-xs font-semibold text-slate-500">Workspace Member</p>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">
                <div>
                   <div className="flex justify-between items-end mb-2">
                       <p className="text-xs font-bold text-slate-600">AI Compatibility</p>
                       <p className="text-sm font-black text-slate-900">{selectedJob.score}%</p>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedJob.score}%` }}></div>
                   </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Target Application</p>
                   <p className="text-sm font-bold text-slate-800">{selectedJob.title}</p>
                   <p className="text-xs font-medium text-slate-500">ID: {selectedJob.projectId}</p>
                </div>

                {selectedJob.status === 'Rejected' && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-sm text-red-900 font-medium leading-relaxed">Lack of specific skills identified for this role.</p>
                  </div>
                )}

                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent Proposal</h4>
                   <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                     "{selectedJob.feedback || 'No cover letter provided.'}"
                   </p>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3 mt-auto">
                <button 
                  onClick={() => navigate('/jobs')}
                  className="col-span-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-200 tracking-widest uppercase"
                >
                  Improve Proposal
                </button>
              </div>
            </div>
          ) : (
            <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-white">
              <User size={48} className="text-slate-300 mb-4" />
              <p className="font-bold text-slate-600">No Application Selected</p>
              <p className="text-sm text-slate-400 mt-2">Click on any card to view AI insights.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
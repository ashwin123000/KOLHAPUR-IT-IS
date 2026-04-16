import React, { useState } from 'react';
import { 
  Search, Star, Clock, Briefcase, ChevronRight, 
  CheckCircle2, XCircle, AlertTriangle, MonitorPlay, 
  Trash2, ArrowRight, Eye, User
} from 'lucide-react';

const initialJobs = [
  {
    id: 1,
    title: "Senior NLP Engineer",
    company: "Zaggle",
    status: "Applied",
    score: 75,
    skills: ["Python", "NLP", "Transformers"],
    salary: "$120k-$150k/year",
    difficulty: 3,
    appliedDate: "2 days ago",
    feedback: "Solid Python background, but lacks advanced LLM fine-tuning experience.",
    expectedSkills: ["LangChain", "LoRA", "PyTorch"],
    rejectionReason: null
  },
  {
    id: 2,
    title: "Data Science Intern",
    company: "NexTech",
    status: "Shortlisted",
    score: 84,
    skills: ["Python", "SQL", "Tableau"],
    salary: "$35/hr-$45/hr",
    difficulty: 2,
    appliedDate: "5 days ago",
    feedback: "Strong data visualization skills. Need to verify ML modeling capabilities in the next round.",
    expectedSkills: ["Scikit-learn", "Pandas"],
    rejectionReason: null
  },
  {
    id: 3,
    title: "AI Product Developer",
    company: "DeepTech",
    status: "VM Test",
    score: 85,
    skills: ["API", "Roadmapping"],
    salary: "$130k-$160k/year",
    difficulty: 4,
    appliedDate: "3 days ago",
    feedback: "Excellent product sense. The VM test will evaluate your backend integration skills.",
    expectedSkills: ["Node.js", "Docker", "GraphQL"],
    rejectionReason: null
  },
  {
    id: 4,
    title: "MLOps Engineer",
    company: "DataGenix",
    status: "Passed",
    score: 94,
    skills: ["Docker", "MLflow", "Kubernetes"],
    salary: "$140k-$170k/year",
    difficulty: 4,
    appliedDate: "1 week ago",
    feedback: "Outstanding VM test performance. Perfectly matched for this role.",
    expectedSkills: [],
    rejectionReason: null
  },
  {
    id: 5,
    title: "AI Chatbot Developer",
    company: "SpeakSmart",
    status: "Rejected",
    score: 62,
    skills: ["Python", "Dialogflow"],
    salary: "$90k-$120k/year",
    difficulty: 3,
    appliedDate: "1 week ago",
    feedback: "AI analysis identifies critical lack of backend expertise in Flask deployment and server management.",
    expectedSkills: ["Python", "Flask", "Wit.ai"],
    rejectionReason: "Lack of Flask and backend deployment experience."
  },
  {
    id: 6,
    title: "Prompt Engineer",
    company: "VisionAI Labs",
    status: "Applied",
    score: 71,
    skills: ["Copywriting", "GPT-4"],
    salary: "$80k-$100k/year",
    difficulty: 2,
    appliedDate: "1 week ago",
    feedback: "Good prompt writing skills, but portfolio lacks complex instruction chaining.",
    expectedSkills: ["Few-shot", "System Prompts"],
    rejectionReason: null
  }
];

const ScoreCircle = ({ score }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let color = "text-green-500";
  if (score < 70) color = "text-red-500";
  else if (score < 85) color = "text-blue-500";

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
  const [jobs, setJobs] = useState(initialJobs);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedJob, setSelectedJob] = useState(initialJobs[0]);

  const counts = {
    All: jobs.length,
    Applied: jobs.filter(j => j.status === 'Applied').length,
    Shortlisted: jobs.filter(j => j.status === 'Shortlisted').length,
    'VM Test': jobs.filter(j => j.status === 'VM Test').length,
    Passed: jobs.filter(j => j.status === 'Passed').length,
    Rejected: jobs.filter(j => j.status === 'Rejected').length,
  };

  const statuses = [
    { label: 'All', value: 'All', icon: Briefcase, color: 'text-slate-600 bg-slate-100', active: 'bg-slate-200 text-slate-800' },
    { label: 'Applied', value: 'Applied', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50', active: 'bg-emerald-100 text-emerald-800 shadow-sm' },
    { label: 'Shortlisted', value: 'Shortlisted', icon: Star, color: 'text-blue-600 bg-blue-50', active: 'bg-blue-100 text-blue-800 shadow-sm' },
    { label: 'VM Test', value: 'VM Test', icon: MonitorPlay, color: 'text-purple-600 bg-purple-50', active: 'bg-purple-100 text-purple-800 shadow-sm' },
    { label: 'Passed', value: 'Passed', icon: CheckCircle2, color: 'text-green-600 bg-green-50', active: 'bg-green-100 text-green-800 shadow-sm' },
    { label: 'Rejected', value: 'Rejected', icon: XCircle, color: 'text-red-600 bg-red-50', active: 'bg-red-100 text-red-800 shadow-sm' },
  ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Applied': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Shortlisted': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'VM Test': return 'text-purple-700 bg-purple-50 border-purple-200';
      case 'Passed': return 'text-green-700 bg-green-50 border-green-200';
      case 'Rejected': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    const nextJobs = jobs.filter(j => j.id !== id);
    setJobs(nextJobs);
    if (selectedJob?.id === id) {
      setSelectedJob(nextJobs.length ? nextJobs[0] : null);
    }
  };

  const nextStageMap = {
    'Applied': 'Shortlisted',
    'Shortlisted': 'VM Test',
    'VM Test': 'Passed',
    'Passed': 'Passed',
    'Rejected': 'Rejected'
  };

  const handleNextStage = (id, e) => {
    if (e) e.stopPropagation();
    setJobs(jobs.map(j => {
      if (j.id === id) {
        return { ...j, status: nextStageMap[j.status] || j.status };
      }
      return j;
    }));
    if (selectedJob?.id === id) {
      setSelectedJob({ ...selectedJob, status: nextStageMap[selectedJob.status] || selectedJob.status });
    }
  };

  const filteredJobs = activeFilter === 'All' ? jobs : jobs.filter(j => j.status === activeFilter);

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 text-slate-800">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">My Workspace</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Manage your hiring pipeline and track applications.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6 relative">
        
        {/* LEFT VERITCAL NAVBAR */}
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
             <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl">
               <Briefcase size={48} className="text-slate-300 mb-4" />
               <p className="text-lg font-bold text-slate-500">No jobs found in this stage.</p>
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
                      <span className="text-[9px] font-bold text-slate-400 uppercase mt-1">AI Score</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Applied</p>
                       <p className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Clock size={12}/> {job.appliedDate}</p>
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Salary</p>
                       <p className="text-xs font-semibold text-emerald-700">{job.salary}</p>
                     </div>
                  </div>

                  <div className="mb-4">
                     <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5 flex justify-between">
                       Skills 
                       <span className="flex">
                         {[...Array(5)].map((_, i) => <Star key={i} size={10} className={i < job.difficulty ? "text-amber-400 fill-amber-400" : "text-slate-200"} />)}
                       </span>
                     </p>
                     <div className="flex flex-wrap gap-1.5">
                       {job.skills.map(s => (
                         <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                           {s}
                         </span>
                       ))}
                     </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  {/* Status Badge */}
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 ${getStatusBadge(job.status)}`}>
                    {job.status === 'Applied' && <CheckCircle2 size={12}/>}
                    {job.status === 'Shortlisted' && <Star size={12}/>}
                    {job.status === 'VM Test' && <MonitorPlay size={12}/>}
                    {job.status === 'Passed' && <CheckCircle2 size={12}/>}
                    {job.status === 'Rejected' && <XCircle size={12}/>}
                    {job.status}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                     <button className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors tooltip relative group">
                        <Eye size={14} />
                     </button>
                     {job.status !== 'Passed' && job.status !== 'Rejected' && (
                       <button onClick={(e) => handleNextStage(job.id, e)} className="p-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 transition-colors">
                          <ArrowRight size={14} />
                       </button>
                     )}
                     <button onClick={(e) => handleDelete(job.id, e)} className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 transition-colors">
                        <Trash2 size={14} />
                     </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </main>

        {/* RIGHT PANEL (INSIGHTS) */}
        <aside className="w-full lg:w-[320px] shrink-0 sticky top-6">
          {selectedJob ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto">
              
              <div className="p-6 border-b border-slate-100 bg-slate-50">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Testing Candidate Profile</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">
                     <User size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-snug">Alex Thompson</h2>
                    <p className="text-xs font-semibold text-slate-500">Freelancer</p>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6">
                
                {/* Profile Completion */}
                <div>
                   <div className="flex justify-between items-end mb-2">
                      <p className="text-xs font-bold text-slate-600">Profile Match Engine</p>
                      <p className="text-sm font-black text-slate-900">{selectedJob.score}%</p>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedJob.score}%` }}></div>
                   </div>
                </div>

                {/* Job Link */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Target Application</p>
                   <p className="text-sm font-bold text-slate-800">{selectedJob.title}</p>
                   <p className="text-xs font-medium text-slate-500">{selectedJob.company}</p>
                </div>

                {selectedJob.status === 'Rejected' && selectedJob.rejectionReason && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                       <AlertTriangle size={14} className="text-red-500" />
                       <h4 className="text-xs font-black uppercase tracking-wide text-red-800">Why you got rejected</h4>
                    </div>
                    <p className="text-sm text-red-900 font-medium leading-relaxed">{selectedJob.rejectionReason}</p>
                  </div>
                )}

                {selectedJob.expectedSkills.length > 0 && (
                  <div>
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Expected Skills (Missing)</h4>
                     <div className="flex flex-wrap gap-1.5">
                       {selectedJob.expectedSkills.map(s => (
                         <span key={s} className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-[11px] font-bold">
                           • {s}
                         </span>
                       ))}
                     </div>
                  </div>
                )}

                <div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">AI Feedback</h4>
                   <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                     {selectedJob.feedback}
                   </p>
                </div>

              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 gap-3 mt-auto">
                <button className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 font-bold text-xs rounded-xl transition-all shadow-sm shadow-emerald-200 tracking-wide">
                  Improve Resume
                </button>
                <button className="col-span-2 py-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 font-bold text-xs rounded-xl transition-all">
                  Delete Application
                </button>
              </div>

            </div>
          ) : (
            <div className="h-[400px] border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-center bg-white">
              <User size={48} className="text-slate-300 mb-4" />
              <p className="font-bold text-slate-600">No Job Selected</p>
              <p className="text-sm text-slate-400 mt-2">Click on any application card to view AI insights and candidate tracking.</p>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}
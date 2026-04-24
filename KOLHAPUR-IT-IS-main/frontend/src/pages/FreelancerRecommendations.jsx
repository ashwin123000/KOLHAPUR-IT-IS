import React, { useState, useMemo } from 'react';
import { 
  Users, Shield, AlertTriangle, CheckCircle2, Search, 
  Filter, ArrowLeft, Briefcase, Mail, Activity, Eye, Zap, Target,
  XCircle, ChevronRight, Clock, Star, Brain, ArrowDownUp, CheckSquare, Square, Terminal
} from 'lucide-react';

const MOCK_CANDIDATES = [
  {
    id: 1,
    name: "Alex Thompson",
    role: "Full Stack Dev",
    avatar: "AT",
    verified: true,
    hiddenGem: true,
    risk: false,
    matchScore: 87,
    trustScore: 78,
    confidence: "High",
    confidenceScore: 92,
    skills: [
      { name: "React", score: 82 },
      { name: "Node.js", score: 65 }
    ],
    matchBreakdown: { skill: 80, experience: 70, behavior: 65 },
    trustBreakdown: { test: 82, projects: 75, github: 70, behavior: 68, resume: 60 },
    trustNote: "Moderate trust: Strong verified skills but slight resume exaggeration detected.",
    aiInsights: "Top React match + high reliability. Strong frontend proof validated.",
    whyCandidate: [
      "Strong React + frontend match against your required stack.",
      "Verified real-world projects with active CI/CD pipelines.",
      "High test performance compared to peer group."
    ],
    missingSkills: ["Backend APIs (Advanced)"],
    improvementPath: "If trained in advanced Node deployment for 2 weeks, match increases to 92%.",
    timeline: [
      { event: "Joined platform", time: "2 months ago", score: null },
      { event: "Completed React skill test", time: "1 month ago", score: "82%" },
      { event: "Uploaded full-stack portfolio", time: "3 weeks ago", score: "Verified" }
    ]
  },
  {
    id: 2,
    name: "Priya Sharma",
    role: "Backend Engineer",
    avatar: "PS",
    verified: true,
    hiddenGem: false,
    risk: false,
    matchScore: 92,
    trustScore: 88,
    confidence: "High",
    confidenceScore: 95,
    skills: [
      { name: "Python", score: 90 },
      { name: "Django", score: 85 }
    ],
    matchBreakdown: { skill: 95, experience: 85, behavior: 88 },
    trustBreakdown: { test: 90, projects: 88, github: 92, behavior: 85, resume: 85 },
    trustNote: "High trust: All history cross-verified. Exceptional technical assessments.",
    aiInsights: "Flawless backend testing scores. Consistent commit history.",
    whyCandidate: [
      "Backend architecture seamlessly aligns with your AWS requirements.",
      "Perfect score in system design evaluation.",
    ],
    missingSkills: ["Frontend (React/Vue)"],
    improvementPath: "Candidate is highly specialized. No immediate gap training required.",
    timeline: [
      { event: "Joined platform", time: "6 months ago", score: null },
      { event: "Passed System Design test", time: "4 months ago", score: "94%" }
    ]
  },
  {
    id: 3,
    name: "James Wilson",
    role: "Frontend Dev",
    avatar: "JW",
    verified: false,
    hiddenGem: false,
    risk: true,
    matchScore: 65,
    trustScore: 42,
    confidence: "Low",
    confidenceScore: 35,
    skills: [
      { name: "Vue.js", score: 60 },
      { name: "HTML/CSS", score: 75 }
    ],
    matchBreakdown: { skill: 50, experience: 80, behavior: 40 },
    trustBreakdown: { test: 45, projects: 50, github: 30, behavior: 45, resume: 40 },
    trustNote: "Low trust: Inconsistencies found across linked sites and GitHub history.",
    aiInsights: "Poor test performance on framework hooks. High risk of inflation.",
    whyCandidate: [
      "Basic UI implementations look adequate for entry-level tasks.",
    ],
    missingSkills: ["React", "API Integration"],
    improvementPath: "Requires fundamental SPA framework training.",
    timeline: [
      { event: "Joined platform", time: "1 week ago", score: null },
      { event: "Failed React Core test", time: "5 days ago", score: "45%" }
    ]
  },
  {
    id: 4,
    name: "Sarah Jenkins",
    role: "ML Engineer",
    avatar: "SJ",
    verified: true,
    hiddenGem: true,
    risk: false,
    matchScore: 89,
    trustScore: 94,
    confidence: "High",
    confidenceScore: 91,
    skills: [
      { name: "PyTorch", score: 92 },
      { name: "MLOps", score: 80 }
    ],
    matchBreakdown: { skill: 90, experience: 85, behavior: 90 },
    trustBreakdown: { test: 94, projects: 92, github: 95, behavior: 88, resume: 90 },
    trustNote: "Extremely high trust: Extensive open-source contributions verified.",
    aiInsights: "Top tier ML modeling capabilities. Strong MLOps foundation.",
    whyCandidate: [
      "Deep understanding of PyTorch and deep learning architectures.",
      "Proven track record of deploying models to production."
    ],
    missingSkills: [],
    improvementPath: "Ready for immediate deployment on complex ML tasks.",
    timeline: [
      { event: "Joined platform", time: "1 year ago", score: null },
      { event: "Passed Advanced ML test", time: "10 months ago", score: "96%" }
    ]
  },
  {
    id: 5,
    name: "Michael Chen",
    role: "Data Analyst",
    avatar: "MC",
    verified: false,
    hiddenGem: false,
    risk: true,
    matchScore: 71,
    trustScore: 55,
    confidence: "Medium",
    confidenceScore: 60,
    skills: [
      { name: "SQL", score: 85 },
      { name: "Tableau", score: 70 }
    ],
    matchBreakdown: { skill: 75, experience: 65, behavior: 60 },
    trustBreakdown: { test: 60, projects: 50, github: 40, behavior: 55, resume: 65 },
    trustNote: "Medium trust: Solid SQL skills but lack of verified complex projects.",
    aiInsights: "Good basic querying skills but struggles with advanced data pipelines.",
    whyCandidate: [
      "Adequate for reporting and basic dashboard creation."
    ],
    missingSkills: ["Python (Pandas)", "Data Engineering pipelines"],
    improvementPath: "Needs training in programmatic data manipulation to reach senior level.",
    timeline: [
      { event: "Joined platform", time: "3 months ago", score: null },
      { event: "Passed SQL Basics", time: "1 month ago", score: "85%" }
    ]
  }
];

// Combine mock candidates heavily to simulate high density
const EXTENDED_MOCK = [...MOCK_CANDIDATES, ...MOCK_CANDIDATES.map(c => ({...c, id: c.id + 10, name: c.name + " II"})), ...MOCK_CANDIDATES.map(c => ({...c, id: c.id + 20, name: c.name + " III"}))];

// --- HELPERS ---
const getColor = (val) => {
  if (val >= 80) return "text-green-600 bg-green-50";
  if (val >= 60) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
};

const getTextColor = (val) => {
  if (val >= 80) return "text-green-600";
  if (val >= 60) return "text-amber-600";
  return "text-red-600";
};

// ─── PROGRESS BAR (Light Theme) ───
const LightProgressBar = ({ value, label, isCompact = false }) => (
  <div className="w-full">
    {label && (
      <div className={`flex justify-between text-gray-500 font-semibold mb-1 ${isCompact ? 'text-[9px] uppercase' : 'text-xs'}`}>
        <span>{label}</span><span className={getTextColor(value)}>{value}%</span>
      </div>
    )}
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${isCompact ? 'h-1.5' : 'h-2'}`}>
      <div className={`h-full rounded-full transition-all duration-1000 ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

// ─── CIRCULAR PROGRESS (Light Theme) ───
const LightCircularProgress = ({ value, size = 100, label }) => {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const strokeColor = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444";
  
  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f3f4f6" strokeWidth="8" fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={strokeColor} strokeWidth="8" fill="none"
                strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" strokeLinecap="round" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
         <span className="text-2xl font-black text-gray-800 leading-none">{value}</span>
         {label && <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-wider">{label}</span>}
      </div>
    </div>
  );
};


// ─── PAGE 1: FIND TALENT DASHBOARD ─────────────────────────────────────────

const DashboardView = ({ onSelectCandidate }) => {
  const [filter, setFilter] = useState('All');
  const [sortConfig, setSortConfig] = useState({ key: 'matchScore', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState([]);

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') { direction = 'asc'; }
    setSortConfig({ key, direction });
  };

  const sortedCandidates = useMemo(() => {
    let sortable = [...EXTENDED_MOCK];
    if (filter === 'Verified') sortable = sortable.filter(c => c.verified);
    if (filter === 'Hidden Gems') sortable = sortable.filter(c => c.hiddenGem);
    if (filter === 'Flagged/Risky') sortable = sortable.filter(c => c.risk);
    
    sortable.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortable;
  }, [filter, sortConfig]);

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 h-full">
      
      {/* Top AI Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {[
          { title: "Total Matches Processed", value: "1,246", trend: "text-blue-600", bg: "bg-blue-50" },
          { title: "Top Verified Candidates", value: "318", trend: "text-green-600", bg: "bg-green-50" },
          { title: "Hidden Gems Detected", value: "42 🔥", trend: "text-amber-600", bg: "bg-amber-50" },
          { title: "Low Trust Profiles Filtered", value: "134 🚩", trend: "text-red-600", bg: "bg-red-50" }
        ].map((stat, i) => (
          <div key={i} className={`p-5 rounded-2xl border border-gray-200 bg-white flex flex-col justify-between shadow-sm relative overflow-hidden group`}> 
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{stat.title}</p>
            <p className={`text-3xl font-black mt-2 text-gray-900 group-hover:scale-105 transition-transform origin-left`}>{stat.value}</p>
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${stat.bg} rounded-full opacity-50 pointer-events-none mix-blend-multiply`} />
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Sidebar Filters */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col h-full bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sticky top-6">
           <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest flex items-center gap-2">
              <Filter size={14}/> Segmentation
           </h3>
           <div className="space-y-1.5 flex-1">
             {['All Candidates', 'Verified', 'Hidden Gems', 'Flagged/Risky'].map((f) => (
               <button 
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-between ${
                   filter === f ? 'bg-green-50 border border-green-200 text-green-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                 }`}
               >
                 {f}
                 {filter === f && <CheckCircle2 size={14} />}
               </button>
             ))}
           </div>

           <div className="mt-auto pt-6 border-t border-gray-100">
             <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Min Trust Score Threshold</p>
             <input type="range" className="w-full accent-green-600" min="0" max="100" defaultValue="70"/>
             <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1"><span>Strict (90+)</span><span>Loose (50+)</span></div>
           </div>
        </div>

        {/* Center High-Density Grid (Table-like) */}
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden relative">
           
           {/* Sticky Header Row */}
           <div className="sticky top-0 bg-gray-50 border-b border-gray-200 grid grid-cols-[40px_minmax(180px,1fr)_80px_100px_150px_minmax(200px,2fr)_150px_140px] items-center px-4 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest z-20">
              <div className="justify-center flex"><Square size={14} className="text-gray-300"/></div>
              <div>Candidate Profile</div>
              <div className="cursor-pointer flex items-center gap-1 group hover:text-gray-800" onClick={() => handleSort('matchScore')}>Match <ArrowDownUp size={10} className="opacity-50 group-hover:opacity-100"/></div>
              <div className="cursor-pointer flex items-center gap-1 group hover:text-gray-800" onClick={() => handleSort('trustScore')}>Trust <ArrowDownUp size={10} className="opacity-50 group-hover:opacity-100"/></div>
              <div>Top Skiils Match</div>
              <div>AI Reasoning (Explainability)</div>
              <div>Confidence & Tags</div>
              <div className="text-right">Actions</div>
           </div>

           {/* Infinite Scroll Container */}
           <div className="flex-1 overflow-y-auto w-full">
             {sortedCandidates.map(candidate => {
               const isSelected = selectedIds.includes(candidate.id);
               return (
                <div 
                  key={candidate.id}
                  onClick={() => onSelectCandidate(candidate)}
                  className={`grid grid-cols-[40px_minmax(180px,1fr)_80px_100px_150px_minmax(200px,2fr)_150px_140px] items-center px-4 py-3 border-b border-gray-100 transition-all cursor-pointer group hover:bg-green-50/50 hover:scale-[1.002] hover:border hover:border-green-300 hover:shadow-md relative z-10 ${isSelected ? 'bg-green-50/50' : 'bg-white'}`}
                >
                  
                  {/* Select Checkbox */}
                  <div className="justify-center flex" onClick={(e) => toggleSelect(candidate.id, e)}>
                     {isSelected ? <CheckSquare size={16} className="text-green-600"/> : <Square size={16} className="text-gray-300 hover:text-green-500"/>}
                  </div>

                  {/* Profile */}
                  <div className="flex gap-3 items-center min-w-0 pr-4">
                     <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-green-600 to-emerald-400 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                       {candidate.avatar}
                     </div>
                     <div className="truncate">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{candidate.name}</h3>
                        <p className="text-[10px] font-semibold text-gray-500 truncate">{candidate.role}</p>
                     </div>
                  </div>

                  {/* Match Score */}
                  <div>
                    <span className={`text-xl font-black ${getTextColor(candidate.matchScore)}`}>{candidate.matchScore}%</span>
                  </div>

                  {/* Trust Score */}
                  <div className="pr-4 mt-1">
                    <div className="flex justify-between items-baseline mb-0.5">
                       <span className="text-xs font-bold text-gray-800">{candidate.trustScore}</span>
                       <span className="text-[9px] text-gray-400 font-bold">/100</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full mt-1">
                       <div className={`h-full rounded-full ${candidate.trustScore >= 80 ? 'bg-green-500' : candidate.trustScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${candidate.trustScore}%`}}/>
                    </div>
                  </div>

                  {/* Verified Skills (Compact) */}
                  <div className="pr-4 flex flex-col gap-1.5 mt-1">
                     {candidate.skills.slice(0, 2).map((s, i) => (
                       <LightProgressBar key={i} value={s.score} label={s.name} isCompact />
                     ))}
                  </div>

                  {/* AI Insights (Explainability) */}
                  <div className="pr-4 flex flex-col justify-center">
                     <p className="text-xs font-semibold text-gray-700 leading-tight line-clamp-2">
                       "{candidate.aiInsights}"
                     </p>
                     {candidate.missingSkills.length > 0 && (
                       <p className="text-[10px] text-red-500 font-bold mt-1">⚠️ Missing: {candidate.missingSkills[0]}</p>
                     )}
                  </div>

                  {/* Tags & Confidence */}
                  <div className="flex flex-col gap-1.5 items-start justify-center">
                     <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${candidate.confidence === 'High' ? 'bg-green-50 text-green-700 border-green-200' : candidate.confidence === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        <Brain size={10}/> AI Conf: {candidate.confidence}
                     </span>
                     <div className="flex gap-1 flex-wrap">
                       {candidate.verified && <span className="w-5 h-5 rounded flex items-center justify-center bg-emerald-100 text-emerald-600 border border-emerald-200" title="Verified"><CheckCircle2 size={12}/></span>}
                       {candidate.hiddenGem && <span className="w-5 h-5 rounded flex items-center justify-center bg-orange-100 text-orange-500 border border-orange-200" title="Hidden Gem">🔥</span>}
                       {candidate.risk && <span className="w-5 h-5 rounded flex items-center justify-center bg-red-100 text-red-500 border border-red-200" title="Risk Alert"><AlertTriangle size={12}/></span>}
                     </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <button className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0" onClick={e => e.stopPropagation()}>Invite</button>
                    <button className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0" onClick={e => e.stopPropagation()}>Test</button>
                  </div>

                </div>
               )
             })}
           </div>
        </div>

      </div>

    </div>
  );
};


// ─── PAGE 2: CANDIDATE DETAIL VIEW (Light Theme) ───────────────────────────

const DetailView = ({ candidate, onBack }) => {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 ease-out h-full overflow-y-auto pb-10">
      
      {/* Header Panel */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 shadow-sm relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-50 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 w-full">
           <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-400 border border-green-500 flex items-center justify-center text-3xl text-white font-black shadow-lg relative group">
              {candidate.avatar}
              {candidate.verified && <div className="absolute -bottom-2 -right-2 bg-white text-green-600 rounded-full p-0.5 border border-gray-200 shadow"><CheckCircle2 size={18}/></div>}
           </div>

           <div className="text-center md:text-left flex-1">
             <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
               <h1 className="text-3xl font-black text-gray-900 tracking-tight">{candidate.name}</h1>
               <span className="px-2.5 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-600 uppercase tracking-widest">{candidate.role}</span>
             </div>
             
             <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-4">
                {candidate.hiddenGem && <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-600 border border-orange-200">🔥 Hidden Gem</span>}
                {candidate.verified && <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-50 text-green-700 border border-green-200">🟢 Verified</span>}
                {candidate.risk && <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-50 text-red-600 border border-red-200">⚠️ Resume Inflation</span>}
             </div>
           </div>

           <div className="flex gap-4 items-stretch shrink-0 mt-4 md:mt-0">
             <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center min-w-[150px] shadow-sm flex flex-col justify-center relative">
               <div className="bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap mb-2 inline-block mx-auto">
                 Conf: {candidate.confidenceScore}% ({candidate.confidence})
               </div>
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Match Score</p>
               <p className="text-4xl font-black text-green-600">{candidate.matchScore}<span className="text-xl">%</span></p>
             </div>
             <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center min-w-[150px] shadow-sm flex flex-col justify-center">
               <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Trust Score</p>
               <p className={`text-4xl font-black ${candidate.trustScore >= 70 ? 'text-blue-600' : 'text-amber-600'}`}>{candidate.trustScore}<span className="text-xl text-gray-400">/100</span></p>
             </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Col: Skills & Matching Logic */}
        <div className="xl:col-span-2 space-y-6">
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
               <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-5 flex items-center gap-2 border-b border-gray-100 pb-3"><Terminal size={16} className="text-gray-400"/> Verified Skills</h3>
               <div className="space-y-4">
                 {candidate.skills.map(s => (
                   <LightProgressBar key={s.name} label={s.name} value={s.score} />
                 ))}
               </div>
             </div>

             <div className="bg-green-50 border border-green-200 rounded-2xl p-6 shadow-sm flex flex-col">
               <h3 className="text-sm font-black text-green-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Brain size={16} className="text-green-600"/> Match Explanation</h3>
               <div className="space-y-2.5 flex-1 border-b border-green-200/50 pb-4 mb-4">
                 {candidate.whyCandidate.map((reason, i) => (
                   <div key={i} className="flex gap-3 bg-white p-2.5 rounded-xl border border-green-100 shadow-sm">
                     <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
                     <p className="text-sm text-gray-700 font-medium leading-snug">{reason}</p>
                   </div>
                 ))}
               </div>
               <div>
                  <h4 className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-3">AI Match Breakdown</h4>
                  <div className="space-y-2">
                     <LightProgressBar value={candidate.matchBreakdown.skill} label="Technical Skill Fit" isCompact />
                     <LightProgressBar value={candidate.matchBreakdown.experience} label="Experience Level Fit" isCompact />
                     <LightProgressBar value={candidate.matchBreakdown.behavior} label="Behavioral & Cultural Match" isCompact />
                  </div>
               </div>
             </div>
           </div>

           {/* VERY IMPORTANT: SKILL GAP & PREDICTION */}
           <div className="bg-white border-l-4 border-l-blue-500 border border-gray-200 rounded-2xl p-6 relative group shadow-sm flex flex-col md:flex-row gap-8 items-stretch">
             <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none rounded-r-2xl" />
             
             <div className="flex-1 relative z-10 w-full">
               <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Target size={16}/> Skill Gap Intelligence
               </h3>
               
               {candidate.missingSkills.length > 0 ? (
                 <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-200">
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Missing Required Skills</p>
                   <ul className="list-disc list-inside text-sm text-gray-800 font-medium mb-2 space-y-1">
                     {candidate.missingSkills.map(skill => (
                        <li key={skill} className="text-red-600">{skill}</li>
                     ))}
                   </ul>
                 </div>
               ) : (
                 <div className="mb-4 bg-green-50 rounded-xl p-3 border border-green-200">
                   <p className="text-xs font-bold text-green-700 flex items-center gap-2">
                     <CheckCircle2 size={14}/> No critical skills missing from profile.
                   </p>
                 </div>
               )}
               
               <div>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-1">Suggested Remediation Path</p>
                  <p className="text-sm font-bold text-gray-900 leading-snug">{candidate.improvementPath}</p>
               </div>
             </div>
             
             {/* Impact Graphic & AI Risk */}
             <div className="shrink-0 w-full md:w-64 flex flex-col gap-4">
                 
                 <div className="bg-white border border-gray-200 flex flex-col p-4 rounded-xl shadow-sm relative z-10 flex-1 justify-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center mb-4">Score Evolution</p>
                    <div className="flex items-center justify-between px-2">
                      <div className="text-center">
                        <p className="text-2xl font-black text-gray-800">{candidate.matchScore}%</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Current</p>
                      </div>
                      <div className="flex flex-col items-center mx-2">
                         <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mb-1">+{92 - candidate.matchScore}%</span>
                         <ArrowLeft className="rotate-180 text-blue-500" size={16}/>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-green-600">92%</p>
                        <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mt-1">Predicted</p>
                      </div>
                    </div>
                 </div>

                 <div className={`border rounded-xl p-4 shadow-sm flex-1 flex flex-col justify-center ${candidate.risk ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Zap size={14}/> AI Risk Signals
                    </p>
                    {candidate.risk ? (
                       <p className="text-sm text-red-700 font-bold leading-tight">
                         ⚠ {candidate.trustNote.split(':')[1] || 'Minor skill mismatch detected'}
                       </p>
                    ) : (
                       <p className="text-sm text-green-700 font-bold leading-tight">
                         ✓ No major risks or anomalies detected.
                       </p>
                    )}
                 </div>

             </div>
           </div>

        </div>

        {/* Right Col: Trust & Activity */}
        <div className="space-y-6">
           
           {/* Trust Score Breakdown */}
           <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Trust Interpretation Engine</h3>
              
              <div className="flex justify-center mb-6">
                 <LightCircularProgress value={candidate.trustScore} size={140} label="Trust Score" />
              </div>

              <div className="space-y-3 text-left">
                <LightProgressBar value={candidate.trustBreakdown.test} label="Skill Tests Alignment" />
                <LightProgressBar value={candidate.trustBreakdown.projects} label="Project Authenticity" />
                <LightProgressBar value={candidate.trustBreakdown.github} label="GitHub Activity Level" />
                <LightProgressBar value={candidate.trustBreakdown.resume} label="Resume Authenticity" />
              </div>

              <div className={`mt-6 pt-4 border-t text-left p-4 rounded-xl border ${candidate.trustScore >= 80 ? 'bg-green-50 border-green-200' : candidate.trustScore >= 60 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                 <span className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 ${candidate.trustScore >= 80 ? 'text-green-700' : candidate.trustScore >= 60 ? 'text-blue-700' : 'text-red-700'}`}>
                    Human Translation
                 </span>
                 <p className="text-sm font-semibold text-gray-800 leading-snug">
                   "{candidate.trustNote}"
                 </p>
              </div>
           </div>
           
           {/* Activity Timeline */}
           <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size={14}/> Behavioral Timeline</h3>
              <div className="space-y-5 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200">
                 
                 {candidate.timeline.map((item, i) => (
                   <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                     <div className="flex items-center justify-center w-5 h-5 rounded-full border-[3px] border-white bg-green-500 shadow-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                     <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-xl border border-gray-100 bg-gray-50 shadow-sm">
                       <div className="flex items-center justify-between space-x-2 mb-1">
                         <div className="font-bold text-gray-800 text-xs">{item.event}</div>
                       </div>
                       <div className="flex justify-between items-end">
                         <div className="text-gray-400 text-[10px] font-bold uppercase">{item.time}</div>
                         {item.score && <div className="text-green-700 text-[10px] font-black bg-green-100 px-2 py-0.5 rounded">{item.score}</div>}
                       </div>
                     </div>
                   </div>
                 ))}
                 
              </div>
           </div>

        </div>
      </div>

      {/* Floating Action footer */}
      <div className="sticky bottom-4 z-50 bg-white border border-gray-200 rounded-b-2xl shadow-xl mt-auto overflow-hidden">
         <div className="px-6 py-3 bg-gray-900 text-white flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Final System Verdict</span>
            <span className="text-sm font-semibold flex items-center gap-2">
               {candidate.matchScore >= 85 ? (
                 <><CheckCircle2 size={16} className="text-green-400"/> Recommendation: Strong Hire for {candidate.role}</>
               ) : candidate.matchScore >= 70 ? (
                 <><Target size={16} className="text-blue-400"/> Recommendation: Test Further for Gap Suitability</>
               ) : (
                 <><AlertTriangle size={16} className="text-red-400"/> Recommendation: High Risk. Proceed with caution.</>
               )}
            </span>
         </div>
         <div className="p-4 flex items-center justify-between">
           <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-bold">
             <ArrowLeft size={16}/> Back to Candidate List
           </button>
           <div className="flex gap-3">
             <button className="px-5 py-2.5 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Send Test</button>
             <button className="px-5 py-2.5 rounded-xl text-xs font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Schedule Interview</button>
             <button className="px-6 py-2.5 rounded-xl text-sm font-black bg-green-600 hover:bg-green-700 text-white shadow-[0_4px_14px_0_rgba(22,163,74,0.39)] transition-transform hover:scale-[1.02]">Shortlist Candidate</button>
           </div>
         </div>
      </div>

    </div>
  );
};


// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function FindTalentDashboard() {
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  return (
    <div className="h-[calc(100vh-60px)] bg-gray-50 p-6 lg:p-8 font-sans flex flex-col">
      
      <div className="mb-6 border-b border-gray-200 pb-4 flex items-end justify-between shrink-0">
         <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              Find Talent: AI Grid <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-lg uppercase tracking-widest mt-1 ml-2">Beta</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">High-density intelligence view for rapid candidate verification and filtering.</p>
         </div>
         {selectedCandidate && (
             <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Scanning Deep Profile
             </div>
         )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-10">
        {selectedCandidate ? (
          <DetailView candidate={selectedCandidate} onBack={() => setSelectedCandidate(null)}/>
        ) : (
          <DashboardView onSelectCandidate={setSelectedCandidate}/>
        )}
      </div>

    </div>
  );
}

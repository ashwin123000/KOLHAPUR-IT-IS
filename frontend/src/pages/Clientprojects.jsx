import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Plus, CheckCircle2, XCircle, Clock, DollarSign, Star,
  Briefcase, AlertCircle, Search, ChevronDown, LayoutGrid,
  Archive, Users, Shield,
  ChevronLeft, CheckSquare, Square
} from 'lucide-react';
import { projectsAPI, applyAPI, ratingsAPI } from '../services/api';
import ProNavbar from '../components/ProNavbar';

/* ─── Dummy AI enrichment data ──────────────────────────────── */
const DUMMY_APPLICANTS = [
  { name: 'Aarav Sharma',   tagline: 'Python Dev',        exp: '1+ year',  ai: 87, gaps: ['Docker','System Design'], status: 'Under Review', risk: 'Low',    avatar: 'AS', skills: 'Python, ML, FastAPI' },
  { name: 'Remala Sharma',  tagline: 'Graphic Designer',  exp: '2+ year',  ai: 72, gaps: ['Figma Adv'],             status: 'Shortlisted',  risk: 'Low',    avatar: 'RS', skills: 'Figma, Adobe XD' },
  { name: 'Akira Rivi',     tagline: 'Content Writer',    exp: '2+ year',  ai: 72, gaps: [],                        status: 'Shortlisted',  risk: 'Low',    avatar: 'AR', skills: 'Copywriting, SEO' },
  { name: 'Asrar Sharma',   tagline: 'Content Writer',    exp: '1+ year',  ai: 55, gaps: ['Docker'],                status: 'Contacted',    risk: 'Medium', avatar: 'AS', skills: 'Technical Writing' },
  { name: 'Aziz Akhtar',    tagline: 'Graphic Designer',  exp: '2+ year',  ai: 55, gaps: ['Vc-516'],               status: 'Contacted',    risk: 'Medium', avatar: 'AA', skills: 'Illustrator, Sketch' },
  { name: 'Arav Sharma',    tagline: 'Python Dev',        exp: '2+ year',  ai: 55, gaps: ['Docker'],               status: 'Contacted',    risk: 'Medium', avatar: 'AS', skills: 'Python, Django' },
  { name: 'Maria Chen',     tagline: 'React Developer',   exp: '3+ years', ai: 91, gaps: [],                        status: 'Shortlisted',  risk: 'Low',    avatar: 'MC', skills: 'React, TypeScript, Node' },
  { name: 'James Okafor',   tagline: 'UX/UI Designer',   exp: '2+ year',  ai: 68, gaps: ['Prototyping'],           status: 'Under Review', risk: 'Low',    avatar: 'JO', skills: 'Figma, UX Research' },
  { name: 'Priya Nair',     tagline: 'Data Analyst',     exp: '1+ year',  ai: 80, gaps: ['Tableau'],              status: 'Shortlisted',  risk: 'Low',    avatar: 'PN', skills: 'Python, SQL, Power BI' },
  { name: 'Leo Fernandez',  tagline: 'SEO Specialist',   exp: '2+ year',  ai: 63, gaps: ['Ahrefs'],               status: 'Contacted',    risk: 'Medium', avatar: 'LF', skills: 'SEO, Google Ads' },
];

const SKILL_GAPS_SUMMARY = [
  { skill: 'Kubernetes', pct: 67 },
  { skill: 'React',      pct: 48 },
  { skill: 'Docker',     pct: 35 },
  { skill: 'Figma Adv',  pct: 22 },
];

const TYPE_OPTIONS = ['Full-time', 'Contract', 'Internship', 'Part-time'];

/* ─── Helpers ───────────────────────────────────────────────── */
const aiColor = (score) => {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#f59e0b';
  return '#ef4444';
};

const statusStyle = (s) => {
  const m = {
    'Shortlisted':  'bg-green-100 text-green-700',
    'Under Review': 'bg-blue-100 text-blue-700',
    'Contacted':    'bg-purple-100 text-purple-700',
    'Rejected':     'bg-red-100 text-red-600',
  };
  return m[s] || 'bg-gray-100 text-gray-600';
};

/* ─── Circular Score ─────────────────────────────────────────── */
function CircleScore({ score, size = 70 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = aiColor(score);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: 16, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin:'center' }}>
        {score}
      </text>
    </svg>
  );
}

/* ─── Create Project Modal ───────────────────────────────────── */
function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', budget: '', deadline: '', requiredSkills: '', difficultyLevel: 2 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const clientId = localStorage.getItem('userId');
      const res = await projectsAPI.create({ ...form, budget: parseFloat(form.budget), requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean), clientId });
      onCreated(res.data?.data);
      onClose();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create project'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20}/></button>
        <h2 className="text-xl font-bold mb-1 text-gray-900">Post a New Project</h2>
        <p className="text-sm text-gray-500 mb-6">Visible to all freelancers on the platform</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Project Title" onChange={e => set('title', e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"/>
          <textarea placeholder="Description" rows={3} onChange={e => set('description', e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"/>
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" placeholder="Budget ($)" onChange={e => set('budget', e.target.value)}
              className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"/>
            <input type="date" onChange={e => set('deadline', e.target.value)}
              className="p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"/>
          </div>
          <input placeholder="Required Skills (comma separated)" onChange={e => set('requiredSkills', e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"/>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition-colors">
            {loading ? 'Posting…' : 'Post Project'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Rating Modal ───────────────────────────────────────────── */
function RatingModal({ project, onClose, onRated }) {
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [onTime, setOnTime] = useState('ON_TIME');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const freelancerIdToSend = project.hiredFreelancerId || project.assignedFreelancerId || project.assigned_freelancer_id;
      if (!freelancerIdToSend) throw new Error('Freelancer ID missing');
      await ratingsAPI.create({ projectId: project.projectId || project.id, freelancerId: freelancerIdToSend, stars, feedback, onTimeStatus: onTime });
      onRated(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit rating');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-7 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"><X size={20}/></button>
        <h2 className="text-xl font-bold mb-1">Rate Freelancer</h2>
        <p className="text-sm text-gray-500 mb-6">How was your experience on "{project.title}"?</p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setStars(n)} className={`p-1 transition-all ${stars >= n ? 'text-amber-400' : 'text-gray-200'}`}>
                  <Star size={30} fill={stars >= n ? 'currentColor' : 'none'}/>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            {['ON_TIME','LATE'].map(opt => (
              <button key={opt} type="button" onClick={() => setOnTime(opt)}
                className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${onTime === opt ? (opt === 'ON_TIME' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700') : 'bg-white border-gray-200 text-gray-500'}`}>
                {opt === 'ON_TIME' ? 'On Time' : 'Late / Delayed'}
              </button>
            ))}
          </div>
          <textarea required rows={3} placeholder="Feedback…" value={feedback} onChange={e => setFeedback(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"/>
          {error && <p className="text-red-500 text-xs italic">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-all">
            {loading ? 'Submitting…' : 'Complete & Rate'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Candidate Row ──────────────────────────────────────────── */
function CandidateRow({ app, dummy, onHire, onReject, hiring, rejecting, selected, onSelect, isHired }) {
  const [expanded, setExpanded] = useState(false);
  const score = dummy?.ai ?? 70;

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className={`border-b border-gray-100 cursor-pointer transition-colors ${expanded ? 'bg-green-50' : 'hover:bg-gray-50'}`}
      >
        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
          <button onClick={() => onSelect(app.applicationId)}
            className="text-gray-400 hover:text-green-600">
            {selected ? <CheckSquare size={16} className="text-green-600"/> : <Square size={16}/>}
          </button>
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {dummy?.avatar || (app.freelancerName || 'F').slice(0,2).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm leading-tight">{dummy?.name || app.freelancerName}</p>
              <p className="text-xs text-gray-400">{dummy?.name || app.freelancerName}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-3">
          <p className="text-sm font-medium text-gray-800">{dummy?.tagline || 'Developer'}</p>
          {dummy?.gaps?.length > 0 && (
            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Minimal Gaps</span>
          )}
        </td>
        <td className="px-3 py-3 text-sm text-gray-600">{dummy?.exp || '1+ year'}</td>
        <td className="px-3 py-3">
          <span className="font-bold text-sm" style={{ color: aiColor(score) }}>{score}</span>
        </td>
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-1">
            {(dummy?.gaps || []).slice(0,2).map(g => (
              <span key={g} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">{g}</span>
            ))}
            {(dummy?.gaps || []).length === 0 && <span className="text-xs text-green-600">✓ Strong Match</span>}
          </div>
        </td>
        <td className="px-3 py-3">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle(isHired ? 'Shortlisted' : (app.status === 'rejected' ? 'Rejected' : dummy?.status || 'Under Review'))}`}>
            {isHired ? 'Hired ✓' : app.status === 'rejected' ? 'Rejected' : dummy?.status || 'Under Review'}
          </span>
        </td>
        <td className="px-3 py-3">
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
            {!isHired && app.status !== 'rejected' && (
              <>
                <button onClick={() => onHire(app)} disabled={hiring}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {hiring ? '…' : 'Hire'}
                </button>
                <button onClick={() => onReject(app)} disabled={rejecting}
                  className="text-xs border border-gray-200 hover:bg-red-50 hover:border-red-300 text-gray-600 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50">
                  {rejecting ? '…' : 'Skip'}
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-green-50 border-b border-green-100">
          <td colSpan={8} className="px-6 py-4">
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">AI Insights</p>
                <ul className="space-y-1">
                  <li className="text-sm text-green-700 flex items-center gap-1"><CheckCircle2 size={13}/> Strong {dummy?.tagline || 'skill'} match</li>
                  <li className="text-sm text-green-700 flex items-center gap-1"><CheckCircle2 size={13}/> Relevant ML Experience</li>
                  <li className="text-sm text-amber-600 flex items-center gap-1"><AlertCircle size={13}/> Communication clarity could be improved</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Skill Gaps</p>
                <div className="flex gap-2 flex-wrap">
                  {(dummy?.gaps || ['None identified']).map(g => (
                    <span key={g} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg">{g}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Risk Level</p>
                <span className={`text-sm font-semibold ${dummy?.risk === 'Low' ? 'text-green-600' : 'text-amber-600'}`}>
                  {dummy?.risk || 'Low'}
                </span>
                {dummy?.risk === 'Medium' && (
                  <p className="text-xs text-gray-500 mt-1">Similar resume detected across profiles.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              {!isHired && app.status !== 'rejected' && (
                <>
                  <button onClick={() => onHire(app)} className="bg-green-600 text-white text-sm px-5 py-2 rounded-lg font-semibold hover:bg-green-700">Shortlist</button>
                  <button className="border border-gray-300 text-gray-700 text-sm px-5 py-2 rounded-lg hover:bg-gray-50">Auto-Shortlist Top 10</button>
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Applications View (Image 2) ───────────────────────────── */
function ApplicationsView({ project, applications, onBack, onHire, onReject, hiringId, rejectingId, actionMsg, hiredFreelancerId, onCompleteClick }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const pending = applications.filter(a => a.status === 'pending');
  const avgScore = Math.round(DUMMY_APPLICANTS.slice(0, applications.length || 5).reduce((s, a) => s + a.ai, 0) / Math.max(applications.length, 5));

  const toggleSelect = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const enriched = applications.map((app, i) => ({
    app,
    dummy: DUMMY_APPLICANTS[i % DUMMY_APPLICANTS.length],
  }));

  return (
    <div className="flex gap-4 h-full">
      {/* Main Table */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3 transition-colors">
            <ChevronLeft size={16}/> Back to Active Projects
          </button>
          <h2 className="text-xl font-bold text-gray-900">fiverr Intern Pro: AI-Powered Intelligent Hiring Platform</h2>
          <p className="text-sm text-gray-500 mt-0.5">Automate hiring decisions with AI scoring, skill gap analysis, and fraud detection.</p>
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-gray-200">
              AI re-ranking <ChevronDown size={13}/>
            </div>
            <div className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:bg-gray-200">
              Stastics <ChevronDown size={13}/>
            </div>
            {(project.status === 'in_progress' || project.status === 'submitted') && (
              <button onClick={onCompleteClick}
                className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1">
                <CheckCircle2 size={14}/> Complete Project
              </button>
            )}
          </div>
          {actionMsg && (
            <p className={`mt-3 text-sm font-medium px-3 py-2 rounded-lg ${actionMsg.startsWith('✅') || actionMsg.startsWith('🎉') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
              {actionMsg}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-auto flex-1">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">APPLICATIONS RECEIVED:</span>
            <span className="text-sm font-bold text-gray-900">{applications.length || '1,002'}</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-3 w-8"></th>
                <th className="px-3 py-3">Candidate</th>
                <th className="px-3 py-3">Headline / Skill Tagline</th>
                <th className="px-3 py-3">Experience level</th>
                <th className="px-3 py-3">AI Score</th>
                <th className="px-3 py-3">Skill Gaps</th>
                <th className="px-3 py-3">Current Status</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 ? (
                /* Show dummy rows if no real apps yet */
                DUMMY_APPLICANTS.map((dummy, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-3 py-3"><Square size={16} className="text-gray-300"/></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">{dummy.avatar}</div>
                        <div><p className="font-semibold text-gray-900 text-sm">{dummy.name}</p><p className="text-xs text-gray-400">{dummy.name}</p></div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><p className="text-sm text-gray-800">{dummy.tagline}</p>{dummy.gaps.length > 0 && <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">Minimal Gaps</span>}</td>
                    <td className="px-3 py-3 text-sm text-gray-600">{dummy.exp}</td>
                    <td className="px-3 py-3"><span className="font-bold text-sm" style={{ color: aiColor(dummy.ai) }}>{dummy.ai}</span></td>
                    <td className="px-3 py-3">{dummy.gaps.length > 0 ? dummy.gaps.map(g => <span key={g} className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full mr-1">{g}</span>) : <span className="text-xs text-green-600">✓ Strong</span>}</td>
                    <td className="px-3 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusStyle(dummy.status)}`}>{dummy.status}</span></td>
                    <td className="px-3 py-3 text-xs text-gray-400 italic">Preview</td>
                  </tr>
                ))
              ) : (
                enriched.map(({ app, dummy }) => (
                  <CandidateRow
                    key={app.applicationId}
                    app={app}
                    dummy={dummy}
                    isHired={app.freelancerId === hiredFreelancerId || app.status === 'accepted'}
                    onHire={onHire}
                    onReject={onReject}
                    hiring={hiringId === app.applicationId}
                    rejecting={rejectingId === app.applicationId}
                    selected={selectedIds.includes(app.applicationId)}
                    onSelect={toggleSelect}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Analytics Panel */}
      <div className="w-64 shrink-0 space-y-4">
        {/* Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Analytics & Insights</p>
          <div className="flex flex-col items-center gap-2">
            <CircleScore score={avgScore || 78} size={90}/>
            <p className="text-xs text-gray-500 text-center">Average Candidate Score</p>
          </div>
          <div className="mt-4 flex gap-1 items-end justify-center">
            {[40,65,50,80,72,88,60].map((h, i) => (
              <div key={i} className="w-5 rounded-sm" style={{ height: h * 0.5, background: i === 5 ? '#22c55e' : '#d1fae5' }}/>
            ))}
          </div>
        </div>

        {/* Skill Gaps */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top Skills Missing</p>
          <div className="space-y-2">
            {SKILL_GAPS_SUMMARY.map(({ skill, pct }) => (
              <div key={skill}>
                <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                  <span>{skill}</span><span className="font-semibold">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fraud */}
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fraud & Risk Detection</p>
          <div className="flex items-start gap-2 bg-amber-50 rounded-lg p-3">
            <Shield size={16} className="text-amber-500 mt-0.5 shrink-0"/>
            <div>
              <p className="text-xs font-bold text-amber-700">⚠ Risk Medium</p>
              <p className="text-xs text-amber-600 mt-0.5">Automat Similar resume detected across 6 profiles.</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <button className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-semibold transition-colors">
            Shortlist
          </button>
          <button className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm py-2 rounded-lg font-medium transition-colors">
            Auto-Shortlist Top 10
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Project Card (Image 1) ─────────────────────────────────── */
function ProjectCard({ project, appCount, onView, type }) {
  const statusColor = { open: '#22c55e', in_progress: '#f59e0b', completed: '#6b7280', cancelled: '#ef4444' }[project.status] || '#6b7280';
  const statusLabel = { open: 'Open for Applications', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' }[project.status] || project.status;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all hover:border-gray-300 flex flex-col">
      <h3 className="font-bold text-gray-900 text-base leading-snug mb-3">{project.title}</h3>
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }}/>
        <span className="text-xs font-medium" style={{ color: statusColor }}>{statusLabel}</span>
      </div>
      <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">{appCount.toLocaleString()}</span> Applications</p>
      <p className="text-xs text-gray-400 mb-1">Posted on Apr{' '}{Math.floor(Math.random() * 10 + 10)}, 2025</p>
      {project.budget && (
        <p className="text-xs text-gray-400 mb-4">${project.budget} budget</p>
      )}
      <div className="mt-auto">
        <button
          onClick={() => onView(project)}
          className="w-full border border-gray-300 hover:border-green-500 hover:text-green-700 text-gray-700 text-sm py-2.5 rounded-lg font-medium transition-all hover:bg-green-50"
        >
          View Applications
        </button>
      </div>
    </div>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────── */
function Sidebar({ activeTab, onTabChange, showCreate }) {
  const tabs = [
    { id: 'all',    label: 'All Applicants', icon: Users },
    { id: 'active', label: 'Active Projects', icon: LayoutGrid, dot: true },
    { id: 'archive', label: 'Archive',        icon: Archive },
  ];

  return (
    <div className="w-52 shrink-0 flex flex-col gap-1 pr-2">
      {tabs.map(({ id, label, icon: Icon, dot }) => (
        <button key={id} onClick={() => onTabChange(id)}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeTab === id ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          <div className="relative">
            <Icon size={16}/>
            {dot && <div className="absolute -right-0.5 -top-0.5 w-1.5 h-1.5 bg-green-500 rounded-full"/>}
          </div>
          {label}
        </button>
      ))}

      <div className="mt-5 border-t border-gray-200 pt-4 space-y-3">
        {[
          { label: 'Skills',           opts: ['All Skills','Python','React','Design','Writing'] },
          { label: 'Location',         opts: ['All Location','Remote','On-site','Hybrid'] },
          { label: 'Assessment Score', opts: ['All','80+','60-80','Below 60'] },
        ].map(({ label, opts }) => (
          <div key={label}>
            <p className="text-xs text-gray-400 font-semibold mb-1">{label}</p>
            <select className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500">
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
const Clientprojects = () => {
  const navigate = useNavigate();
  const [projects,         setProjects]         = useState([]);
  const [applications,     setApplications]     = useState([]);
  const [selectedProject,  setSelectedProject]  = useState(null);
  const [viewMode,         setViewMode]         = useState('grid');   // 'grid' | 'apps'
  const [activeTab,        setActiveTab]        = useState('active');
  const [loadingProjects,  setLoadingProjects]  = useState(true);
  const [loadingApps,      setLoadingApps]      = useState(false);
  const [showCreate,       setShowCreate]       = useState(false);
  const [hiringId,         setHiringId]         = useState(null);
  const [rejectingId,      setRejectingId]      = useState(null);
  const [actionMsg,        setActionMsg]        = useState('');
  const [ratingProject,    setRatingProject]    = useState(null);
  const [search,           setSearch]           = useState('');
  const [appCounts,        setAppCounts]        = useState({});

  const clientId = localStorage.getItem('userId');
  const activeIdxRef = React.useRef(0);

  /* ── fetch applications ── */
  const fetchApplications = async (projectId, silent = false) => {
    if (!projectId) return;
    if (!silent) setLoadingApps(true);
    try {
      const res = await applyAPI.getApplications(projectId);
      const raw = res.data?.data || [];
      const mapped = raw.map(a => {
        const isArr = Array.isArray(a);
        return {
          applicationId:  isArr ? a[0] : (a.applicationId || a.id),
          projectId:      isArr ? a[1] : (a.projectId || a.project_id),
          freelancerId:   isArr ? a[2] : (a.freelancerId || a.freelancer_id),
          status:         isArr ? a[3] : a.status,
          coverLetter:    isArr ? a[4] : a.cover_letter,
          bidAmount:      isArr ? a[5] : (a.bidAmount || a.bid_amount),
          freelancerName: `Freelancer ${isArr ? a[2]?.slice(-4) : ''}`,
        };
      });
      setApplications(mapped);
      setAppCounts(c => ({ ...c, [projectId]: mapped.length }));
    } catch { setApplications([]); }
    finally { if (!silent) setLoadingApps(false); }
  };

  /* ── fetch projects ── */
  const fetchProjects = useCallback(async (silent = false) => {
    if (!clientId) return;
    if (!silent) setLoadingProjects(true);
    try {
      const res  = await projectsAPI.getForClient(clientId);
      const raw  = res.data?.data || [];
      const norm = raw.map(p => {
        const isArr = Array.isArray(p);
        return {
          id:                  isArr ? p[0] : (p.id || p.projectId),
          title:               isArr ? p[2] : p.title,
          description:         isArr ? p[3] : p.description,
          budget:              isArr ? p[4] : p.budget,
          status:              isArr ? p[5] : p.status,
          hiredFreelancerId:   isArr ? p[6] : (p.assignedFreelancerId || p.hiredFreelancerId),
        };
      });
      setProjects(norm);
      // pre-fetch app counts
      norm.forEach(p => fetchApplications(p.id, true));
    } catch { setProjects([]); }
    finally { if (!silent) setLoadingProjects(false); }
  }, [clientId]);

  useEffect(() => {
    fetchProjects();
    const poll = setInterval(() => fetchProjects(true), 8000);
    return () => clearInterval(poll);
  }, [fetchProjects]);

  /* ── open apps view ── */
  const openApplications = async (project) => {
    setSelectedProject(project);
    setViewMode('apps');
    setActionMsg('');
    await fetchApplications(project.id);
  };

  /* ── hire ── */
  const handleHire = async (app) => {
    setHiringId(app.applicationId); setActionMsg('');
    try {
      await applyAPI.hire({ applicationId: app.applicationId, projectId: app.projectId, freelancerId: app.freelancerId, clientId });
      setActionMsg('✅ Freelancer hired successfully!');
      await fetchApplications(app.projectId);
      fetchProjects();
    } catch { setActionMsg('❌ Failed to hire. Please try again.'); }
    finally { setHiringId(null); }
  };

  /* ── reject ── */
  const handleReject = async (app) => {
    setRejectingId(app.applicationId);
    setApplications(prev => prev.map(a => a.applicationId === app.applicationId ? { ...a, status: 'rejected' } : a));
    setActionMsg('Application skipped.');
    setRejectingId(null);
  };

  /* ── complete ── */
  const handleProjectCompleted = async () => {
    setRatingProject(null);
    await new Promise(r => setTimeout(r, 2000));
    await fetchProjects(false);
    setActionMsg('🎉 Project marked complete and rated!');
    window.dispatchEvent(new Event('ratingUpdated'));
  };

  /* ── filter ── */
  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.title?.toLowerCase().includes(q)) return false;
    if (activeTab === 'active')    return p.status !== 'completed' && p.status !== 'cancelled';
    if (activeTab === 'shortlist') return p.hiredFreelancerId;
    if (activeTab === 'archive')   return p.status === 'completed' || p.status === 'cancelled';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Modals */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => { if (!p) return; setProjects(prev => [{ ...p, id: p.id || p.projectId }, ...prev]); }}
        />
      )}
      {ratingProject && (
        <RatingModal project={ratingProject} onClose={() => setRatingProject(null)} onRated={handleProjectCompleted}/>
      )}

      <ProNavbar/>

      <div className="flex h-[calc(100vh-57px)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-gray-200 p-4 overflow-y-auto shrink-0">
          <Sidebar activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setViewMode('grid'); }} showCreate={showCreate}/>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {viewMode === 'grid' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-bold text-gray-900">Active Projects</h1>
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Select project to view applications</p>

              {loadingProjects ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="h-44 bg-gray-200 rounded-xl animate-pulse"/>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Briefcase size={48} className="mb-3 opacity-30"/>
                  <p className="text-lg font-semibold">No projects found</p>
                  <p className="text-sm mt-1">Post your first project to get started</p>
                  <button onClick={() => navigate('/create-project')}
                    className="mt-4 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700">
                    Post a Project
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((p, i) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      appCount={appCounts[p.id] ?? Math.floor(1000 + i * 34)}
                      type={TYPE_OPTIONS[i % TYPE_OPTIONS.length]}
                      onView={openApplications}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            loadingApps ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full"/>
              </div>
            ) : (
              <ApplicationsView
                project={selectedProject}
                applications={applications}
                onBack={() => { setViewMode('grid'); setSelectedProject(null); setActionMsg(''); }}
                onHire={handleHire}
                onReject={handleReject}
                hiringId={hiringId}
                rejectingId={rejectingId}
                actionMsg={actionMsg}
                hiredFreelancerId={selectedProject?.hiredFreelancerId}
                onCompleteClick={() => setRatingProject(selectedProject)}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default Clientprojects;
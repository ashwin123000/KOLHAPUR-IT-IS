import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronRight,
  Sparkles, Terminal, AlertCircle, Lightbulb, Send,
  MapPin, Clock, GraduationCap, Banknote, X
} from 'lucide-react';
import { mockJobs, userProfile, improvementSuggestions } from '../data/mockJobs';

/* ─── Animated Score Circle ──────────────────────────────────────────────────── */
function AnimatedScoreCircle({ targetScore, size = 140 }) {
  const [score, setScore] = useState(0);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;

  const color = score >= 80 ? '#22c55e' : score >= 65 ? '#f59e0b' : '#ef4444';
  const dash = (score / 100) * circ;

  useEffect(() => {
    let current = 0;
    const step = targetScore / 40;
    const timer = setInterval(() => {
      current += step;
      if (current >= targetScore) { setScore(targetScore); clearInterval(timer); }
      else setScore(Math.round(current));
    }, 40);
    return () => clearInterval(timer);
  }, [targetScore]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.05s ease' }}
        />
      </svg>
      <div className="relative z-10 text-center">
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-base font-bold" style={{ color }}>%</span>
      </div>
    </div>
  );
}

/* ─── Terminal Simulator ─────────────────────────────────────────────────────── */
function TerminalBox({ matchScore, jobTitle }) {
  const [lines, setLines] = useState([]);
  const endRef = useRef(null);

  useEffect(() => {
    // SEQUENCE must live INSIDE useEffect so it's captured correctly per render
    const SEQUENCE = [
      '> Parsing resume...',
      `> Detecting ${(jobTitle || '').split(' ')[0] || 'AI'} experience...`,
      '> Extracting skills...',
      '> Matching with JD...',
      '> Evaluating transformer usage...',
      `> Match Score: ${matchScore}%`,
    ];

    setLines([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < SEQUENCE.length) {
        const line = SEQUENCE[i]; // capture before incrementing
        i++;
        if (line !== undefined) {
          setLines(prev => [...prev, line]);
        }
      } else {
        clearInterval(interval);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [matchScore, jobTitle]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="bg-[#0d1117] rounded-xl border border-green-900/50 overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-green-900/30">
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-green-600/70 font-mono font-medium">ai-matcher.sh</span>
      </div>
      <div className="p-4 font-mono text-xs min-h-[130px] space-y-1">
        {lines.filter(Boolean).map((line, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${line.includes('Match Score') ? 'text-green-400 font-bold' : 'text-green-300/80'}`}
            style={{ animation: `fadeInLine 0.3s ease ${i * 0.05}s both` }}
          >
            {line.includes('Match Score') ? (
              <span className="text-green-500">✓</span>
            ) : (
              <span className="text-green-600/60">›</span>
            )}
            {line.replace('> ', '')}
            {i === lines.length - 1 && !line.includes('Match Score') && (
              <span className="inline-block w-1.5 h-3 bg-green-400 ml-0.5 animate-pulse" />
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/* ─── Submit Modal ───────────────────────────────────────────────────────────── */
function SubmitModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
          <X size={20} />
        </button>
        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-500/30">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Submission Successful! 🚀</h2>
        <p className="text-gray-600 text-sm mb-6 leading-relaxed">
          Your profile has been submitted with AI enhancements. Our system has automatically optimized your skills presentation and highlighted your strongest match points.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-left">
          <p className="text-xs font-bold text-green-800 mb-2">AI Applied Enhancements:</p>
          <div className="space-y-1">
            {['Skill gap auto-filled with project links', 'Resume score boosted to 91%', 'Portfolio highlights reordered by relevance'].map(e => (
              <div key={e} className="flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 size={11} /> {e}
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-600/20"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
}

/* ─── Apply Toast ────────────────────────────────────────────────────────────── */
function ApplyToast({ visible }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#111827] text-white px-5 py-3 rounded-xl shadow-2xl border border-green-500/40"
      style={{ animation: 'slideUp 0.3s ease' }}>
      <CheckCircle2 size={18} className="text-green-400" />
      <span className="text-sm font-medium">✅ Application Submitted!</span>
    </div>
  );
}

/* ─── Accordion Section ──────────────────────────────────────────────────────── */
function Accordion({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
            <Icon size={16} className="text-green-700" />
          </div>
          <span className="font-bold text-gray-900">{title}</span>
        </div>
        <ChevronRight size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-5 border-t border-gray-100 bg-gray-50/50">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─── Main Detail Component ──────────────────────────────────────────────────── */
export default function AIJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState(null);
  const [matchScore, setMatchScore] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(true);
  const [applied, setApplied] = useState(false);
  const [applyToast, setApplyToast] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // ── Load Job ──
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const found = mockJobs.find(j => String(j.id) === String(id));
      setJob(found || null);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [id]);

  // ── Generate AI Score after job loads ──
  useEffect(() => {
    if (!job) return;
    setScoreLoading(true);
    setMatchScore(null);
    const timer = setTimeout(() => {
      const base = 65;
      const bonus = Math.floor(Math.random() * 26); // 65–90
      setMatchScore(base + bonus);
      setScoreLoading(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, [job]);

  // ── Compute Weak Areas ──
  const weakAreas = job
    ? job.skills.filter(s => !userProfile.skills.some(us => us.toLowerCase() === s.toLowerCase()))
    : [];

  const handleApply = async () => {
    if (applied) return;
    setApplied(true);
    setApplyToast(true);
    setTimeout(() => setApplyToast(false), 3000);
  };

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-6">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
          <div className="grid grid-cols-[1fr_320px] gap-6">
            <div className="space-y-4">
              <div className="bg-white rounded-2xl h-48 animate-pulse" />
              <div className="bg-white rounded-2xl h-64 animate-pulse" />
              <div className="bg-white rounded-2xl h-64 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-2xl h-96 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg font-semibold mb-3">Job not found</p>
          <button onClick={() => navigate('/jobs')} className="text-green-600 font-bold hover:underline">← Back to Jobs</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans">
      {showModal && <SubmitModal onClose={() => setShowModal(false)} />}
      <ApplyToast visible={applyToast} />

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft size={18} /> Back to Jobs
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{job.applicants}</span>
          <button
            onClick={handleApply}
            className={`px-5 py-2 rounded-xl font-bold text-sm transition-all ${
              applied
                ? 'bg-green-50 text-green-700 border border-green-300 cursor-default'
                : 'bg-green-600 hover:bg-green-500 text-white shadow-md shadow-green-600/20'
            }`}
          >
            {applied ? '✓ Applied' : 'Apply Now'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── Left: Job Info ── */}
        <div>
          {/* Company + Title */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-md"
                style={{ backgroundColor: job.companyColor }}
              >
                {job.companyLogo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{job.company} · {job.category} Role</p>
                <h1 className="text-2xl font-black text-gray-900 leading-tight mb-2">{job.title}</h1>
                <p className="text-gray-600 leading-relaxed text-sm">{job.description}</p>
              </div>
            </div>

            {/* Meta info row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-100">
              {[
                { icon: GraduationCap, label: 'Education', value: job.education },
                { icon: Clock, label: 'Start', value: job.duration },
                { icon: Banknote, label: 'Stipend', value: job.stipendLabel.split('–')[0].trim() + '+' },
                { icon: Banknote, label: 'Post-offer', value: job.postOffer },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center bg-gray-50 rounded-xl p-3">
                  <Icon size={14} className="text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-400 font-medium">{label}</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Skill tags */}
            <div className="flex gap-2 flex-wrap mt-4">
              {['Meta Info', 'Computer Vision', 'Machine Learning', 'Python', 'NLPs'].map(tag => (
                <span key={tag} className="text-xs border border-gray-200 text-gray-600 px-3 py-1 rounded-full hover:border-green-400 hover:text-green-700 cursor-pointer transition-colors">
                  ☆ {tag}
                </span>
              ))}
            </div>
          </div>

          {/* JD Section */}
          <Accordion title="JD (Job Description)" icon={CheckCircle2} defaultOpen={true}>
            <ul className="space-y-3 mt-4">
              {job.jd.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{
                    __html: item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  }} />
                </li>
              ))}
            </ul>
          </Accordion>

          {/* JR Section */}
          <Accordion title="JR (Job Requirements)" icon={CheckCircle2} defaultOpen={true}>
            <ul className="space-y-3 mt-4">
              {job.jr.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                  <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Accordion>
        </div>

        {/* ── Right: AI Insights Panel (Sticky) ── */}
        <aside className="sticky top-[57px] space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* AI Insights Header */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-green-600" />
                <span className="font-bold text-gray-900 text-sm">AI Insights Panel</span>
              </div>
              <button
                onClick={handleApply}
                className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  applied ? 'bg-green-100 text-green-700 cursor-default' : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {applied ? '✓ Applied' : 'Apply Now'}
              </button>
            </div>

            {/* Match Score */}
            <div className="text-center">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                {scoreLoading ? 'Calculating Match Score...' : `Match Score: ${matchScore}%`}
              </p>
              {scoreLoading ? (
                <div className="flex items-center justify-center h-36">
                  <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex justify-center">
                  <AnimatedScoreCircle targetScore={matchScore} size={140} />
                </div>
              )}
            </div>
          </div>

          {/* Weak Areas */}
          {!scoreLoading && weakAreas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-500" />
                  <span className="font-bold text-gray-900 text-sm">Weak Areas</span>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </div>
              <div className="space-y-3">
                {weakAreas.slice(0, 3).map(skill => (
                  <div key={skill} className="bg-red-50 border border-red-100 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                      <span className="text-xs font-bold text-red-800">{skill}</span>
                      <span className="ml-auto text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-mono">gap</span>
                    </div>
                    <p className="text-xs text-red-600/80 ml-4">
                      {skill === 'LLM' ? 'Hands-on experience with developing LLMs'
                        : skill === 'NLP' ? 'Practical NLP project experience needed'
                        : skill === 'Deployment' ? 'Deploy a model using Kubernetes/Airflow'
                        : skill === 'MLOps' ? 'MLflow or Kubeflow experience missing'
                        : `${skill} proficiency not detected in profile`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improve Options */}
          {!scoreLoading && weakAreas.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb size={15} className="text-amber-500" />
                  <span className="font-bold text-gray-900 text-sm">Improve Options</span>
                </div>
                <ChevronRight size={14} className="text-gray-400" />
              </div>
              <ul className="space-y-2 mb-4">
                {weakAreas.slice(0, 3).map(skill => (
                  <li key={skill} className="flex items-start gap-2 text-xs text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <span>{improvementSuggestions[skill] || `Strengthen your ${skill} skills with a project`}</span>
                  </li>
                ))}
              </ul>

              {/* Submit Solution Button */}
              <button
                onClick={() => setShowModal(true)}
                className="w-full border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 hover:text-green-700 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Send size={14} />
                Submit Solution
              </button>
            </div>
          )}

          {/* No weak areas — strong match */}
          {!scoreLoading && weakAreas.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <span className="font-bold text-green-800 text-sm">Strong Match! 🎉</span>
              </div>
              <p className="text-xs text-green-700">Your profile matches all required skills for this role.</p>
              <button
                onClick={() => setShowModal(true)}
                className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Send size={14} /> Submit Solution
              </button>
            </div>
          )}

          {/* Terminal */}
          {!scoreLoading && matchScore && (
            <TerminalBox matchScore={matchScore} jobTitle={job.title} />
          )}
        </aside>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeInLine {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Check, Sparkles, PenLine,
  Send, Bot, User as UserIcon, Edit3, Briefcase,
  DollarSign, Clock, Zap, AlertTriangle, CheckCircle2, X
} from 'lucide-react';

/* ─── constants ─────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Basic Details' },
  { id: 2, label: 'JD Method' },
  { id: 3, label: 'Job Description' },
  { id: 4, label: 'Enhancement' },
  { id: 5, label: 'Review & Post' },
];

const EXP_OPTIONS = ['1 year','2 years','3 years','4 years','5 years',
  '6 years','7 years','8 years','9 years','10 years','10+ years'];

/* ─── mock AI chat flow ─────────────────────────────────────── */
const AI_QUESTIONS = [
  { key: 'role',   q: "What is this role about? Give me a brief overview." },
  { key: 'skills', q: "What are the required skills for this position?" },
  { key: 'tools',  q: "Which tools or technologies should the candidate know?" },
  { key: 'duration', q: "What is the expected duration or timeline for this role?" },
  { key: 'resp',   q: "List the key responsibilities for this role." },
];

function buildJD(answers) {
  return `**${answers.role || 'Role Overview'}**

We are looking for a talented professional to join our team.

**Required Skills:**
${answers.skills || 'Strong technical and analytical skills'}

**Tools & Technologies:**
${answers.tools || 'Industry-standard tools and software'}

**Key Responsibilities:**
${answers.resp || '• Collaborate with cross-functional teams\n• Deliver high quality work\n• Meet project deadlines'}

**Duration / Timeline:**
${answers.duration || 'As per project requirements'}

**What We Offer:**
• Competitive compensation
• Flexible working environment
• Mentorship from industry experts
• Career growth opportunities`;
}

/* ─── mock JD validation ────────────────────────────────────── */
function validateJD(jd) {
  const suggestions = [];
  if (!jd.toLowerCase().includes('skill') && !jd.toLowerCase().includes('experience'))
    suggestions.push({ type: 'warning', msg: 'Skills / experience requirements not clearly mentioned.' });
  if (!jd.toLowerCase().includes('responsibilit') && !jd.toLowerCase().includes('duties'))
    suggestions.push({ type: 'warning', msg: 'Key responsibilities section seems missing.' });
  if (!jd.toLowerCase().includes('tool') && !jd.toLowerCase().includes('technolog'))
    suggestions.push({ type: 'warning', msg: 'No tools or technologies specified.' });
  if (jd.split(' ').length < 30)
    suggestions.push({ type: 'error', msg: 'Job description is too brief — add more detail.' });
  if (suggestions.length === 0)
    suggestions.push({ type: 'success', msg: 'JD looks great! Strong and detailed description.' });
  return suggestions;
}

/* ─── Progress Bar ───────────────────────────────────────────── */
function ProgressBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = s.id < current;
        const active  = s.id === current;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300
                ${done   ? 'bg-green-600 border-green-600 text-white'
                : active ? 'bg-white border-green-600 text-green-600'
                :          'bg-white border-gray-200 text-gray-400'}`}>
                {done ? <Check size={14}/> : s.id}
              </div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap
                ${active ? 'text-green-700' : done ? 'text-green-500' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 transition-all duration-500 ${done ? 'bg-green-500' : 'bg-gray-200'}`}/>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Step 1: Basic Details ──────────────────────────────────── */
function Step1({ data, setData, onNext }) {
  const [err, setErr] = useState('');

  const validate = () => {
    if (!data.title.trim()) { setErr('Project title is required.'); return; }
    if (!data.experience)   { setErr('Please select experience level.'); return; }
    setErr('');
    onNext();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Basic Details</h2>
        <p className="text-gray-500 mt-1 text-sm">Tell us the fundamentals of your project opening.</p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Project Title <span className="text-red-500">*</span></label>
        <input
          value={data.title}
          onChange={e => setData(d => ({ ...d, title: e.target.value }))}
          placeholder="e.g. Data Science Intern"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
        />
      </div>

      {/* Experience */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Experience Required <span className="text-red-500">*</span></label>
        <div className="relative">
          <select
            value={data.experience}
            onChange={e => setData(d => ({ ...d, experience: e.target.value }))}
            className="w-full appearance-none px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white pr-10"
          >
            <option value="">Select experience level</option>
            {EXP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none"/>
        </div>
      </div>

      {/* Salary */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">Salary / Stipend</label>
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input
              type="number"
              disabled={data.salaryUndisclosed}
              value={data.salary}
              onChange={e => setData(d => ({ ...d, salary: e.target.value }))}
              placeholder="e.g. 2000"
              className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0 select-none">
            <div
              onClick={() => setData(d => ({ ...d, salaryUndisclosed: !d.salaryUndisclosed, salary: '' }))}
              className={`w-11 h-6 rounded-full transition-all relative ${data.salaryUndisclosed ? 'bg-green-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${data.salaryUndisclosed ? 'translate-x-5' : ''}`}/>
            </div>
            <span className="text-sm text-gray-600">Not Disclosed</span>
          </label>
        </div>
      </div>

      {err && <p className="text-red-500 text-sm flex items-center gap-1"><AlertTriangle size={14}/> {err}</p>}

      <div className="flex justify-end pt-2">
        <button onClick={validate}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm shadow-green-200">
          Continue <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 2: JD Method ──────────────────────────────────────── */
function Step2({ data, setData, onNext, onBack }) {
  const methods = [
    { id: 'ai',    icon: Sparkles, title: 'Create using AI Chatbot', desc: 'Answer a few smart questions and let AI draft a perfect JD for you.' },
    { id: 'manual', icon: PenLine, title: 'Write your own JD',       desc: 'Full creative control — write the job description yourself.' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Job Description Method</h2>
        <p className="text-gray-500 mt-1 text-sm">How would you like to create the Job Description?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {methods.map(({ id, icon: Icon, title, desc }) => (
          <button key={id} onClick={() => setData(d => ({ ...d, jdMethod: id }))}
            className={`text-left p-6 rounded-2xl border-2 transition-all hover:shadow-md ${data.jdMethod === id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${data.jdMethod === id ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
              <Icon size={22}/>
            </div>
            <h3 className={`font-bold text-base mb-1 ${data.jdMethod === id ? 'text-green-800' : 'text-gray-800'}`}>{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            {data.jdMethod === id && (
              <div className="mt-4 flex items-center gap-1 text-green-600 text-xs font-semibold">
                <CheckCircle2 size={13}/> Selected
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={onNext} disabled={!data.jdMethod}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm shadow-green-200">
          Continue <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3A: Manual JD ─────────────────────────────────────── */
function Step3Manual({ data, setData, onNext, onBack }) {
  const wordCount = data.jdText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Write Job Description</h2>
        <p className="text-gray-500 mt-1 text-sm">Be as detailed as possible — clear JDs attract better candidates.</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gray-700">Job Description</label>
          <span className={`text-xs font-medium ${wordCount < 30 ? 'text-amber-500' : 'text-green-600'}`}>{wordCount} words</span>
        </div>
        <textarea
          rows={14}
          value={data.jdText}
          onChange={e => setData(d => ({ ...d, jdText: e.target.value }))}
          placeholder={`Example:\n\nWe're looking for a Data Science Intern to join our analytics team...\n\nRequired Skills:\n- Python, SQL, Machine Learning\n- Experience with Pandas, NumPy\n\nResponsibilities:\n- Analyze large datasets\n- Build predictive models\n...`}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white resize-none leading-relaxed"
        />
        {wordCount < 30 && wordCount > 0 && (
          <p className="text-amber-500 text-xs flex items-center gap-1"><AlertTriangle size={12}/> Add more detail for better results (min ~30 words)</p>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={onNext} disabled={!data.jdText.trim()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm shadow-green-200">
          Validate JD <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 3B: AI Chatbot ────────────────────────────────────── */
function Step3AI({ data, setData, onNext, onBack }) {
  const [messages, setMessages]     = useState([{ from: 'bot', text: "Hi! I'm your AI hiring assistant. Let's craft a perfect job description together. " + AI_QUESTIONS[0].q }]);
  const [input, setInput]           = useState('');
  const [qIdx, setQIdx]             = useState(0);
  const [answers, setAnswers]       = useState({});
  const [generated, setGenerated]   = useState('');
  const [editing, setEditing]       = useState(false);
  const [editText, setEditText]     = useState('');
  const [typing, setTyping]         = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    const currentQ = AI_QUESTIONS[qIdx];
    const newAnswers = { ...answers, [currentQ.key]: userMsg };
    setAnswers(newAnswers);
    setMessages(m => [...m, { from: 'user', text: userMsg }]);

    const nextIdx = qIdx + 1;
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (nextIdx < AI_QUESTIONS.length) {
        setMessages(m => [...m, { from: 'bot', text: AI_QUESTIONS[nextIdx].q }]);
        setQIdx(nextIdx);
      } else {
        const jd = buildJD(newAnswers);
        setGenerated(jd);
        setEditText(jd);
        setMessages(m => [...m, { from: 'bot', text: "✨ Perfect! I've generated your job description below. Review and edit it if needed, then continue." }]);
      }
    }, 900);
  };

  const acceptJD = () => {
    const finalJD = editing ? editText : generated;
    setData(d => ({ ...d, jdText: finalJD }));
    onNext();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">AI Job Description Assistant</h2>
        <p className="text-gray-500 mt-1 text-sm">Answer a few questions and AI will draft your JD instantly.</p>
      </div>

      {/* Chat window */}
      <div className="border border-gray-200 rounded-2xl bg-gray-50 flex flex-col" style={{ height: 340 }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-white rounded-t-2xl">
          <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center">
            <Bot size={14} className="text-white"/>
          </div>
          <span className="text-sm font-semibold text-gray-800">AI Hiring Assistant</span>
          <div className="ml-auto flex gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
            <span className="text-xs text-green-600 font-medium">Online</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.from === 'bot' && (
                <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={13} className="text-white"/>
                </div>
              )}
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.from === 'user'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
              }`}>
                {m.text}
              </div>
              {m.from === 'user' && (
                <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon size={13} className="text-gray-500"/>
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                <Bot size={13} className="text-white"/>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 shadow-sm">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {!generated && (
          <div className="px-4 py-3 border-t border-gray-200 bg-white rounded-b-2xl flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type your answer…"
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button onClick={sendMessage} disabled={!input.trim()}
              className="w-9 h-9 rounded-lg bg-green-600 disabled:opacity-40 hover:bg-green-700 flex items-center justify-center text-white transition-colors">
              <Send size={14}/>
            </button>
          </div>
        )}
      </div>

      {/* Generated JD */}
      {generated && (
        <div className="border border-green-200 rounded-2xl bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-green-100 bg-green-50">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-green-600"/>
              <span className="text-sm font-bold text-green-800">Generated Job Description</span>
            </div>
            <button onClick={() => setEditing(e => !e)}
              className="flex items-center gap-1 text-xs text-green-700 hover:text-green-900 font-semibold border border-green-300 px-3 py-1.5 rounded-lg hover:bg-white transition-all">
              <Edit3 size={12}/> {editing ? 'Preview' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <textarea
              rows={10}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full px-5 py-4 text-sm text-gray-700 leading-relaxed focus:outline-none resize-none"
            />
          ) : (
            <pre className="px-5 py-4 text-sm text-gray-700 leading-7 whitespace-pre-wrap font-sans">{generated}</pre>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          <ChevronLeft size={16}/> Back
        </button>
        {generated && (
          <button onClick={acceptJD}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm shadow-green-200">
            Accept & Validate <ChevronRight size={16}/>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Step 4: Enhancement ────────────────────────────────────── */
function Step4({ data, setData, onNext, onBack }) {
  const suggestions = validateJD(data.jdText);
  const allGood = suggestions.every(s => s.type === 'success');

  const iconFor = (type) => {
    if (type === 'success') return <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5"/>;
    if (type === 'warning') return <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5"/>;
    return <X size={16} className="text-red-500 shrink-0 mt-0.5"/>;
  };

  const bgFor = (type) => ({
    success: 'bg-green-50 border-green-200',
    warning: 'bg-amber-50 border-amber-200',
    error:   'bg-red-50 border-red-200',
  }[type]);

  const textFor = (type) => ({
    success: 'text-green-800',
    warning: 'text-amber-800',
    error:   'text-red-800',
  }[type]);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">JD Enhancement & Validation</h2>
        <p className="text-gray-500 mt-1 text-sm">Our AI reviewed your job description and found the following insights.</p>
      </div>

      <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border ${allGood ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${allGood ? 'bg-green-600' : 'bg-amber-500'}`}>
          {allGood ? <CheckCircle2 size={20} className="text-white"/> : <Zap size={20} className="text-white"/>}
        </div>
        <div>
          <p className={`font-bold text-sm ${allGood ? 'text-green-800' : 'text-amber-800'}`}>
            {allGood ? 'JD Score: Excellent ✨' : `${suggestions.filter(s => s.type !== 'success').length} improvement(s) suggested`}
          </p>
          <p className={`text-xs mt-0.5 ${allGood ? 'text-green-600' : 'text-amber-600'}`}>
            {allGood ? 'Your JD is detailed and ready to attract top candidates.' : 'Address these to attract better qualified applicants.'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <div key={i} className={`flex items-start gap-3 border px-4 py-3.5 rounded-xl ${bgFor(s.type)}`}>
            {iconFor(s.type)}
            <p className={`text-sm font-medium ${textFor(s.type)}`}>{s.msg}</p>
          </div>
        ))}
      </div>

      {/* Editable JD */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Edit3 size={14}/> Edit JD if needed</label>
        <textarea
          rows={10}
          value={data.jdText}
          onChange={e => setData(d => ({ ...d, jdText: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white resize-none leading-relaxed"
        />
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={onNext}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-sm shadow-green-200">
          Review & Post <ChevronRight size={16}/>
        </button>
      </div>
    </div>
  );
}

/* ─── Step 5: Review & Submit ────────────────────────────────── */
function Step5({ data, onBack, onEdit, navigate }) {
  const [posted, setPosted] = useState(false);

  const handlePost = () => {
    console.log('Project Posted:', data);
    setPosted(true);
    setTimeout(() => navigate('/client-projects'), 2000);
  };

  if (posted) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4 animate-fadeIn">
      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 size={40} className="text-green-600"/>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Project Posted!</h2>
      <p className="text-gray-500 text-sm text-center">Your project is now live and visible to freelancers.<br/>Redirecting to your projects…</p>
      <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
        <div className="h-full bg-green-500 rounded-full animate-[grow_2s_linear_forwards]" style={{ width: '100%', animationName: 'none', transition: 'width 2s linear' }}/>
      </div>
    </div>
  );

  const sections = [
    { label: 'Project Title',    value: data.title,                        key: 1, icon: Briefcase },
    { label: 'Experience',       value: data.experience,                   key: 1, icon: Clock },
    { label: 'Salary',           value: data.salaryUndisclosed ? 'Not Disclosed' : (data.salary ? `$${data.salary}` : 'Not specified'), key: 1, icon: DollarSign },
    { label: 'JD Method',        value: data.jdMethod === 'ai' ? 'AI Generated' : 'Manually Written', key: 2, icon: Sparkles },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review & Post</h2>
        <p className="text-gray-500 mt-1 text-sm">Everything looks good? Post it to reach thousands of candidates.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {sections.map(({ label, value, key, icon: Icon }) => (
          <div key={label} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Icon size={15} className="text-green-700"/>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">{label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
              </div>
            </div>
            <button onClick={() => onEdit(key)}
              className="text-green-600 hover:text-green-800 p-1 rounded-lg hover:bg-green-50 transition-all shrink-0">
              <Edit3 size={13}/>
            </button>
          </div>
        ))}
      </div>

      {/* JD Preview */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Job Description</span>
          <button onClick={() => onEdit(3)} className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:underline">
            <Edit3 size={12}/> Edit
          </button>
        </div>
        <div className="px-5 py-4 max-h-48 overflow-y-auto">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap font-sans leading-7">{data.jdText || 'No description added.'}</pre>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          <ChevronLeft size={16}/> Back
        </button>
        <button onClick={handlePost}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-green-200 text-base">
          <Zap size={17}/> Post Project
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export default function CreateProject() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    title: '', experience: '', salary: '', salaryUndisclosed: false,
    jdMethod: '', jdText: '',
  });

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);
  const goEdit = (targetStep) => setStep(targetStep);

  // Step 3 branches based on method
  const resolvedStep = step === 3 && data.jdMethod === 'ai' ? '3ai' : step;

  const renderStep = () => {
    switch (resolvedStep) {
      case 1:    return <Step1 data={data} setData={setData} onNext={next}/>;
      case 2:    return <Step2 data={data} setData={setData} onNext={next} onBack={back}/>;
      case 3:    return <Step3Manual data={data} setData={setData} onNext={next} onBack={back}/>;
      case '3ai':return <Step3AI data={data} setData={setData} onNext={next} onBack={back}/>;
      case 4:    return <Step4 data={data} setData={setData} onNext={next} onBack={back}/>;
      case 5:    return <Step5 data={data} onBack={back} onEdit={goEdit} navigate={navigate}/>;
      default:   return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50/30">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate('/client-projects')} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={20}/>
        </button>
        <div className="flex items-center gap-1 font-bold text-lg select-none">
          <span className="text-green-600">fiverr</span>
          <span className="text-gray-700">Intern</span>
          <span className="text-xs font-semibold bg-green-600 text-white px-1.5 py-0.5 rounded ml-0.5">Pro</span>
        </div>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-sm text-gray-500 font-medium">Create Project</span>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ProgressBar current={step}/>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {renderStep()}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out both; }
        @keyframes bounce { 0%,80%,100% { transform: scale(0); } 40% { transform: scale(1); } }
        .animate-bounce { animation: bounce 1.2s infinite ease-in-out; }
      `}</style>
    </div>
  );
}

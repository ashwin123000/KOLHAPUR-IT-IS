import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProNavbar from '../components/ProNavbar';
import DevOS from '../components/DevOS';
import {
  ChevronDown, Users, Calendar, Clock, Shield, Cpu, Monitor,
  CheckCircle2, AlertTriangle, Play, Trophy, BarChart2, Zap,
  Video, Globe, Settings, ChevronRight, X, Bell, Code2
} from 'lucide-react';

/* ─── VM Mock Schedule ───────────────────────────────────────── */
const VM_START = new Date('2026-04-05T10:00:00');
const VM_END   = new Date('2026-04-05T11:00:00');

function useVMStatus() {
  const [now, setNow] = React.useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  if (now < VM_START) {
    return { phase: 'scheduled', countdown: fmt(VM_START - now), elapsed: null };
  } else if (now >= VM_START && now < VM_END) {
    const elapsedMs = now - VM_START;
    const remainMs  = VM_END - now;
    const totalSec  = (VM_END - VM_START) / 1000;
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const elapsedFmt = `${String(Math.floor(elapsedSec/60)).padStart(2,'0')}:${String(elapsedSec%60).padStart(2,'0')}`;
    const totalFmt   = `${String(Math.floor(totalSec/60)).padStart(2,'0')}:00`;
    return { phase: 'running', countdown: fmt(remainMs), elapsed: `${elapsedFmt} / ${totalFmt}` };
  } else {
    return { phase: 'completed', countdown: null, elapsed: null };
  }
}

/* ─── Mock Projects ──────────────────────────────────────────── */
const PROJECTS = {
  p1: {
    id:'p1', title:'Data Science Intern',
    candidates:[
      { id:'c1', name:'Aarav Sharma',  role:'Python Dev',      status:'Scheduled', score:null, tags:['Python','ML','95% JD Match'] },
      { id:'c2', name:'Maria Chen',    role:'React Developer', status:'Ready',      score:null, tags:['React','Node','91% JD Match'] },
      { id:'c3', name:'Priya Nair',    role:'Data Analyst',    status:'Ready',      score:null, tags:['SQL','Python','88% JD Match'] },
      { id:'c4', name:'Remala Sharma', role:'Graphic Designer',status:'Completed',  score:72,   tags:['Figma','73% JD Match'] },
      { id:'c5', name:'James Okafor',  role:'UX Designer',     status:'Completed',  score:68,   tags:['UX','Prototyping','70% JD Match'] },
    ],
    testScheduled: true,
    testDate:'2025-04-20', testTime:'10:00',
  },
  p2: {
    id:'p2', title:'React Frontend Developer',
    candidates:[
      { id:'c2', name:'Maria Chen',    role:'React Developer', status:'Ready',      score:null, tags:['React','TypeScript','96% JD Match'] },
      { id:'c6', name:'Leo Fernandez', role:'SEO Specialist',  status:'Ready',      score:null, tags:['SEO','Analytics','78% JD Match'] },
    ],
    testScheduled: false, testDate:'', testTime:'',
  },
  p3: {
    id:'p3', title:'UX/UI Design Intern',
    candidates:[
      { id:'c5', name:'James Okafor',  role:'UX Designer',     status:'Completed',  score:68,   tags:['Figma','UX Research','85% JD Match'] },
    ],
    testScheduled: true, testDate:'2025-04-15', testTime:'14:00',
  },
};

/* ─── Tab Nav ────────────────────────────────────────────────── */
const TABS = ['Pipeline','Schedule','Configuration','Live Session','Results'];

/* ─── tiny helpers ───────────────────────────────────────────── */
function Tag({ label }) {
  const isMatch = label.includes('JD Match');
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isMatch ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = {
    Ready:     'bg-blue-100 text-blue-700',
    Scheduled: 'bg-amber-100 text-amber-700',
    Completed: 'bg-green-100 text-green-700',
  };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fadeIn border border-gray-700">
      <CheckCircle2 size={16} className="text-green-400 shrink-0"/>
      <span className="text-sm font-medium">{msg}</span>
      <button onClick={onClose} className="text-gray-400 hover:text-white ml-2"><X size={14}/></button>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export default function VMAnalysis() {
  const navigate = useNavigate();
  const [projectId,  setProjectId]  = useState('p1');
  const [activeTab,  setActiveTab]  = useState('Pipeline');
  const [cameraOn,   setCameraOn]   = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [confirmed,  setConfirmed]  = useState(false);
  const [devOSOpen,  setDevOSOpen]  = useState(false);
  const [toast,      setToast]      = useState('');
  const [liveCount,  setLiveCount]  = useState(3);
  const [activeSusp, setActiveSusp] = useState(false);
  const [elapsed,    setElapsed]    = useState(0);
  const [testRunning,setTestRunning]= useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date:'', time:'', duration:'60', notify:'now', timeMode:'manual', domain:'NLP',
    difficulty:'Medium', testType:'Mixed', vsCode:true, chrome:true, chatbot:true,
  });
  const [proctoringLevel, setProctoring] = useState('standard');
  const [wizardStep, setWizardStep] = useState(1);
  const videoRef = useRef(null);

  const project = PROJECTS[projectId];

  // Handle camera toggle
  useEffect(() => {
    if (cameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setCameraStream(stream);
          }
        })
        .catch(err => {
          console.error('Camera access denied:', err);
          setCameraOn(false);
          showToast('Camera access denied. Check permissions.');
        });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraOn]);

  // Reset wizard when project changes
  useEffect(() => {
    setWizardStep(1);
  }, [projectId]);
  useEffect(() => {
    if (!testRunning) return;
    const t = setInterval(() => {
      setElapsed(e => e + 1);
      if (Math.random() < 0.05) setActiveSusp(s => !s);
      if (Math.random() < 0.1)  setLiveCount(c => Math.max(1, Math.min(5, c + (Math.random() > 0.5 ? 1 : -1))));
    }, 1000);
    return () => clearInterval(t);
  }, [testRunning]);

  const sf = (k, v) => setScheduleForm(f => ({ ...f, [k]: v }));
  const showToast = (msg) => setToast(msg);
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const handleSchedule = () => {
    if (!scheduleForm.date || !scheduleForm.time) { showToast('Please set a date and time first.'); return; }
    if (cameraOn && !confirmed) { showToast('Please confirm camera monitoring.'); return; }
    showToast('✅ Test Scheduled! Candidates will be notified.');
  };

  const handleStartTest = () => {
    setDevOSOpen(true);
    setTestRunning(true);
    showToast('🚀 VM Test environment launched!');
  };

  const handleEndTest = () => {
    setDevOSOpen(false);
    setTestRunning(false);
    setResultsReady(true);
    showToast('✅ Test Completed! Results are ready.');
    setActiveTab('Results');
  };

  const completedCandidates = project.candidates.filter(c => c.status === 'Completed' || resultsReady);

  /* ── Pipeline Tab ── */
  const PipelineTab = () => (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3">
        <CheckCircle2 size={18} className="text-green-600 shrink-0"/>
        <p className="text-sm font-medium text-green-800">
          All <strong>{project.candidates.length} candidates</strong> who passed JD screening are automatically queued for VM Test.
        </p>
      </div>

      <div className="space-y-3">
        {project.candidates.map(c => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-300 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
              <p className="text-xs text-gray-500">{c.role}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {c.tags.map(t => <Tag key={t} label={t}/>)}
            </div>
            {c.score != null && (
              <div className="text-center">
                <p className="font-bold text-lg text-green-600">{c.score}</p>
                <p className="text-xs text-gray-400">Score</p>
              </div>
            )}
            <StatusBadge status={c.status}/>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── Schedule Wizard (3-step) ── */
  const ScheduleWizard = () => {
    const goTo = (n) => setWizardStep(n);

    const step1Valid = !!(scheduleForm.date && scheduleForm.time);
    const tooSoon = step1Valid && (() => {
      const sel = new Date(`${scheduleForm.date}T${scheduleForm.time}`);
      return (sel - Date.now()) < 24 * 3600 * 1000;
    })();

    const STEPS = ['Schedule', 'Configure', 'Review'];

    return (
      <div>
        {/* ── Stepper ── */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  wizardStep > i + 1 ? 'bg-green-600 text-white' :
                  wizardStep === i + 1 ? 'bg-green-600 text-white ring-4 ring-green-100' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {wizardStep > i + 1 ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span className={`text-sm font-semibold ${
                  wizardStep === i + 1 ? 'text-green-700' : wizardStep > i + 1 ? 'text-green-500' : 'text-gray-400'
                }`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-16 mx-3 rounded transition-all ${wizardStep > i + 1 ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* ── Step Content ── */}
        <div style={{ opacity: 1, transition: 'opacity 0.15s ease' }}>

          {/* STEP 1: SCHEDULE */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-5">
                {/* Date / Time / Duration */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={16} className="text-green-600" /> Test Scheduling</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Date</label>
                      <input type="date" value={scheduleForm.date} onChange={e => sf('date', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Time</label>
                      <input type="time" value={scheduleForm.time} onChange={e => sf('time', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>

                  {!step1Valid && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                      <AlertTriangle size={13} className="text-red-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700 font-medium">Please select both date and time before proceeding.</p>
                    </div>
                  )}

                  {tooSoon && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                      <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 font-medium">Candidates may not have enough preparation time. Consider scheduling at least 24h in advance.</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Duration</label>
                    <select value={scheduleForm.duration} onChange={e => sf('duration', e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      {['30','45','60','90','120'].map(d => <option key={d} value={d}>{d} minutes</option>)}
                    </select>
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <label className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1"><Bell size={12} /> Candidate Notifications</label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {[{id:'now',label:'Notify Now'},{id:'2days',label:'2 Days Before'},{id:'date',label:'On Test Day'}].map(n => (
                      <button key={n.id} onClick={() => sf('notify', n.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${scheduleForm.notify === n.id ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Availability */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Users size={16} className="text-green-600" /> Candidate Availability</h3>
                  <div className="space-y-2">
                    {[
                      { label:'Available at selected time', val:'3 / 5',  bg:'bg-green-50',  text:'text-green-700' },
                      { label:'Different timezone',          val:'2 candidates', bg:'bg-amber-50', text:'text-amber-700' },
                      { label:'Confirmed attendance',        val:'5 / 5',  bg:'bg-gray-50',   text:'text-gray-700' },
                    ].map(r => (
                      <div key={r.label} className={`flex items-center justify-between p-3 ${r.bg} rounded-xl`}>
                        <span className="text-sm text-gray-700">{r.label}</span>
                        <span className={`font-bold text-sm ${r.text}`}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs text-blue-700 font-medium">💡 Candidates in different timezones receive adjusted local time notifications automatically.</p>
                  </div>
                </div>

                {/* Camera */}
                <div className={`bg-white border-2 rounded-2xl p-5 transition-all ${cameraOn ? 'border-red-300' : 'border-gray-200'}`}>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Video size={16} className={`${cameraOn ? 'text-red-500' : 'text-gray-400'}`} /> Camera Monitoring</h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-700">{cameraOn ? '🟢 Camera Active' : '⚫ Camera Off'}</span>
                    <button onClick={() => { setCameraOn(c => !c); setConfirmed(false); }}
                      className={`w-12 h-6 rounded-full transition-all relative ${cameraOn ? 'bg-red-500' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${cameraOn ? 'translate-x-6' : ''}`} />
                    </button>
                  </div>
                  {cameraOn && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-3">
                      <video ref={videoRef} autoPlay muted className="w-full rounded-lg bg-black h-32 object-cover" />
                      <p className="text-xs text-red-700 font-medium flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 shrink-0" />Once the test begins, monitoring cannot be disabled.</p>
                      {!confirmed && <button onClick={() => setConfirmed(true)} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg font-semibold">I Confirm — Enable Monitoring</button>}
                      {confirmed && <p className="text-xs text-green-700 font-semibold flex items-center gap-1"><CheckCircle2 size={12} /> Confirmed. Camera monitoring active.</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE */}
          {wizardStep === 2 && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-5">
                {/* Domain + Difficulty + Test Type */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings size={16} className="text-green-600" /> Test Configuration</h3>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-0.5 block">Domain</label>
                      <p className="text-[10px] text-gray-400 mb-1.5">Based on job role</p>
                      <select value={scheduleForm.domain} onChange={e => sf('domain', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        {['NLP','Backend','Frontend','Data Science','Full-Stack'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-0.5 block">Difficulty</label>
                      <p className="text-[10px] text-gray-400 mb-1.5">Medium → filters average candidates</p>
                      <select value={scheduleForm.difficulty} onChange={e => sf('difficulty', e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                        {['Easy','Medium','Hard','Expert'].map(d => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Test Type</label>
                  <div className="space-y-2">
                    {[
                      { id:'Debugging',       icon:'🐛', label:'Debugging',       desc:'Find and fix bugs in existing code' },
                      { id:'Problem Solving', icon:'💡', label:'Problem Solving', desc:'Implement algorithms from scratch' },
                      { id:'Mixed',           icon:'⭐', label:'Mixed',           desc:'Combination of both approaches', recommended:true },
                    ].map(t => (
                      <button key={t.id} onClick={() => sf('testType', t.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          scheduleForm.testType === t.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200 bg-white'
                        }`}>
                        <span className="text-xl">{t.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{t.label}</span>
                            {t.recommended && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Recommended</span>}
                          </div>
                          <p className="text-xs text-gray-500">{t.desc}</p>
                        </div>
                        {scheduleForm.testType === t.id && <CheckCircle2 size={16} className="text-green-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Environment Toggles */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2"><Globe size={16} className="text-green-600" /> Test Environment Control</h3>
                  <p className="text-xs text-gray-400 mb-4">All activity is observed and logged — nothing is blocked</p>
                  <div className="space-y-3">
                    {[
                      { k:'vsCode',  label:'VS Code Editor',  desc:'Full IDE with extensions' },
                      { k:'chrome',  label:'Browser Access',   desc:'Unrestricted web browsing' },
                      { k:'chatbot', label:'AI Tools Allowed', desc:'ChatGPT, Claude etc. (logged only)' },
                    ].map(({ k, label, desc }) => (
                      <div key={k} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                        <button onClick={() => sf(k, !scheduleForm[k])}
                          className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${scheduleForm[k] ? 'bg-green-600' : 'bg-gray-200'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${scheduleForm[k] ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proctoring Level */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield size={16} className="text-green-600" /> Proctoring Level</h3>
                  <div className="space-y-2">
                    {[
                      { id:'light',    label:'Light Monitoring',    desc:'Logs activity only',              impact:'Basic deterrence' },
                      { id:'standard', label:'Standard Monitoring',  desc:'Tracks tab switch + camera',     impact:'Reduces cheating by 45%' },
                      { id:'strict',   label:'Strict Mode',          desc:'Full restrictions + lockdown',   impact:'Reduces cheating by 70%' },
                    ].map(p => (
                      <button key={p.id} onClick={() => setProctoring(p.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                          proctoringLevel === p.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                            <span className="text-[10px] text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full font-semibold">{p.impact}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                        </div>
                        {proctoringLevel === p.id && <CheckCircle2 size={16} className="text-green-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Candidate Preview */}
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">👁 Candidate Experience Preview</p>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                      <Code2 size={16} className="text-green-400 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-400">VS Code Editor</p>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-2.5 text-center">
                      <Globe size={16} className="text-blue-400 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-400">Browser</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-400 font-mono">
                    <p>⏱ Duration: {scheduleForm.duration} min</p>
                    <p>🎯 {scheduleForm.domain} · {scheduleForm.difficulty} · {scheduleForm.testType}</p>
                    <p>🛡 Proctoring: {proctoringLevel === 'light' ? 'Light' : proctoringLevel === 'standard' ? 'Standard' : 'Strict'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: REVIEW */}
          {wizardStep === 3 && (
            <div className="max-w-lg mx-auto">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-5 shadow-sm">
                <div className="px-6 py-4 bg-green-50 border-b border-green-100">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-widest">Review & Confirm</p>
                  <h3 className="font-bold text-gray-900 text-lg mt-0.5">Confirm Test Schedule</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {[
                    { label:'Date & Time',      value: scheduleForm.date && scheduleForm.time ? `${scheduleForm.date} at ${scheduleForm.time}` : '⚠ Not set' },
                    { label:'Duration',          value: `${scheduleForm.duration} minutes` },
                    { label:'Domain',            value: scheduleForm.domain },
                    { label:'Difficulty',        value: scheduleForm.difficulty },
                    { label:'Test Type',         value: scheduleForm.testType },
                    { label:'Proctoring Level',  value: proctoringLevel === 'light' ? 'Light Monitoring' : proctoringLevel === 'standard' ? 'Standard Monitoring' : 'Strict Mode' },
                    { label:'Camera',            value: cameraOn ? (confirmed ? '✅ Active & Confirmed' : '⚠ Enabled (unconfirmed)') : 'Disabled' },
                    { label:'Notification',      value: scheduleForm.notify === 'now' ? 'Notify Now' : scheduleForm.notify === '2days' ? '2 Days Before' : 'On Test Day' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-6 py-3">
                      <span className="text-sm text-gray-500">{label}</span>
                      <span className="text-sm font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {!step1Valid && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">Please go back and set a date and time first.</p>
                </div>
              )}

              <button
                onClick={() => { if (step1Valid) handleSchedule(); }}
                disabled={!step1Valid}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black text-base transition-all shadow-lg shadow-green-200"
              >
                🚀 Schedule VM Test
              </button>
              <button onClick={() => goTo(2)} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3 transition-colors">
                ← Edit Configuration
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation Buttons ── */}
        {wizardStep < 3 && (
          <div className={`flex ${wizardStep > 1 ? 'justify-between' : 'justify-end'} mt-8 pt-5 border-t border-gray-100`}>
            {wizardStep > 1 && (
              <button onClick={() => goTo(wizardStep - 1)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-all">
                ← Back
              </button>
            )}
            <button
              onClick={() => {
                if (wizardStep === 1 && !step1Valid) { showToast('Please set a date and time first.'); return; }
                goTo(wizardStep + 1);
              }}
              disabled={wizardStep === 1 && !step1Valid}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-green-200"
            >
              {wizardStep === 2 ? 'Review →' : 'Next: Configure →'}
            </button>
          </div>
        )}
      </div>
    );
  };


  const vm = useVMStatus();

  /* ── Live Session Tab ── */
  const LiveTab = () => {
    const phaseColor = { scheduled: 'blue', running: 'green', completed: 'gray' }[vm.phase];

    // Session Timer dynamic value
    const sessionTimerVal = {
      scheduled: `Starts in ${vm.countdown}`,
      running:   vm.elapsed || '—',
      completed: 'Completed',
    }[vm.phase];

    return (
      <div className="space-y-4">
        {/* Status indicators grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Active Candidates', val: vm.phase === 'running' ? `${liveCount} active` : '—', icon:Users, color: vm.phase === 'running' ? 'green' : 'gray' },
            { label:'Session Timer',     val: sessionTimerVal,                                         icon:Clock, color: vm.phase === 'running' ? 'green' : vm.phase === 'scheduled' ? 'blue' : 'gray' },
            { label:'Camera Status',     val: cameraOn ? 'Monitoring ●' : 'Off',                      icon:Video, color: cameraOn ? 'red' : 'gray' },
            { label:'Suspicious Events', val: vm.phase === 'running' && activeSusp ? '⚠ Detected' : 'None', icon:Shield, color: vm.phase === 'running' && activeSusp ? 'amber' : 'green' },
          ].map(({ label, val, icon:Icon, color }) => {
            const cls = { green:'border-green-200 bg-green-50', blue:'border-blue-200 bg-blue-50', red:'border-red-200 bg-red-50', amber:'border-amber-200 bg-amber-50', gray:'border-gray-200 bg-gray-50' }[color];
            const tcls = { green:'text-green-800', blue:'text-blue-800', red:'text-red-700', amber:'text-amber-700', gray:'text-gray-700' }[color];
            return (
              <div key={label} className={`border rounded-xl p-4 ${cls}`}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`font-bold text-sm ${tcls}`}>{val}</p>
              </div>
            );
          })}
        </div>

        {/* ── VM STATUS CARD (auto-driven, no manual launch) ── */}
        {vm.phase === 'scheduled' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={26} className="text-blue-600" />
            </div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">VM Test Status</p>
            <h3 className="font-bold text-blue-900 text-xl mb-1">Test Scheduled</h3>
            <p className="text-blue-600 text-sm mb-3">System will auto-trigger the VM environment at the scheduled time.</p>
            <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-200 px-5 py-2.5 rounded-xl">
              <Clock size={15} className="text-blue-600" />
              <span className="font-mono font-black text-blue-800 text-lg">Starts in {vm.countdown}</span>
            </div>
            <p className="text-xs text-blue-400 mt-4 italic">The system auto-triggers VM sessions based on schedule — clients only monitor real-time activity.</p>
          </div>
        )}

        {vm.phase === 'running' && (
          <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-mono font-bold tracking-widest">TEST IN PROGRESS</span>
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Elapsed / Total</p>
                <p className="font-mono font-bold text-white">{vm.elapsed}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                <p className="font-mono font-bold text-amber-400">{vm.countdown}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">Active Now</p>
                <p className="font-mono font-bold text-green-400">{liveCount} candidates</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-500 italic">VM sessions are running autonomously — monitor candidate activity in real time.</p>
          </div>
        )}

        {(vm.phase === 'completed' || resultsReady) && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">VM Test Status</p>
            <h3 className="font-bold text-gray-900 text-lg">Test Completed</h3>
            <p className="text-gray-500 text-sm mt-1 mb-4">All candidates submitted. AI analysis is processing results.</p>
            <button onClick={() => handleTabChange('Results')} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">View Rankings →</button>
          </div>
        )}
      </div>
    );
  };

  /* ── Results Tab ── */
  const ResultsTab = () => {
    const MOCK_RESULTS = [
      { id:'c1', name:'Aarav Sharma',  score:91, verdict:'Strong Hire', rank:1, badges:['Top Performer','Quick Debugger'] },
      { id:'c2', name:'Maria Chen',    score:87, verdict:'Hire',        rank:2, badges:['Clean Code'] },
      { id:'c3', name:'Priya Nair',    score:80, verdict:'Hire',        rank:3, badges:['Consistent'] },
      { id:'c4', name:'Remala Sharma', score:72, verdict:'Maybe',       rank:4, badges:[] },
      { id:'c5', name:'James Okafor',  score:68, verdict:'Waitlist',    rank:5, badges:[] },
      { id:'c6', name:'Leo Fernandez', score:63, verdict:'Waitlist',    rank:6, badges:[] },
    ];
    const verdictColor = { 'Strong Hire':'bg-green-100 text-green-800','Hire':'bg-blue-100 text-blue-800','Maybe':'bg-amber-100 text-amber-800','Waitlist':'bg-gray-100 text-gray-600' };
    const topN = Math.ceil(MOCK_RESULTS.length * 0.4) + 1; // top 40% + 10% buffer

    return (
      <div className="space-y-4">
        {/* Analytics strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label:'Total Candidates', val: MOCK_RESULTS.length, icon:Users },
            { label:'Tests Completed',  val: MOCK_RESULTS.length, icon:CheckCircle2 },
            { label:'Avg Score',        val: Math.round(MOCK_RESULTS.reduce((s,c)=>s+c.score,0)/MOCK_RESULTS.length), icon:BarChart2 },
            { label:'Strong Hires',     val: MOCK_RESULTS.filter(c=>c.verdict==='Strong Hire'||c.verdict==='Hire').length, icon:Trophy },
          ].map(({ label, val, icon:Icon }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className="text-green-600"/>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
              <p className="text-2xl font-black text-gray-900">{val}</p>
            </div>
          ))}
        </div>

        {/* Rank list */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
            <Trophy size={16} className="text-green-600"/>
            <h3 className="font-bold text-gray-900">Candidate Rankings</h3>
            <span className="ml-auto text-xs text-gray-400">First {topN} selected ({Math.round((topN/MOCK_RESULTS.length)*100)}% + buffer)</span>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_RESULTS.map((c, i) => {
              const selected = i < topN;
              return (
                <div key={c.id}
                  onClick={() => navigate(`/candidate/${c.id}`)}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-all group ${selected ? 'border-l-4 border-green-500' : 'border-l-4 border-transparent'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0
                    ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-gray-700':i===2?'bg-orange-400 text-white':'bg-gray-100 text-gray-600'}`}>
                    {c.rank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{c.name}</p>
                      {selected && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Selected</span>}
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {c.badges.map(b => <span key={b} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{b}</span>)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-black" style={{ color: c.score>=80?'#22c55e':c.score>=65?'#f59e0b':'#ef4444' }}>{c.score}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${verdictColor[c.verdict]}`}>{c.verdict}</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 shrink-0"/>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ── Empty state ── */
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
      <Monitor size={56} className="mb-4 opacity-30"/>
      <h3 className="text-xl font-bold text-gray-700">No VM Tests Scheduled Yet</h3>
      <p className="text-sm mt-1 text-gray-500">Schedule a test to evaluate candidates in a live environment</p>
      <button onClick={() => handleTabChange('Schedule')}
        className="mt-6 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all">
        Schedule Now →
      </button>
    </div>
  );

  const tabContent = () => {
    if (activeTab === 'Pipeline')      return <PipelineTab/>;
    if (activeTab === 'Schedule' || activeTab === 'Configuration') return <ScheduleWizard/>;
    if (activeTab === 'Live Session')  return <LiveTab/>;
    if (activeTab === 'Results')       return resultsReady || project.candidates.some(c=>c.status==='Completed') ? <ResultsTab/> : <EmptyState/>;
    return null;
  };

  const handleTabChange = (tab) => {
    if (tab === 'Schedule' || tab === 'Configuration') setWizardStep(1);
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ProNavbar/>
      {devOSOpen && <DevOS onExit={handleEndTest} onLog={() => {}}/>}
      {toast && <Toast msg={toast} onClose={() => setToast('')}/>}

      <div className="max-w-6xl mx-auto w-full px-6 py-8">
        {/* Page title + project selector */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">VM Analysis</h1>
            <p className="text-gray-500 text-sm mt-0.5">AI-powered virtual development assessment</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select value={projectId} onChange={e => { setProjectId(e.target.value); handleTabChange('Pipeline'); setResultsReady(false); }}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-9 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer">
                {Object.values(PROJECTS).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
            </div>
            <div className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-2 rounded-xl">
              {project.candidates.length} candidates
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-gray-200 mb-6">
          {TABS.map(tab => (
            <button key={tab} onClick={() => handleTabChange(tab)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all -mb-px
                ${activeTab === tab ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {tab}
              {tab === 'Live Session' && testRunning && (
                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full inline-block animate-pulse"/>
              )}
              {tab === 'Results' && resultsReady && (
                <span className="ml-2 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">New</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ animation:'fadeIn 0.2s ease-out' }}>
          {tabContent()}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out both; }
      `}</style>
    </div>
  );
}

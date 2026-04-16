import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProNavbar from '../components/ProNavbar';
import {
  ChevronLeft, Terminal, AlertTriangle, CheckCircle2, Eye, Clock,
  Code, Globe, Cpu, Shield, TrendingUp, Zap, Filter, X
} from 'lucide-react';

/* ─── mock data ─────────────────────────────────────────────── */
const CANDIDATES = {
  c1: { name:'Aarav Sharma',    rank:1, score:91, verdict:'Strong Hire',   role:'Python Dev',       avatar:'AS', risk:'Low' },
  c2: { name:'Maria Chen',      rank:2, score:87, verdict:'Hire',          role:'React Developer',  avatar:'MC', risk:'Low' },
  c3: { name:'Priya Nair',      rank:3, score:80, verdict:'Hire',          role:'Data Analyst',     avatar:'PN', risk:'Low' },
  c4: { name:'Remala Sharma',   rank:4, score:72, verdict:'Maybe',         role:'Graphic Designer', avatar:'RS', risk:'Medium' },
  c5: { name:'James Okafor',    rank:5, score:68, verdict:'Maybe',         role:'UX/UI Designer',   avatar:'JO', risk:'Medium' },
  c6: { name:'Leo Fernandez',   rank:6, score:63, verdict:'Waitlist',      role:'SEO Specialist',   avatar:'LF', risk:'Medium' },
};

const SCORES = [
  { label:'Logical Thinking', score:88 },
  { label:'Debugging',        score:82 },
  { label:'Efficiency',       score:76 },
  { label:'Search Dependency',score:45 },
  { label:'Output Accuracy',  score:91 },
];

const TIMELINE = [
  { phase:'Logic Writing', pct:35, color:'#22c55e' },
  { phase:'Debugging',     pct:28, color:'#3b82f6' },
  { phase:'Searching',     pct:22, color:'#f59e0b' },
  { phase:'Idle',          pct:15, color:'#e5e7eb' },
];

const SEARCH_DATA = [
  { tool:'ChatGPT',    mins:14, color:'#10b981' },
  { tool:'Google',     mins:22, color:'#3b82f6' },
  { tool:'Claude',     mins:5,  color:'#8b5cf6' },
  { tool:'Stack Overflow', mins:8, color:'#f59e0b' },
];

const CODE_VERSIONS = [
  { v:'v1.0', time:'10:05', note:'Initial approach — brute force O(n²)', lines:18 },
  { v:'v1.1', time:'10:18', note:'Optimised — added edge case checks',   lines:24 },
  { v:'v1.2', time:'10:31', note:'Refactored using binary search O(log n)', lines:31 },
  { v:'v1.3', time:'10:39', note:'Final — added input validation + tests',  lines:37 },
];

const AI_INSIGHTS = [
  { type:'positive', msg:'Strong iterative thinking — improved solution across 4 versions' },
  { type:'positive', msg:'Good debugging pattern — identified root cause quickly' },
  { type:'warning',  msg:'High AI dependency — used ChatGPT for 14 minutes' },
  { type:'positive', msg:'Efficient search strategy — focused queries, not scattered' },
  { type:'warning',  msg:'Idle time 15% — minor attention gaps detected' },
];

const ALL_LOGS = [
  { t:'10:00:01', cat:'SYSTEM',  msg:'Test initialized — candidate environment ready',     col:'blue' },
  { t:'10:00:45', cat:'SYSTEM',  msg:'Camera lock confirmed — monitoring active',           col:'blue' },
  { t:'10:01:10', cat:'EDITOR',  msg:'File created: solution.py',                          col:'green' },
  { t:'10:02:15', cat:'IDLE',    msg:'No activity detected for 90 seconds',                col:'yellow' },
  { t:'10:04:00', cat:'EDITOR',  msg:'Writing logic — 12 keystrokes/min',                 col:'green' },
  { t:'10:05:10', cat:'EDITOR',  msg:'Writing logic — function defined: solve()',           col:'green' },
  { t:'10:08:30', cat:'BROWSER', msg:'Opened: google.com',                                col:'blue' },
  { t:'10:09:05', cat:'SEARCH',  msg:'"binary search python implementation"',              col:'yellow' },
  { t:'10:10:20', cat:'BROWSER', msg:'Opened: stackoverflow.com/questions/…',             col:'blue' },
  { t:'10:12:40', cat:'BROWSER', msg:'Opened: chat.openai.com',                           col:'yellow' },
  { t:'10:13:05', cat:'AI TOOL', msg:'ChatGPT session started — 14 min total',            col:'yellow' },
  { t:'10:18:22', cat:'EDITOR',  msg:'Code updated — v1.1 (24 lines)',                    col:'green' },
  { t:'10:20:00', cat:'CODE',    msg:'Run attempt #1 — FAILED: IndexError',               col:'red' },
  { t:'10:22:15', cat:'DEBUG',   msg:'Fixing error — modifying loop boundary',            col:'yellow' },
  { t:'10:25:10', cat:'CODE',    msg:'Run attempt #2 — PASSED: all test cases',           col:'green' },
  { t:'10:28:00', cat:'BROWSER', msg:'Opened: google.com',                                col:'blue' },
  { t:'10:28:30', cat:'SEARCH',  msg:'"binary search edge cases empty array"',            col:'yellow' },
  { t:'10:31:44', cat:'EDITOR',  msg:'Refactored — v1.2 binary search approach',         col:'green' },
  { t:'10:35:00', cat:'CODE',    msg:'Run attempt #3 — PASSED: optimised',                col:'green' },
  { t:'10:37:00', cat:'EDITOR',  msg:'Adding input validation and docstrings',             col:'green' },
  { t:'10:39:30', cat:'EDITOR',  msg:'Final version v1.3 — 37 lines',                    col:'green' },
  { t:'10:40:00', cat:'SYSTEM',  msg:'Submission complete — test ended',                  col:'blue' },
];

const LOG_COLOR = { green:'text-green-400', yellow:'text-yellow-400', red:'text-red-400', blue:'text-blue-400' };
const CAT_FILTER = ['All','EDITOR','BROWSER','AI TOOL','IDLE','CODE','SYSTEM'];

/* ─── sub-components ────────────────────────────────────────── */
function ScoreBar({ label, score }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="font-bold" style={{ color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }}>{score}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width:`${score}%`, background: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' }}/>
      </div>
    </div>
  );
}

function TerminalModal({ name, onClose }) {
  const [filter, setFilter] = useState('All');
  const logs = filter === 'All' ? ALL_LOGS : ALL_LOGS.filter(l => l.cat === filter);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gray-950 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-gray-700 shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900">
          <div className="flex items-center gap-3">
            <Terminal size={16} className="text-green-400"/>
            <div>
              <span className="text-green-400 font-mono text-sm font-bold">{name}</span>
              <span className="text-gray-500 font-mono text-xs ml-3">SESSION: VM-2025-0412</span>
              <span className="ml-3 text-xs bg-green-900 text-green-400 px-2 py-0.5 rounded-full">COMPLETED</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"/>
              <div className="w-3 h-3 rounded-full bg-yellow-500"/>
              <div className="w-3 h-3 rounded-full bg-green-500"/>
            </div>
            <button onClick={onClose} className="ml-3 text-gray-400 hover:text-white p-1"><X size={16}/></button>
          </div>
        </div>

        {/* filter tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-800 bg-gray-900 flex-wrap">
          <Filter size={13} className="text-gray-500 mr-1"/>
          {CAT_FILTER.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all
                ${filter === f ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* logs */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-6 space-y-0.5">
          {logs.map((l, i) => (
            <div key={i} className="flex gap-3 hover:bg-gray-900 px-2 py-0.5 rounded">
              <span className="text-gray-500 shrink-0">[{l.t}]</span>
              <span className={`shrink-0 w-16 font-bold ${LOG_COLOR[l.col]}`}>{l.cat}:</span>
              <span className="text-gray-300">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
export default function CandidateReport() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [showTerminal, setShowTerminal] = useState(false);
  const candidate = CANDIDATES[id] || CANDIDATES.c1;

  const verdictColor = {
    'Strong Hire':'bg-green-100 text-green-800 border-green-200',
    'Hire':       'bg-blue-100 text-blue-800 border-blue-200',
    'Maybe':      'bg-amber-100 text-amber-800 border-amber-200',
    'Waitlist':   'bg-gray-100 text-gray-700 border-gray-200',
  }[candidate.verdict] || 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ProNavbar/>
      {showTerminal && <TerminalModal name={candidate.name} onClose={() => setShowTerminal(false)}/>}

      <div className="max-w-5xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Back */}
        <button onClick={() => navigate('/vm-analysis')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft size={16}/> Back to VM Analysis
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {candidate.avatar}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
              <span className={`text-sm font-bold px-3 py-1 rounded-full border ${verdictColor}`}>{candidate.verdict}</span>
            </div>
            <p className="text-gray-500 mt-1">{candidate.role}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-2xl font-black text-green-600">{candidate.score}</p>
                <p className="text-xs text-gray-400">Total Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-gray-800">#{candidate.rank}</p>
                <p className="text-xs text-gray-400">Rank</p>
              </div>
              <div className="text-center">
                <p className={`text-sm font-bold ${candidate.risk === 'Low' ? 'text-green-600' : 'text-amber-500'}`}>{candidate.risk}</p>
                <p className="text-xs text-gray-400">Risk Level</p>
              </div>
            </div>
          </div>
          <button onClick={() => setShowTerminal(true)}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-green-400 px-5 py-3 rounded-xl font-mono font-semibold text-sm transition-all border border-gray-700">
            <Terminal size={16}/> View Full Logs
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Score Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><TrendingUp size={16} className="text-green-600"/> Score Breakdown</h2>
            {SCORES.map(s => <ScoreBar key={s.label} {...s}/>)}
          </div>

          {/* Time Distribution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock size={16} className="text-green-600"/> Approach Timeline</h2>
            <div className="flex h-8 rounded-xl overflow-hidden mb-4">
              {TIMELINE.map(t => (
                <div key={t.phase} style={{ width:`${t.pct}%`, background:t.color }} title={`${t.phase}: ${t.pct}%`}/>
              ))}
            </div>
            <div className="space-y-2">
              {TIMELINE.map(t => (
                <div key={t.phase} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ background:t.color }}/>
                    <span className="text-gray-700">{t.phase}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{t.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Search & Tool Usage */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Globe size={16} className="text-green-600"/> Search & Tool Usage</h2>
            <div className="space-y-3">
              {SEARCH_DATA.map(s => (
                <div key={s.tool}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{s.tool}</span>
                    <span className="text-gray-500">{s.mins} min</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width:`${(s.mins/22)*100}%`, background:s.color }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Code Evolution */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Code size={16} className="text-green-600"/> Code Evolution</h2>
            <div className="space-y-3">
              {CODE_VERSIONS.map((v, i) => (
                <div key={v.v} className={`flex gap-3 p-3 rounded-xl border ${i === CODE_VERSIONS.length-1 ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                  <span className="text-xs font-mono font-black text-green-700 bg-green-100 px-2 py-1 rounded-lg h-fit">{v.v}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium">{v.note}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{v.time} · {v.lines} lines</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Zap size={16} className="text-green-600"/> AI Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AI_INSIGHTS.map((ins, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${ins.type === 'positive' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                {ins.type === 'positive'
                  ? <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5"/>
                  : <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5"/>}
                <p className={`text-sm font-medium ${ins.type === 'positive' ? 'text-green-800' : 'text-amber-800'}`}>{ins.msg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Proctoring */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield size={16} className="text-green-600"/> Proctoring Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Camera Active',     val:'Yes ✓', ok:true },
              { label:'Suspicious Events', val:'2 flags', ok:false },
              { label:'Tab Switches',      val:'7 times', ok:true },
              { label:'AI Tool Usage',     val:'14 min', ok:false },
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-xl border ${item.ok ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`font-bold text-sm ${item.ok ? 'text-green-700' : 'text-amber-700'}`}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

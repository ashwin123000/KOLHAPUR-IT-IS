import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Monitor, Play, Cpu, Clock, Shield, Zap, CheckCircle2, Loader2 } from 'lucide-react';

/* ─── VM Launch Screen ──────────────────────────────────────────────────── */
export default function VMLaunch() {
  const navigate = useNavigate();
  const location = useLocation();

  // testStatus: "not_started" | "launching" | "live"
  const [testStatus, setTestStatus] = useState('not_started');
  const [progress, setProgress] = useState(0);
  const [statusLine, setStatusLine] = useState('');

  // Pull job context from navigation state if passed
  const jobTitle = location.state?.jobTitle || 'AI Internship – NLP & Transformer Models';
  const jobCompany = location.state?.company || 'Zaggle AI Labs';
  const skills = location.state?.skills || ['Python', 'NLP', 'Transformers'];
  const duration = location.state?.duration || '90 min';

  const BOOT_SEQUENCE = [
    'Allocating VM instance...',
    'Mounting secure file system...',
    'Installing Python 3.11 runtime...',
    'Loading VS Code extensions...',
    'Configuring browser sandbox...',
    'Establishing proctoring session...',
    'Environment ready — launching DevOS...',
  ];

  const handleLaunch = () => {
    if (testStatus !== 'not_started') return;
    setTestStatus('launching');
    setProgress(0);

    let step = 0;
    const total = BOOT_SEQUENCE.length;

    const interval = setInterval(() => {
      if (step < total) {
        setStatusLine(BOOT_SEQUENCE[step]);
        setProgress(Math.round(((step + 1) / total) * 100));
        step++;
      } else {
        clearInterval(interval);
        setTestStatus('live');
        setTimeout(() => navigate('/vm-live', { state: { jobTitle, jobCompany, skills, duration } }), 600);
      }
    }, 320);
  };

  // Auto-launch hint countdown (purely visual, user still clicks)
  const [hint, setHint] = useState(5);
  useEffect(() => {
    if (testStatus !== 'not_started') return;
    const t = setInterval(() => setHint(h => Math.max(0, h - 1)), 1000);
    return () => clearInterval(t);
  }, [testStatus]);

  return (
    <div className="min-h-screen bg-[#0f1113] text-white flex flex-col items-center justify-center p-6 font-sans">

      {/* Top badge */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-8">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">VM Test Environment</span>
      </div>

      {/* Main card */}
      <div className="w-full max-w-lg bg-[#16191c] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/10">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-green-900/40">
            <Monitor size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-center text-white mb-1">Launch VM Test Environment</h1>
          <p className="text-gray-400 text-sm text-center">{jobTitle}</p>
          <p className="text-gray-500 text-xs text-center mt-0.5">{jobCompany}</p>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-3 gap-px bg-white/5 border-b border-white/10">
          {[
            { icon: Clock, label: 'Duration', value: duration },
            { icon: Shield, label: 'Proctored', value: 'AI Monitored' },
            { icon: Cpu, label: 'Environment', value: 'Isolated VM' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#16191c] px-4 py-4 text-center">
              <Icon size={16} className="text-gray-500 mx-auto mb-1.5" />
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="text-xs font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div className="px-8 py-5 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-3">Skills Being Tested</p>
          <div className="flex gap-2 flex-wrap">
            {skills.map(s => (
              <span key={s} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Boot progress — only visible while launching */}
        {testStatus === 'launching' && (
          <div className="px-8 py-5 border-b border-white/10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 font-mono">{statusLine}</p>
              <span className="text-xs font-bold text-green-400">{progress}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Live redirect confirmation */}
        {testStatus === 'live' && (
          <div className="px-8 py-5 border-b border-white/10 flex items-center justify-center gap-3 text-green-400">
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">Environment ready — entering DevOS...</span>
          </div>
        )}

        {/* CTA */}
        <div className="px-8 py-6">
          {testStatus === 'not_started' && (
            <>
              <button
                onClick={handleLaunch}
                className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 text-white py-4 rounded-xl font-black text-base transition-all shadow-lg shadow-green-900/40 mb-3"
              >
                <Play size={20} fill="currentColor" />
                Start Test — Launch DevOS
              </button>
              {hint > 0 && (
                <p className="text-center text-xs text-gray-600">
                  Auto-hint: preparing your environment in {hint}s (click to launch now)
                </p>
              )}
            </>
          )}

          {testStatus === 'launching' && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 bg-green-900/50 text-green-400 border border-green-700/40 py-4 rounded-xl font-black text-base cursor-not-allowed"
            >
              <Loader2 size={20} className="animate-spin" />
              Initializing VM...
            </button>
          )}

          {testStatus === 'live' && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 bg-green-500/20 text-green-300 border border-green-500/30 py-4 rounded-xl font-black text-base cursor-not-allowed"
            >
              <Zap size={20} />
              Launching environment...
            </button>
          )}
        </div>
      </div>

      {/* Warning notice */}
      <div className="mt-6 flex items-start gap-3 max-w-lg bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
        <Shield size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          By launching, you consent to AI-monitored screen recording for the duration of this test.
          Your activity — including browser usage and code edits — will be logged and analyzed.
        </p>
      </div>

      <button
        onClick={() => navigate('/bidder-management')}
        className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
      >
        ← Back to VM Test Manager
      </button>
    </div>
  );
}

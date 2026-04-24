import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Monitor, Clock, CheckCircle2, AlertCircle, Play,
  FileText, X, Loader2, Zap, CalendarClock, ChevronRight
} from "lucide-react";

/* ─── Mock VM Test Data ───────────────────────────────────────────────────── */
const MOCK_TESTS = [
  {
    projectId: "vm-1",
    title: "AI Internship – NLP & Transformer Models",
    company: "Zaggle AI Labs",
    status: "live",
    scheduledTime: null,
    duration: "90 min",
    skills: ["Python", "NLP", "Transformers"],
  },
  {
    projectId: "vm-2",
    title: "Full-Stack GenAI Developer",
    company: "GenCraft",
    status: "scheduled",
    scheduledTime: new Date(Date.now() + 1 * 60 * 60 * 1000 + 20 * 60 * 1000 + 15 * 1000).toISOString(), // 1h 20m 15s
    duration: "60 min",
    skills: ["React", "Node.js", "LLM APIs"],
  },
  {
    projectId: "vm-3",
    title: "ML Engineer – Computer Vision",
    company: "VisionAI Labs",
    status: "eligible",
    scheduledTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
    duration: "75 min",
    skills: ["Python", "OpenCV", "PyTorch"],
  },
  {
    projectId: "vm-4",
    title: "Data Analyst – Business Intelligence",
    company: "ConverzLab",
    status: "completed",
    scheduledTime: null,
    duration: "45 min",
    skills: ["SQL", "Tableau", "Python"],
  },
  {
    projectId: "vm-5",
    title: "Prompt Engineer – AI Products",
    company: "Promptly AI",
    status: "eligible",
    scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration: "60 min",
    skills: ["LLM", "Prompt Engineering", "Python"],
  },
];

/* ─── Status Config ──────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  eligible: {
    label: "Eligible for VM Test",
    dot: "bg-green-500",
    badge: "bg-green-500/15 text-green-400 border-green-500/30",
    glow: false,
  },
  scheduled: {
    label: "VM Test Scheduled",
    dot: "bg-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
    glow: false,
  },
  live: {
    label: "Test Live Now",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-400 border-red-500/30",
    glow: true,
  },
  completed: {
    label: "Test Completed",
    dot: "bg-gray-500",
    badge: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    glow: false,
  },
};

/* ─── Countdown Hook ─────────────────────────────────────────────────────── */
function useCountdown(targetISO) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!targetISO) return;
    const tick = () => {
      const diff = new Date(targetISO) - Date.now();
      if (diff <= 0) { setRemaining("00:00:00"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetISO]);

  return remaining;
}

/* ─── Sidebar Card ───────────────────────────────────────────────────────── */
function SidebarCard({ project, active, onClick }) {
  const cfg = STATUS_CONFIG[project.status];
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg cursor-pointer transition-all ${
        active
          ? "bg-blue-600 shadow-lg shadow-blue-900/20"
          : "bg-white/5 hover:bg-white/10"
      }`}
    >
      <p className="font-medium truncate text-sm">{project.title}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${project.status === 'live' ? 'animate-pulse' : ''}`} />
        <p className="text-xs opacity-70 uppercase tracking-wider">{cfg.label}</p>
      </div>
    </div>
  );
}

/* ─── Timer Display ──────────────────────────────────────────────────────── */
function TimerDisplay({ scheduledTime }) {
  const countdown = useCountdown(scheduledTime);
  return (
    <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 rounded-xl">
      <Clock size={14} className="text-yellow-400" />
      <span className="text-yellow-300 font-mono font-bold text-sm tracking-widest">
        Starts in {countdown}
      </span>
    </div>
  );
}

/* ─── Not-Started Modal ──────────────────────────────────────────────────── */
function NotStartedModal({ project, onClose }) {
  const cfg = STATUS_CONFIG[project.status];
  const countdown = useCountdown(project.scheduledTime);
  const daysUntil = project.scheduledTime
    ? Math.ceil((new Date(project.scheduledTime) - Date.now()) / 86400000)
    : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#16191c] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <CalendarClock size={22} className="text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">VM Test Info</p>
            <h3 className="font-bold text-white">{project.title}</h3>
          </div>
        </div>

        <div className="bg-black/30 rounded-xl p-4 mb-5">
          {project.status === "scheduled" && countdown ? (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Your VM test begins in</p>
              <p className="text-3xl font-mono font-black text-yellow-300 tracking-widest">{countdown}</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-2">Test starts in approximately</p>
              <p className="text-2xl font-black text-green-400">
                {daysUntil === 1 ? "1 day" : `${daysUntil} days`}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-5">
          {[
            { label: "Duration", value: project.duration },
            { label: "Skills Tested", value: project.skills.join(", ") },
            { label: "Company", value: project.company },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold py-3 rounded-xl transition-all"
        >
          Got it, I'll Prepare
        </button>
      </div>
    </div>
  );
}

/* ─── Main Panel ─────────────────────────────────────────────────────────── */
function MainPanel({ project, onStartVM, onShowModal }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[project.status];
  const countdown = useCountdown(project.scheduledTime);
  const daysUntil = project.scheduledTime
    ? Math.ceil((new Date(project.scheduledTime) - Date.now()) / 86400000)
    : null;

  const handleCTA = () => {
    if (project.status === "live") {
      navigate("/vm-launch", {
        state: {
          jobTitle: project.title,
          company: project.company,
          skills: project.skills,
          duration: project.duration,
        }
      });
    } else if (project.status === "completed") {
      navigate("/candidate/" + project.projectId);
    } else {
      onShowModal();
    }
  };

  return (
    <>
      {/* HEADER */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#16191c]">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold">{project.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${cfg.badge} ${cfg.glow ? 'shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse' : ''}`}>
                {project.status === "live" && <span className="mr-1">🔴</span>}
                {project.status === "scheduled" && <span className="mr-1">🟡</span>}
                {project.status === "eligible" && <span className="mr-1">🟢</span>}
                {project.status === "completed" && <span className="mr-1">⚫</span>}
                {cfg.label}
              </span>
            </div>
          </div>

          {/* Scheduled timer in header */}
          {project.status === "scheduled" && countdown && (
            <TimerDisplay scheduledTime={project.scheduledTime} />
          )}
        </div>

        {/* CTA Button */}
        <CTAButton status={project.status} onClick={handleCTA} />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 p-6 overflow-y-auto bg-[#0f1113] space-y-5">

        {/* Status Detail Card */}
        <StatusDetailCard project={project} countdown={countdown} daysUntil={daysUntil} cfg={cfg} />

        {/* Test Info Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Clock, label: "Duration", value: project.duration },
            { icon: Monitor, label: "Environment", value: "Isolated VM" },
            { icon: FileText, label: "Skills Assessed", value: project.skills.length + " topics" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <Icon size={16} className="text-gray-400 mb-2" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {/* Skill Tags */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Skills Being Tested</p>
          <div className="flex gap-2 flex-wrap">
            {project.skills.map(s => (
              <span key={s} className="text-xs bg-blue-500/10 border border-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">What to Expect</p>
          <ul className="space-y-2.5">
            {[
              "A sandboxed browser-based VM environment will launch",
              "You will be given a coding task based on the skills above",
              "Your screen activity will be recorded and analyzed by AI",
              "Results and match score will appear in your dashboard within 24 hours",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                <ChevronRight size={14} className="text-blue-400 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-[#16191c] border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {project.company} · VM Test Environment v2.1
          </div>
          <CTAButton status={project.status} onClick={handleCTA} />
        </div>
      </div>
    </>
  );
}

/* ─── CTA Button ─────────────────────────────────────────────────────────── */
function CTAButton({ status, onClick }) {
  if (status === "live") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-wide transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
      >
        <Play size={14} fill="currentColor" /> Start VM Test
      </button>
    );
  }
  if (status === "completed") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
      >
        <FileText size={14} /> View Report
      </button>
    );
  }
  if (status === "scheduled") {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-yellow-500/20"
      >
        <Zap size={14} /> Prepare
      </button>
    );
  }
  // eligible
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md shadow-green-900/30"
    >
      <Monitor size={14} /> View Test Details
    </button>
  );
}

/* ─── Status Detail Card ─────────────────────────────────────────────────── */
function StatusDetailCard({ project, countdown, daysUntil, cfg }) {
  if (project.status === "live") {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-red-400 font-black uppercase tracking-widest text-sm">Test is LIVE</span>
        </div>
        <p className="text-sm text-gray-300 leading-relaxed">
          Your VM test environment is active and ready. Click <strong className="text-white">"Start VM Test"</strong> to enter the sandboxed coding environment. Your session will be monitored and AI-analyzed.
        </p>
      </div>
    );
  }

  if (project.status === "scheduled") {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <CalendarClock size={18} className="text-yellow-400" />
          <span className="text-yellow-300 font-bold text-sm">Test Scheduled — Countdown Active</span>
        </div>
        <div className="text-center py-3">
          <p className="text-xs text-gray-400 mb-1">Starts in</p>
          <p className="text-4xl font-mono font-black text-yellow-300 tracking-widest">{countdown}</p>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Use this time to review the required skills and prepare your environment.</p>
      </div>
    );
  }

  if (project.status === "eligible") {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 size={18} className="text-green-400" />
          <span className="text-green-300 font-bold text-sm">You are Eligible!</span>
        </div>
        <p className="text-sm text-gray-300">
          Test starts in approximately <strong className="text-white">{daysUntil === 1 ? "1 day" : `${daysUntil} days`}</strong>. You'll receive a notification when the VM environment is ready.
        </p>
      </div>
    );
  }

  // completed
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-3 mb-2">
        <CheckCircle2 size={18} className="text-gray-400" />
        <span className="text-gray-300 font-bold text-sm">Test Completed — Awaiting Results</span>
      </div>
      <p className="text-sm text-gray-400">
        Your VM session has been submitted for AI analysis. Results and your match score will be available in the report within 24 hours.
      </p>
    </div>
  );
}

/* ─── MAIN EXPORT ────────────────────────────────────────────────────────── */
export default function BidderManagement() {
  const [selectedId, setSelectedId] = useState(MOCK_TESTS[0].projectId);
  const [modalProject, setModalProject] = useState(null);

  const currentProject = MOCK_TESTS.find(p => p.projectId === selectedId);

  return (
    <div className="flex h-screen bg-[#0f1113] text-white font-sans">

      {/* SIDEBAR */}
      <div className="w-1/4 border-r border-white/10 p-6 overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <Monitor size={18} className="text-blue-400" />
          <h2 className="text-xl font-bold text-gray-300">Your VM Tests</h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <span className="text-[10px] text-gray-500 capitalize">{key}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {MOCK_TESTS.map(p => (
            <SidebarCard
              key={p.projectId}
              project={p}
              active={selectedId === p.projectId}
              onClick={() => setSelectedId(p.projectId)}
            />
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentProject ? (
          <MainPanel
            project={currentProject}
            onShowModal={() => setModalProject(currentProject)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Monitor size={40} className="mx-auto mb-3 opacity-30" />
              <p>Select a VM test to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* NOT STARTED MODAL */}
      {modalProject && (
        <NotStartedModal
          project={modalProject}
          onClose={() => setModalProject(null)}
        />
      )}
    </div>
  );
}
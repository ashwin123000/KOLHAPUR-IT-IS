function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function TimerBar({ timeLeft, durationMinutes }) {
  const totalSeconds = Math.max(1, (durationMinutes || 0) * 60);
  const progress = Math.min(100, Math.max(0, (timeLeft / totalSeconds) * 100));
  const urgent = timeLeft <= 300;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Time Remaining</p>
        <span className={`font-mono text-lg font-bold ${urgent ? "text-rose-400" : "text-slate-100"}`}>
          {formatTime(timeLeft)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${urgent ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

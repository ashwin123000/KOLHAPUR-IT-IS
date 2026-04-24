export default function OutputConsole({ output, running }) {
  return (
    <div className="h-full rounded-xl border border-slate-800 bg-[#050816] p-4 text-sm text-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Console</p>
        {running ? <span className="text-xs text-emerald-400">Running...</span> : null}
      </div>
      {!output ? (
        <p className="text-slate-500">Run code to inspect stdout, stderr, exit code, and timeout state.</p>
      ) : (
        <div className="space-y-3">
          <ConsoleBlock label="Stdout" value={output.stdout} tone="text-emerald-300" />
          <ConsoleBlock label="Stderr" value={output.stderr} tone="text-rose-300" />
          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            <span className="rounded-full bg-slate-900 px-3 py-1">Exit {output.exitCode}</span>
            <span className="rounded-full bg-slate-900 px-3 py-1">{output.timedOut ? "Timed out" : "Completed"}</span>
            <span className="rounded-full bg-slate-900 px-3 py-1">{output.executionTimeMs || 0} ms</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsoleBlock({ label, value, tone }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <pre className={`max-h-36 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 ${tone}`}>
        {value || "(empty)"}
      </pre>
    </div>
  );
}

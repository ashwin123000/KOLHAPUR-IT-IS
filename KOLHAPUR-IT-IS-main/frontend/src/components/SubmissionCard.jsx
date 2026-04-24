export default function SubmissionCard({ submission }) {
  const violations = submission.session?.violations || {};
  const answers = submission.answers || {};
  const output = submission.lastRunOutput || {};
  const timeTakenMinutes = submission.session?.timeTakenSeconds
    ? Math.max(1, Math.round(submission.session.timeTakenSeconds / 60))
    : null;

  return (
    <article className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xl font-black text-slate-900">{submission.seeker?.name || "Unnamed candidate"}</p>
          <p className="mt-1 text-sm text-slate-500">
            {submission.seeker?.careerTrajectory || "Candidate"}
            {submission.matchScore ? ` · Match ${submission.matchScore}%` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">Runs {submission.runCount || 0}</span>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">Flags {submission.violationCount || 0}</span>
          {timeTakenMinutes ? <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Time {timeTakenMinutes} min</span> : null}
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">Tabs {violations.tabSwitches || 0}</span>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">Focus {violations.focusLoss || 0}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">Paste {violations.copyPasteAttempts || 0}</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
        <div className="space-y-4">
          <Section title="Final Code">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
              {submission.code || "(no code)"}
            </pre>
          </Section>
          <Section title="Last Run Output">
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-xs text-emerald-200">
              {output.stdout || "(empty stdout)"}
              {output.stderr ? `\n\n[stderr]\n${output.stderr}` : ""}
            </pre>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Reasoning Answers">
            <Answer label="Approach" value={answers.approach} />
            <Answer label="Complexity" value={answers.complexity} />
            <Answer label="Tradeoffs" value={answers.tradeoffs} />
            <Answer label="Edge Cases" value={answers.edgeCases} />
          </Section>
          <Section title="Camera Preview">
            <div className="grid grid-cols-2 gap-2">
              {(submission.session?.cameraSnapshots || []).map((frame, index) => (
                <img
                  key={`${submission._id}-${index}`}
                  src={frame.imageBase64}
                  alt="snapshot"
                  className="aspect-[4/3] w-full rounded-lg object-cover"
                />
              ))}
              {!submission.session?.cameraSnapshots?.length ? (
                <p className="col-span-2 text-sm text-slate-500">No preview frames captured.</p>
              ) : null}
            </div>
          </Section>
        </div>
      </div>
    </article>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {children}
    </section>
  );
}

function Answer({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm text-slate-700">{value || "-"}</p>
    </div>
  );
}

const FALLBACK_QUESTIONS = [
  { key: "approach", label: "Your approach", placeholder: "Walk through the logic you chose and how you landed there." },
  { key: "complexity", label: "Time and space complexity", placeholder: "Explain the runtime and memory profile of your final solution." },
  { key: "tradeoffs", label: "Tradeoffs and alternatives", placeholder: "What other approach did you consider and why did you reject it?" },
  { key: "edgeCases", label: "Edge cases", placeholder: "List the tricky cases you handled or intentionally skipped." },
];

export default function QAForm({ questions = FALLBACK_QUESTIONS, answers, onChange, onSubmit, submitting }) {
  const ready = Object.values(answers).every((value) => value.trim().length >= 10);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {questions.map((question) => (
        <div key={question.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-bold text-slate-800">{question.label}</label>
          <textarea
            value={answers[question.key]}
            onChange={(event) => onChange(question.key, event.target.value)}
            placeholder={question.placeholder}
            rows={6}
            className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-400"
          />
          <p className="mt-2 text-right text-xs text-slate-400">{answers[question.key].length} chars</p>
        </div>
      ))}

      <button
        type="button"
        disabled={!ready || submitting}
        onClick={onSubmit}
        className={`w-full rounded-xl px-5 py-3 font-bold text-white ${ready ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-400"} `}
      >
        {submitting ? "Submitting..." : "Submit Final Assessment"}
      </button>
    </div>
  );
}

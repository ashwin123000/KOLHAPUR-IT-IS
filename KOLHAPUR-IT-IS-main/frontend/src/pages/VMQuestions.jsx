import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { vmAssessmentAPI } from "../services/api";

export default function VMQuestions() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["vm-questions", sessionId],
    queryFn: async () => (await vmAssessmentAPI.questions(sessionId)).data,
    refetchInterval: (query) => (query.state.data?.status === "ready" ? false : 3000),
  });

  const submitMutation = useMutation({
    mutationFn: async () =>
      (
        await vmAssessmentAPI.answers(
          sessionId,
          (data?.questions || []).map((question) => ({
            question_index: question.index,
            answer: answers[question.index] || "",
          }))
        )
      ).data,
    onSuccess: () => navigate(`/vm/${sessionId}/result`),
  });

  const ready = data?.status === "ready";
  const canSubmit = useMemo(
    () => ready && (data?.questions || []).every((question) => (answers[question.index] || "").trim().length > 0),
    [answers, data?.questions, ready]
  );

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Explain Your Code</p>
        <h1 className="mt-3 text-4xl font-black">Answer backend-generated questions</h1>

        {isLoading || !ready ? (
          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900 p-8">
            <div className="flex items-center gap-3 text-slate-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing your code... generating questions
            </div>
            <div className="mt-6 space-y-4">
              <div className="h-24 animate-pulse rounded-2xl bg-slate-800" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-800" />
              <div className="h-24 animate-pulse rounded-2xl bg-slate-800" />
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-10 rounded-2xl border border-rose-900 bg-rose-950/60 px-5 py-4 text-sm text-rose-200">
            {error?.response?.data?.detail || error.message || "Failed to load questions"}
          </div>
        ) : null}

        {ready ? (
          <div className="mt-10 space-y-6">
            {data.questions.map((question) => (
              <section key={question.index} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                  {question.type} {question.line_reference ? `• line ${question.line_reference}` : ""}
                </p>
                <h2 className="mt-3 text-lg font-bold text-slate-100">{question.text}</h2>
                <textarea
                  value={answers[question.index] || ""}
                  onChange={(event) => setAnswers((current) => ({ ...current, [question.index]: event.target.value }))}
                  className="mt-5 min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-4 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              </section>
            ))}
            <button
              onClick={() => submitMutation.mutate()}
              disabled={!canSubmit || submitMutation.isPending}
              className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Answers"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

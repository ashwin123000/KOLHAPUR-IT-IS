import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { assessmentAPI } from "../services/api";

export default function AssessmentResult() {
  const { assessmentId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    const load = async () => {
      try {
        const response = await assessmentAPI.getVmFreelancerResults(assessmentId);
        setData(response.data);
        setError("");
        if (response.data?.status === "grading_in_progress") {
          timer = window.setTimeout(load, 10000);
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message || "Failed to load result");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => window.clearTimeout(timer);
  }, [assessmentId]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /></div>;
  }

  if (error) {
    return <div className="min-h-screen bg-slate-50 px-6 py-8"><div className="mx-auto max-w-4xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div></div>;
  }

  if (data?.status === "grading_in_progress") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-900">Your submission is being graded</h1>
          <p className="mt-2 text-sm text-slate-500">This page refreshes automatically every 10 seconds.</p>
        </div>
      </div>
    );
  }

  const score = data?.score || {};
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {data?.auto_submitted ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This submission was auto-submitted due to: {data.violation_reason || "policy enforcement"}
          </div>
        ) : null}

        {data?.status === "grading_failed" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Grading failed. The submission was stored, but the scoring engine could not complete.
          </div>
        ) : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-600">Assessment Result</p>
          <div className="mt-4 flex flex-wrap items-end gap-8">
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Score</p>
              <h1 className="text-5xl font-black text-slate-900">{Number(score.total_score || 0).toFixed(0)}/100</h1>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Percentile</p>
              <p className="text-2xl font-black text-slate-900">Better than {Number(score.percentile || 0).toFixed(2)}% of candidates</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {(data?.answers || []).map((answer, index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-black text-slate-900">Question {index + 1}</p>
              <p className="mt-3 text-sm font-semibold text-slate-500">Scenario</p>
              <p className="mt-1 text-sm leading-7 text-slate-700">{answer.scenario}</p>
              <p className="mt-4 text-sm font-semibold text-slate-500">Your Answer</p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-800">{answer.answer_text}</p>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-700">{answer.llm_feedback || "No feedback stored."}</p>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">{answer.llm_score ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

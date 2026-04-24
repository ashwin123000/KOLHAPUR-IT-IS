import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import CodeEditor from "../components/CodeEditor";
import { assessmentAPI } from "../services/api";

export default function AssessmentTake() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const escWarningRef = useRef(0);
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fullscreenBlocked, setFullscreenBlocked] = useState(false);
  const [payload, setPayload] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [activeFile, setActiveFile] = useState(0);
  const [answers, setAnswers] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await assessmentAPI.takeVmAssessment(assessmentId);
      setPayload(response.data);
      await document.documentElement.requestFullscreen();
    } catch (err) {
      const message = err?.response?.data?.error || err.message || "Failed to load assessment";
      if (message.toLowerCase().includes("fullscreen")) {
        setFullscreenBlocked(true);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const triggerSubmit = useCallback(async (reason = null, forced = false) => {
    if (!payload || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const body = {
        submission_id: payload.submission_id,
        auto_submitted: forced,
        violation_reason: reason,
        answers: (payload.questions || []).map((question) => ({
          question_id: question.id,
          answer_text: answers[question.id] || "",
        })),
      };
      await assessmentAPI.submitVmAssessment(assessmentId, body);
      navigate(`/assessments/${assessmentId}/result`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to submit assessment");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [assessmentId, answers, navigate, payload]);

  useEffect(() => {
    if (!payload) return undefined;

    const onVisibility = () => {
      if (document.hidden) void triggerSubmit("tab_switch", true);
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) void triggerSubmit("fullscreen_exit", true);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now - escWarningRef.current < 3000) {
        void triggerSubmit("esc_key", true);
      } else {
        escWarningRef.current = now;
        setError("ESC is disabled during assessment. Pressing it again within 3 seconds will auto-submit.");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [payload, triggerSubmit]);

  const questions = payload?.questions || [];
  const files = payload?.codebase?.files || [];
  const current = questions[currentQuestion];
  const answeredCount = useMemo(
    () => questions.filter((question) => (answers[question.id] || "").trim().length >= 200).length,
    [answers, questions]
  );
  const canSubmit = questions.length > 0 && answeredCount === questions.length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading assessment...
        </div>
      </div>
    );
  }

  if (fullscreenBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-md rounded-3xl border border-amber-500/40 bg-slate-900 p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-4 text-2xl font-black">Fullscreen required</h1>
          <p className="mt-2 text-sm text-slate-300">You must allow fullscreen to proceed with the assessment.</p>
          <button onClick={() => void load()} className="mt-6 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950">
            Retry Fullscreen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">VM Assessment</p>
          <h1 className="mt-1 text-2xl font-black">{payload?.assessment?.title}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{answeredCount}/{questions.length} answered</p>
          <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {error ? <div className="border-b border-rose-900 bg-rose-950/60 px-6 py-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid min-h-[calc(100vh-89px)] grid-cols-[40%,60%]">
        <div className="border-r border-slate-800 p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <button
                key={`${file.filename}-${index}`}
                onClick={() => setActiveFile(index)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${index === activeFile ? "bg-emerald-500 text-slate-950" : "bg-slate-900 text-slate-300"}`}
              >
                {file.filename}
              </button>
            ))}
          </div>
          <div className="h-[calc(100vh-170px)]">
            <CodeEditor
              language={payload?.assessment?.language}
              value={files[activeFile]?.content || ""}
              onChange={() => {}}
              readOnly
            />
          </div>
        </div>

        <div className="p-6">
          {current ? (
            <div className="mx-auto flex h-full max-w-4xl flex-col">
              <p className="text-sm font-semibold text-emerald-400">Question {currentQuestion + 1} of {questions.length}</p>
              <div className="mt-6 space-y-5">
                <section>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Scenario</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{current.scenario}</p>
                </section>
                <section>
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Task</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-200">{current.task}</p>
                </section>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pattern A</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{current.pattern_a}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Pattern B</p>
                    <p className="mt-2 text-sm leading-7 text-slate-200">{current.pattern_b}</p>
                  </div>
                </div>
                <textarea
                  rows={14}
                  value={answers[current.id] || ""}
                  onChange={(event) => setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: event.target.value }))}
                  placeholder="Write an answer grounded in the provided codebase. Minimum 200 characters."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-4 text-sm leading-7 text-slate-100 outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-slate-400">{(answers[current.id] || "").length} characters</p>
              </div>

              <div className="mt-auto flex items-center justify-between pt-6">
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
                    disabled={currentQuestion === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </button>
                  <button
                    onClick={() => setCurrentQuestion((value) => Math.min(questions.length - 1, value + 1))}
                    disabled={currentQuestion === questions.length - 1}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-200 disabled:opacity-40"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!window.confirm("Are you sure? This cannot be undone.")) return;
                    void triggerSubmit(null, false);
                  }}
                  disabled={!canSubmit || submitting}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40"
                >
                  {submitting ? "Submitting..." : "Submit Assessment"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Code2, Loader2, Play, RotateCcw, Send } from "lucide-react";

import { assessmentAPI } from "../services/api";
import CameraMonitor from "../components/CameraMonitor";
import CodeEditor from "../components/CodeEditor";
import OutputConsole from "../components/OutputConsole";
import QAForm from "../components/QAForm";
import TimerBar from "../components/TimerBar";
import ViolationBadge from "../components/ViolationBadge";

const DEFAULT_REASONING_QUESTIONS = [
  {
    key: "approach",
    label: "Your approach",
    placeholder: "Walk through the logic you chose and how you landed there.",
  },
  {
    key: "complexity",
    label: "Time and space complexity",
    placeholder: "Explain the runtime and memory profile of your final solution.",
  },
  {
    key: "tradeoffs",
    label: "Tradeoffs and alternatives",
    placeholder: "What other approach did you consider and why did you reject it?",
  },
  {
    key: "edgeCases",
    label: "Edge cases",
    placeholder: "List the tricky cases you handled or intentionally skipped.",
  },
];

export default function TestPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState("loading");
  const [test, setTest] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [submittingCode, setSubmittingCode] = useState(false);
  const [submittingAnswers, setSubmittingAnswers] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const [violations, setViolations] = useState({
    tabSwitches: 0,
    focusLoss: 0,
    copyPasteAttempts: 0,
    contextMenuAttempts: 0,
  });
  const [answers, setAnswers] = useState({
    approach: "",
    complexity: "",
    tradeoffs: "",
    edgeCases: "",
  });

  const autoSubmitRef = useRef(false);
  const loadSession = useCallback(async () => {
    setPhase("loading");
    setLoadingError("");
    setSubmitError("");
    setCameraError("");
    autoSubmitRef.current = false;

    try {
      const testResponse = await assessmentAPI.getByJob(jobId);
      const nextTest = testResponse.data;
      setTest(nextTest);
      setCode(nextTest.starterCode || "");

      if (nextTest.alreadySubmitted) {
        setPhase("submitted");
        return;
      }

      const sessionResponse = await assessmentAPI.startSession({
        testId: nextTest._id,
        jobId,
      });
      const nextSession = sessionResponse.data;
      setSessionId(nextSession.sessionId);

      const startedAt = new Date(nextSession.startedAt).getTime();
      const totalSeconds = Number(nextSession.durationMinutes || nextTest.durationMinutes || 0) * 60;
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setTimeLeft(Math.max(0, totalSeconds - elapsedSeconds));
      setPhase("coding");
    } catch (error) {
      setLoadingError(error.response?.data?.detail || error.message || "Failed to load the assessment workspace.");
      setPhase("error");
    }
  }, [jobId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (phase !== "coding" || !sessionId) return undefined;

    const timerId = window.setInterval(() => {
      setTimeLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [phase, sessionId]);

  useEffect(() => {
    if (phase !== "coding" || timeLeft > 0 || autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    void handleSubmitCode(true);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase !== "coding" || !sessionId) return undefined;

    const fireViolation = async (payload, localKey) => {
      setViolations((current) => ({
        ...current,
        [localKey]: (current[localKey] || 0) + 1,
      }));

      try {
        await assessmentAPI.logProctorEvent(sessionId, payload);
      } catch {
        setSubmitError("A proctoring event could not be recorded. Keep working; the session is still active.");
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        void fireViolation({ type: "TAB_SWITCH" }, "tabSwitches");
      }
    };

    const onBlur = () => {
      void fireViolation({ type: "FOCUS_LOSS" }, "focusLoss");
    };

    const onCopy = () => {
      void fireViolation({ type: "COPY_PASTE" }, "copyPasteAttempts");
    };

    const onPaste = () => {
      void fireViolation({ type: "COPY_PASTE" }, "copyPasteAttempts");
    };

    const onContextMenu = (event) => {
      event.preventDefault();
      void fireViolation({ type: "COPY_PASTE" }, "contextMenuAttempts");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [phase, sessionId]);

  const handleSnapshot = useCallback(
    async (imageBase64) => {
      if (!sessionId) return;
      try {
        await assessmentAPI.uploadSnapshot(sessionId, imageBase64);
      } catch {
        setCameraError("Camera frames could not be uploaded. Your recruiter will still see that proctoring was attempted.");
      }
    },
    [sessionId]
  );

  const handleRunCode = async () => {
    if (!sessionId || !test || !code.trim()) return;
    setRunning(true);
    setSubmitError("");
    try {
      const response = await assessmentAPI.runSessionCode(sessionId, {
        code,
        language: test.language,
        stdin,
      });
      setOutput(response.data);
    } catch (error) {
      setOutput({
        stdout: "",
        stderr: error.response?.data?.detail || error.message || "Code execution failed.",
        exitCode: 1,
        timedOut: false,
        executionTimeMs: 0,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmitCode = async (automatic = false) => {
    if (!automatic && !code.trim()) return;
    if (!sessionId || !test || submittingCode) return;

    setSubmittingCode(true);
    setSubmitError("");
    try {
      const response = await assessmentAPI.submitSessionCode(sessionId, {
        code,
        language: test.language,
        lastRunOutput: output,
      });
      setSubmissionId(response.data.submissionId);
      setPhase("questions");
    } catch (error) {
      setSubmitError(error.response?.data?.detail || error.message || "Failed to submit code.");
    } finally {
      setSubmittingCode(false);
    }
  };

  const handleSubmitAnswers = async () => {
    if (!submissionId || submittingAnswers) return;

    setSubmittingAnswers(true);
    setSubmitError("");
    try {
      await assessmentAPI.finalizeSession(submissionId, answers);
      setPhase("submitted");
    } catch (error) {
      setSubmitError(error.response?.data?.detail || error.message || "Failed to submit your answers.");
    } finally {
      setSubmittingAnswers(false);
    }
  };

  const reasoningQuestions = useMemo(
    () => test?.reasoningQuestions || DEFAULT_REASONING_QUESTIONS,
    [test]
  );

  const proctorBadges = useMemo(
    () => [
      { label: "Tab", count: violations.tabSwitches, tone: "amber" },
      { label: "Focus", count: violations.focusLoss, tone: "rose" },
      { label: "Paste", count: violations.copyPasteAttempts, tone: "blue" },
    ],
    [violations]
  );

  if (phase === "loading") {
    return (
      <FullPageState
        title="Loading assessment"
        subtitle="Preparing the coding workspace and restoring any existing session."
        loading
      />
    );
  }

  if (phase === "error") {
    return (
      <FullPageState
        title="Assessment unavailable"
        subtitle={loadingError}
        action={
          <div className="flex justify-center gap-3">
            <button
              onClick={loadSession}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-500"
            >
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            <button
              onClick={() => navigate("/freelancer-dashboard")}
              className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-white"
            >
              Back to dashboard
            </button>
          </div>
        }
      />
    );
  }

  if (phase === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
        <div className="max-w-lg rounded-[32px] border border-emerald-500/20 bg-slate-900 p-10 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Assessment Submitted</p>
          <h1 className="mt-4 text-4xl font-black text-white">You are done.</h1>
          <p className="mt-4 text-slate-400">
            Your final code, console output, written reasoning, and proctoring data are attached to this application.
          </p>
          <button
            onClick={() => navigate("/freelancer-dashboard")}
            className="mt-8 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-500"
          >
            Return to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (phase === "questions") {
    return (
      <div className="min-h-screen bg-slate-100 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Step 2 of 2</p>
              <h1 className="mt-3 text-4xl font-black text-slate-900">Explain your reasoning</h1>
              <p className="mt-3 max-w-3xl text-slate-500">
                Finish the assessment by walking through your approach, complexity, tradeoffs, and edge cases.
              </p>
            </div>
            <button
              onClick={() => navigate("/freelancer-dashboard")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
          </div>

          {submitError ? <InlineError message={submitError} /> : null}

          <QAForm
            questions={reasoningQuestions}
            answers={answers}
            onChange={(key, value) => setAnswers((current) => ({ ...current, [key]: value }))}
            onSubmit={handleSubmitAnswers}
            submitting={submittingAnswers}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90 px-6 py-4">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-4">
          <button
            onClick={() => navigate("/freelancer-dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-black">{test?.title}</p>
            <p className="truncate text-sm text-slate-400">
              {(test?.language || "").toUpperCase()} · {test?.durationMinutes} minutes · Visibility and clipboard activity are recorded
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {proctorBadges.map((badge) => (
              <ViolationBadge key={badge.label} {...badge} />
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1600px] gap-4 px-6 py-6 xl:grid-cols-[0.9fr,1.1fr]">
        <section className="space-y-4">
          <TimerBar timeLeft={timeLeft} durationMinutes={test?.durationMinutes} />

          <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              <Code2 className="h-4 w-4" />
              Problem Statement
            </div>
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-200">{test?.description}</p>
          </div>

          <CameraMonitor
            active={phase === "coding" && Boolean(sessionId)}
            onSnapshot={handleSnapshot}
            onError={() =>
              setCameraError("Camera access was denied. Recruiters will still see that proctoring could not start.")
            }
            snapshotMs={60000}
          />

          {cameraError ? <InlineWarn message={cameraError} /> : null}
          {submitError ? <InlineError message={submitError} /> : null}
        </section>

        <section className="grid min-h-[80vh] gap-4 xl:grid-rows-[minmax(420px,1fr),280px]">
          <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Solution</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={running || !code.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run Code
                </button>
                <button
                  onClick={() => handleSubmitCode(false)}
                  disabled={submittingCode || !code.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  {submittingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submittingCode ? "Submitting..." : "Submit Code"}
                </button>
              </div>
            </div>
            <div className="h-[calc(100%-40px)]">
              <CodeEditor language={test?.language} value={code} onChange={setCode} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.45fr,0.55fr]">
            <div className="rounded-[24px] border border-slate-800 bg-slate-900 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Custom Input</p>
              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                placeholder="Optional stdin for trial runs"
                className="h-[calc(100%-24px)] w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none"
              />
            </div>
            <OutputConsole output={output} running={running} />
          </div>
        </section>
      </main>
    </div>
  );
}

function FullPageState({ title, subtitle, action, loading = false }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-lg rounded-[28px] border border-slate-800 bg-slate-900 p-8 text-center">
        {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" /> : null}
        <h1 className="mt-4 text-3xl font-black text-white">{title}</h1>
        <p className="mt-3 text-slate-400">{subtitle}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

function InlineError({ message }) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
      {message}
    </div>
  );
}

function InlineWarn({ message }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4" />
        <p>{message}</p>
      </div>
    </div>
  );
}

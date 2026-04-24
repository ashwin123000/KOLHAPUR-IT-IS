import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileCode2, Loader2, Power, RefreshCw, Save } from "lucide-react";

import SubmissionCard from "../components/SubmissionCard";
import { assessmentAPI, clientDashboardAPI } from "../services/api";

const EMPTY_FORM = {
  title: "",
  description: "",
  starterCode: "",
  language: "python",
  durationMinutes: 60,
};

export default function RecruiterTestManager() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const clientId = localStorage.getItem("userId") || "";

  const [form, setForm] = useState(EMPTY_FORM);
  const [job, setJob] = useState(null);
  const [test, setTest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [reasoningQuestions, setReasoningQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const hydrateForm = useCallback((nextTest) => {
    if (!nextTest) {
      setForm(EMPTY_FORM);
      return;
    }
    setForm({
      title: nextTest.title || "",
      description: nextTest.description || "",
      starterCode: nextTest.starterCode || "",
      language: nextTest.language || "python",
      durationMinutes: nextTest.durationMinutes || 60,
    });
  }, []);

  const load = useCallback(
    async (mode = "full") => {
      if (mode === "full") {
        setLoading(true);
      } else {
        setReloading(true);
      }
      setError("");

      try {
        const [jobsResponse, configResponse, submissionsResponse] = await Promise.all([
          clientDashboardAPI.getJobs(clientId),
          assessmentAPI.getTestConfig(jobId),
          assessmentAPI.getSubmissions(jobId).catch(() => ({ data: { submissions: [], test: null, totalCount: 0 } })),
        ]);

        const nextJob = (jobsResponse.data?.jobs || []).find((item) => item._id === jobId) || null;
        const nextTest = configResponse.data?.test || submissionsResponse.data?.test || null;
        setJob(nextJob);
        setTest(nextTest);
        setReasoningQuestions(configResponse.data?.reasoningQuestions || submissionsResponse.data?.reasoningQuestions || []);
        setSubmissions(submissionsResponse.data?.submissions || []);
        hydrateForm(nextTest);
      } catch (loadError) {
        setError(loadError.response?.data?.detail || loadError.message || "Failed to load the recruiter assessment workspace.");
      } finally {
        setLoading(false);
        setReloading(false);
      }
    },
    [clientId, hydrateForm, jobId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const submissionMetrics = useMemo(() => {
    const totalRuns = submissions.reduce((sum, submission) => sum + Number(submission.runCount || 0), 0);
    const flagged = submissions.filter((submission) => Number(submission.violationCount || 0) > 0).length;
    return {
      total: submissions.length,
      flagged,
      avgRuns: submissions.length ? (totalRuns / submissions.length).toFixed(1) : "0.0",
    };
  }, [submissions]);

  const handleFieldChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFormError("");
  };

  const validateForm = () => {
    if (form.title.trim().length < 5) return "Title must be at least 5 characters.";
    if (form.description.trim().length < 20) return "Description must be at least 20 characters.";
    const duration = Number(form.durationMinutes);
    if (Number.isNaN(duration) || duration < 10 || duration > 180) return "Duration must be between 10 and 180 minutes.";
    if (!form.language) return "Language is required.";
    return "";
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      await assessmentAPI.saveTestConfig(jobId, {
        ...form,
        durationMinutes: Number(form.durationMinutes),
      });
      await load("refresh");
    } catch (saveError) {
      setFormError(saveError.response?.data?.detail || saveError.message || "Failed to save assessment settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!test?._id) return;
    setToggling(true);
    setError("");
    try {
      await assessmentAPI.toggleTest(test._id);
      await load("refresh");
    } catch (toggleError) {
      setError(toggleError.response?.data?.detail || toggleError.message || "Failed to change test status.");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-semibold text-slate-600 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Loading recruiter assessment workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate("/client-dashboard")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" /> Client dashboard
            </button>
            <p className="mt-3 text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Coding Assessment Manager</p>
            <h1 className="mt-2 text-4xl font-black text-slate-900">{job?.basicDetails?.projectTitle || "Project Assessment"}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Create one live coding prompt tied to this job, then review final code, written reasoning, and proctoring signals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => load("refresh")}
              disabled={reloading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-white disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleToggle}
              disabled={!test?._id || toggling}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
              {test?.isActive ? "Deactivate Test" : "Activate Test"}
            </button>
          </div>
        </div>

        {error ? <Message tone="error" message={error} /> : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              <FileCode2 className="h-4 w-4 text-emerald-500" />
              Assessment Definition
            </div>

            <div className="space-y-4">
              <Field label="Challenge Title">
                <input
                  value={form.title}
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </Field>

              <Field label="Problem Description">
                <textarea
                  value={form.description}
                  onChange={(event) => handleFieldChange("description", event.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Language">
                  <select
                    value={form.language}
                    onChange={(event) => handleFieldChange("language", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                  >
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </Field>

                <Field label="Duration (minutes)">
                  <input
                    type="number"
                    min="10"
                    max="180"
                    value={form.durationMinutes}
                    onChange={(event) => handleFieldChange("durationMinutes", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
                  />
                </Field>
              </div>

              <Field label="Starter Code">
                <textarea
                  value={form.starterCode}
                  onChange={(event) => handleFieldChange("starterCode", event.target.value)}
                  rows={12}
                  className="w-full rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none"
                />
              </Field>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Reasoning Follow-up</p>
                <div className="mt-3 grid gap-3">
                  {(reasoningQuestions || []).map((question) => (
                    <div key={question.key} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{question.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{question.placeholder}</p>
                    </div>
                  ))}
                </div>
              </div>

              {formError ? <Message tone="error" message={formError} compact /> : null}

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : test ? "Update Test" : "Create Test"}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Submission Feed</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">{submissionMetrics.total} candidate submissions</h2>
                </div>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Test Status</p>
                  <p className="mt-1 font-black text-slate-900">{test ? (test.isActive ? "Active" : "Inactive") : "Draft"}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Metric title="Visible" value={test?.isActive ? "Yes" : "No"} />
                <Metric title="Language" value={(test?.language || form.language).toUpperCase()} />
                <Metric title="Duration" value={`${test?.durationMinutes || form.durationMinutes} min`} />
                <Metric title="Flagged" value={submissionMetrics.flagged} />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Metric title="Average Runs" value={submissionMetrics.avgRuns} />
                <Metric title="Submitted" value={submissionMetrics.total} />
              </div>
            </div>

            <div className="space-y-4">
              {submissions.length ? (
                submissions.map((submission) => <SubmissionCard key={submission._id} submission={submission} />)
              ) : (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
                  <p className="text-lg font-semibold text-slate-700">No assessment submissions yet</p>
                  <p className="mt-2 text-sm">
                    Once candidates finish the assessment, their code, reasoning answers, run counts, violations, and camera previews will appear here.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function Message({ tone, message, compact = false }) {
  const styles =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className={`rounded-xl border px-4 py-3 ${styles} ${compact ? "text-sm" : ""}`}>
      {message}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

import { assessmentAPI, clientDashboardAPI } from "../services/api";

const emptyQuestion = () => ({
  scenario: "",
  task: "",
  pattern_a: "",
  pattern_b: "",
  rubric: { score_0: "", score_50: "", score_100: "" },
});

export default function AssessmentCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clientId = localStorage.getItem("userId") || "";
  const preselectedJob = searchParams.get("jobId") || "";
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    job_id: preselectedJob,
    title: "",
    language: "python",
    files: [],
    questions: [emptyQuestion()],
  });

  useEffect(() => {
    clientDashboardAPI.getJobs(clientId)
      .then((response) => setJobs(response.data?.jobs || []))
      .catch((err) => setError(err.response?.data?.error || err.message || "Failed to load jobs"))
      .finally(() => setLoadingJobs(false));
  }, [clientId]);

  const canAddQuestion = form.questions.length < 5;
  const selectedJobTitle = useMemo(() => {
    const job = jobs.find((item) => item._id === form.job_id);
    return job?.basicDetails?.projectTitle || "";
  }, [form.job_id, jobs]);

  const updateQuestion = (index, patch) => {
    setForm((current) => ({
      ...current,
      questions: current.questions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    const nextFiles = await Promise.all(
      files.map(async (file, index) => ({
        filename: file.name,
        content: await file.text(),
        is_primary: form.files.length === 0 && index === 0,
      }))
    );
    setForm((current) => ({ ...current, files: [...current.files, ...nextFiles] }));
  };

  const validate = () => {
    if (!form.job_id) return "Select a job";
    if (!form.title.trim()) return "Assessment title is required";
    if (!form.files.length) return "Upload at least one file";
    for (const file of form.files) {
      if (!file.filename || !file.content) return "Each uploaded file must include a name and content";
    }
    for (const question of form.questions) {
      if (!question.scenario || !question.task || !question.pattern_a || !question.pattern_b) {
        return "Each question must include scenario, task, and both patterns";
      }
      if (!question.rubric.score_0 || !question.rubric.score_50 || !question.rubric.score_100) {
        return "Each question needs all three rubric levels";
      }
    }
    return "";
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await assessmentAPI.createVmAssessment(form);
      const assessmentId = response.data?.assessment_id;
      navigate(`/client-assessments/${assessmentId}/leaderboard`);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to create assessment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">VM Assessment</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Create Assessment</h1>
          <p className="mt-2 text-sm text-slate-500">
            Build a real codebase-driven assessment for one job. Everything here persists to the app database.
          </p>
        </div>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Job</span>
              <select
                value={form.job_id}
                onChange={(event) => setForm((current) => ({ ...current, job_id: event.target.value }))}
                disabled={loadingJobs}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="">{loadingJobs ? "Loading jobs..." : "Select a job"}</option>
                {jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.basicDetails?.projectTitle || "Untitled project"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Assessment Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Language</span>
              <select
                value={form.language}
                onChange={(event) => setForm((current) => ({ ...current, language: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
            </label>

            <div className="rounded-2xl border border-dashed border-slate-300 p-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
                <Upload className="h-4 w-4" />
                Upload Codebase Files
                <input type="file" multiple className="hidden" onChange={(event) => void handleFiles(event.target.files)} />
              </label>
              <div className="mt-4 space-y-2">
                {form.files.length === 0 ? (
                  <p className="text-sm text-slate-500">No files uploaded yet.</p>
                ) : (
                  form.files.map((file, index) => (
                    <div key={`${file.filename}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{file.filename}</p>
                        <p className="text-xs text-slate-500">{file.is_primary ? "Primary file" : "Supporting file"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setForm((current) => ({
                            ...current,
                            files: current.files.map((item, itemIndex) => ({
                              ...item,
                              is_primary: itemIndex === index,
                            })),
                          }))}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          Make Primary
                        </button>
                        <button
                          onClick={() => setForm((current) => ({
                            ...current,
                            files: current.files.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({
                              ...item,
                              is_primary: itemIndex === 0 ? true : item.is_primary,
                            })),
                          }))}
                          className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Questions</p>
                <p className="text-xs text-slate-500">Up to five questions, each with a real grading rubric.</p>
              </div>
              <button
                onClick={() => canAddQuestion && setForm((current) => ({ ...current, questions: [...current.questions, emptyQuestion()] }))}
                disabled={!canAddQuestion}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Question
              </button>
            </div>

            {form.questions.map((question, index) => (
              <div key={index} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">Question {index + 1}</p>
                  {form.questions.length > 1 ? (
                    <button
                      onClick={() => setForm((current) => ({ ...current, questions: current.questions.filter((_, itemIndex) => itemIndex !== index) }))}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : null}
                </div>
                <textarea
                  rows={3}
                  placeholder="Scenario"
                  value={question.scenario}
                  onChange={(event) => updateQuestion(index, { scenario: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
                <textarea
                  rows={3}
                  placeholder="Task"
                  value={question.task}
                  onChange={(event) => updateQuestion(index, { task: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <textarea
                    rows={3}
                    placeholder="Pattern A"
                    value={question.pattern_a}
                    onChange={(event) => updateQuestion(index, { pattern_a: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                  <textarea
                    rows={3}
                    placeholder="Pattern B"
                    value={question.pattern_b}
                    onChange={(event) => updateQuestion(index, { pattern_b: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
                <div className="grid gap-3">
                  <textarea
                    rows={2}
                    placeholder="Rubric score 0"
                    value={question.rubric.score_0}
                    onChange={(event) => updateQuestion(index, { rubric: { ...question.rubric, score_0: event.target.value } })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                  <textarea
                    rows={2}
                    placeholder="Rubric score 50"
                    value={question.rubric.score_50}
                    onChange={(event) => updateQuestion(index, { rubric: { ...question.rubric, score_50: event.target.value } })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                  <textarea
                    rows={2}
                    placeholder="Rubric score 100"
                    value={question.rubric.score_100}
                    onChange={(event) => updateQuestion(index, { rubric: { ...question.rubric, score_100: event.target.value } })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-900">{selectedJobTitle || "No job selected"}</p>
            <p className="text-xs text-slate-500">{form.files.length} files, {form.questions.length} questions</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

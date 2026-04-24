import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import CodeEditor from "../components/CodeEditor";
import { vmAssessmentAPI } from "../services/api";

function normalizeVmProjects(payload) {
  const rawProjects = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.projects)
        ? payload.projects
        : payload && typeof payload === "object"
          ? [payload]
          : [];

  return rawProjects.map((project) => ({
    ...project,
    project_id: project.project_id || project.id,
    required_skills: project.required_skills || project.skills_required || [],
  }));
}

export default function VMWorkspace() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [code, setCode] = useState("");
  const [terminal, setTerminal] = useState({ stdout: "", stderr: "", exit_code: 0 });
  const [loadError, setLoadError] = useState("");
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    vmAssessmentAPI
      .result(sessionId)
      .then((resultResponse) => {
        if (!mounted) return;
        if (resultResponse.data?.status === "evaluated") {
          navigate(`/vm/${sessionId}/result`, { replace: true });
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [navigate, sessionId]);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      try {
        const response = await vmAssessmentAPI.session(sessionId);
        const payload = response.data?.data || response.data || {};
        const fallbackProject = payload.project || null;
        if (mounted) {
          setSession({
            status: payload.status || "active",
            project: fallbackProject,
            language: payload.language || fallbackProject?.environment?.language || "python",
          });
          setCode(payload.code || fallbackProject?.environment?.starter_code || "");
        }
      } catch (err) {
        if (mounted) setLoadError(err?.response?.data?.detail || err.message || "Failed to load workspace");
      }
    };
    void loadSession();
    return () => {
      mounted = false;
    };
  }, [sessionId]);

  const autosaveMutation = useMutation({
    mutationFn: async (nextCode) => (await vmAssessmentAPI.autosave(sessionId, nextCode)).data,
  });

  const runMutation = useMutation({
    mutationFn: async () => (await vmAssessmentAPI.run(sessionId, code, session?.language || "python")).data,
    onSuccess: (data) => setTerminal(data),
  });

  const submitMutation = useMutation({
    mutationFn: async () => (await vmAssessmentAPI.submit(sessionId, code, session?.language || "python")).data,
    onSuccess: () => navigate(`/vm/${sessionId}/questions`),
  });

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      if (code.trim()) autosaveMutation.mutate(code);
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [autosaveMutation, code]);

  const terminalStatus = useMemo(() => {
    if (runMutation.isPending) return "Running code...";
    if (terminal.exit_code === 124) return "Execution timed out after 10 seconds.";
    return terminal.exit_code === 0 ? "Ready" : "Review stderr";
  }, [runMutation.isPending, terminal.exit_code]);

  if (loadError) {
    return <div className="min-h-screen bg-slate-950 px-6 py-10 text-rose-200">{loadError}</div>;
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="mr-3 h-4 w-4 animate-spin" /> Preparing workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-6 py-4">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">VM Workspace</p>
        <h1 className="mt-2 text-2xl font-black">{session.project?.title || "Coding Session"}</h1>
      </div>

      <div className="grid min-h-[calc(100vh-89px)] grid-rows-[1fr,220px]">
        <div className="p-6">
          <CodeEditor language={session.language} value={code} onChange={setCode} />
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending}
              className="rounded-2xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-100 disabled:opacity-50"
            >
              {runMutation.isPending ? "Running..." : "Run Code"}
            </button>
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Code"}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-900/80 px-6 py-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Terminal</h2>
            <span className="text-xs text-slate-400">{terminalStatus}</span>
          </div>
          <div className="mt-4 grid h-[150px] gap-3 overflow-auto md:grid-cols-2">
            <pre className="rounded-2xl bg-slate-950 p-4 text-xs text-emerald-300">{terminal.stdout || "stdout will appear here"}</pre>
            <pre className="rounded-2xl bg-slate-950 p-4 text-xs text-rose-300">{terminal.stderr || "stderr will appear here"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

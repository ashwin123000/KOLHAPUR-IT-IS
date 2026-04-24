import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

export default function VMProjectList() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ["vm-projects"],
    queryFn: async () => (await vmAssessmentAPI.getProjects()).data,
  });

  const startMutation = useMutation({
    mutationFn: async (projectId) => (await vmAssessmentAPI.start(projectId)).data,
    onSuccess: (payload) => navigate(`/vm/${payload.session_id}`),
  });

  const projects = normalizeVmProjects(data);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">VM Assessments</p>
        <h1 className="mt-3 text-4xl font-black">Start a real coding session</h1>
        <p className="mt-3 max-w-3xl text-slate-300">
          These projects come directly from the backend. Starting a VM creates or resumes your isolated session.
        </p>

        {isLoading ? (
          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading projects...
          </div>
        ) : null}

        {error ? (
          <div className="mt-10 rounded-2xl border border-rose-900 bg-rose-950/60 px-5 py-4 text-sm text-rose-200">
            {error?.response?.data?.detail || error.message || "Failed to load VM projects"}
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.project_id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-2xl font-black">{project.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{project.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(project.required_skills || []).map((skill) => (
                  <span key={skill} className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200">
                    {skill}
                  </span>
                ))}
              </div>
              <button
                disabled={startMutation.isPending || !project.project_id}
                onClick={() => startMutation.mutate(project.project_id)}
                className="mt-8 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-50"
              >
                {startMutation.isPending && startMutation.variables === project.project_id ? "Starting VM..." : "Start VM Test"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

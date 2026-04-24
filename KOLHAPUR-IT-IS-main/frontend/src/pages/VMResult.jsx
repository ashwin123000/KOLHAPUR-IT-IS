import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useParams } from "react-router-dom";

import CodeEditor from "../components/CodeEditor";
import { vmAssessmentAPI } from "../services/api";

export default function VMResult() {
  const { sessionId } = useParams();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const resultQuery = useQuery({
    queryKey: ["vm-result", sessionId],
    queryFn: async () => (await vmAssessmentAPI.result(sessionId)).data,
    refetchInterval: (query) => (query.state.data?.status === "evaluated" ? false : 5000),
  });

  const projectId = resultQuery.data?.project_id;
  const leaderboardQuery = useQuery({
    queryKey: ["vm-leaderboard", projectId],
    queryFn: async () => (await vmAssessmentAPI.leaderboard(projectId)).data,
    enabled: showLeaderboard && Boolean(projectId),
  });

  const improvementQuery = useQuery({
    queryKey: ["vm-improvement", sessionId],
    queryFn: async () => (await vmAssessmentAPI.improvement(sessionId)).data,
    enabled: resultQuery.data?.status === "evaluated",
  });

  if (resultQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="mr-3 h-4 w-4 animate-spin" /> Evaluating your answers...
      </div>
    );
  }

  if (resultQuery.data?.status === "timed_out") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="max-w-lg rounded-3xl border border-amber-500/40 bg-slate-900 p-8 text-center">
          <h1 className="text-3xl font-black">Your session expired due to inactivity.</h1>
          <p className="mt-4 text-slate-300">Your last submitted code has been saved. Restart the VM if you want a new attempt.</p>
        </div>
      </div>
    );
  }

  if (resultQuery.data?.status !== "evaluated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-emerald-400">Evaluation</p>
          <h1 className="mt-4 text-3xl font-black">Evaluating your answers...</h1>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>
    );
  }

  const result = resultQuery.data;
  const leaderboard = leaderboardQuery.data?.leaderboard || [];

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Result</p>
        <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
          <div className="grid gap-8 lg:grid-cols-[280px,1fr]">
            <div>
              <div className="text-6xl font-black text-emerald-400">{result.score}/100</div>
              <p className="mt-4 text-lg font-semibold text-slate-200">
                You ranked #{result.rank} out of {result.total} candidates
              </p>
              <button
                onClick={() => setShowLeaderboard(true)}
                className="mt-6 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950"
              >
                View Leaderboard
              </button>
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.25em] text-slate-400">Reasoning</h2>
              <p className="mt-3 text-sm leading-8 text-slate-200">{result.reasoning}</p>
            </div>
          </div>
        </div>

        {showLeaderboard ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
            <h2 className="text-2xl font-black">Leaderboard</h2>
            {leaderboardQuery.isLoading ? (
              <div className="mt-4 flex items-center gap-3 text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading leaderboard...
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-800">
                <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Candidate</th>
                      <th className="px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {leaderboard.map((entry) => (
                      <tr key={`${entry.user_id}-${entry.rank}`} className="bg-slate-900">
                        <td className="px-4 py-3 font-black text-emerald-400">#{entry.rank}</td>
                        <td className="px-4 py-3">{entry.name}</td>
                        <td className="px-4 py-3">{entry.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {improvementQuery.data?.status === "ready" ? (
          <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
            <h2 className="text-2xl font-black">Improved Solution</h2>
            <p className="mt-2 text-sm text-slate-300">The backend generated an improved version of your submission with inline `# IMPROVEMENT:` notes.</p>
            <div className="mt-6 h-[480px]">
              <CodeEditor language="python" value={improvementQuery.data.improved_code} onChange={() => {}} readOnly />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

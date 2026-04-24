import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { assessmentAPI } from "../services/api";

export default function AssessmentLeaderboard() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const response = await assessmentAPI.getVmLeaderboard(assessmentId);
      setData(response.data?.leaderboard || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [assessmentId]);

  const handleClose = async () => {
    setClosing(true);
    try {
      await assessmentAPI.closeVmAssessment(assessmentId);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to close assessment");
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">VM Assessment</p>
            <h1 className="mt-2 text-4xl font-black text-slate-900">Leaderboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/client-dashboard")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              Back
            </button>
            <button onClick={handleClose} disabled={closing} className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {closing ? "Closing..." : "Close Assessment"}
            </button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading leaderboard...</div>
          ) : data.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No submissions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentile</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Flagged</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={`${item.freelancer_id}-${item.rank}`} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-black text-slate-900">{item.rank}</td>
                      <td className="px-4 py-3 text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-800">{Number(item.total_score || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-800">{Number(item.percentile || 0).toFixed(2)}%</td>
                      <td className="px-4 py-3 text-slate-600">{item.submitted_at || "-"}</td>
                      <td className="px-4 py-3">
                        {item.auto_submitted ? (
                          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-700">
                            {item.violation_reason || "auto_submitted"}
                          </span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { CheckCircle2, Briefcase, Clock, Star, AlertCircle } from 'lucide-react';
import { statsAPI, applyAPI } from '../services/api';

const FreelancerDashboard = () => {
  const userId   = localStorage.getItem('userId')   || '';
  const username = localStorage.getItem('username') || 'Freelancer';

  const [stats, setStats]   = useState({
    totalEarnings: 0, activeProjects: 0, completedProjects: 0,
    applicationsSubmitted: 0, newClients: 0,
  });
  const [assigned, setAssigned] = useState([]);   // projects where hired
  const [applied, setApplied]   = useState([]);   // projects applied to
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    Promise.all([
      statsAPI.getDashboard(userId, 'freelancer'),
      applyAPI.getFreelancerProjects(userId),
    ])
      .then(([statsRes, projRes]) => {
        const s = statsRes.data?.stats || {};
        setStats({
          totalEarnings:         s.totalEarnings         ?? 0,
          activeProjects:        s.activeProjects        ?? 0,
          completedProjects:     s.completedProjects     ?? 0,
          applicationsSubmitted: s.applicationsSubmitted ?? 0,
          newClients:            s.newClients            ?? 0,
        });

        setAssigned(projRes.data?.assigned || []);
        setApplied(projRes.data?.applied   || []);
      })
      .catch(() => {
        // keep default zeros
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // Dummy chart shape — will be replaced by real data when earnings tracking is added
  const chartData = [
    { name: 'Jan', earnings: 0 }, { name: 'Feb', earnings: 0 },
    { name: 'Mar', earnings: 0 }, { name: 'Apr', earnings: 0 },
    { name: 'May', earnings: 0 }, { name: 'Jun', earnings: 0 },
  ];

  const statusBadge = (status) => {
    if (status === 'accepted')    return 'bg-green-100 text-green-700';
    if (status === 'rejected')    return 'bg-red-100   text-red-700';
    if (status === 'in_progress') return 'bg-blue-100  text-blue-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="bg-[#F5F7FA] min-h-screen p-6">
      <div className="max-w-[1300px] mx-auto">

        <h1 className="text-2xl font-semibold mb-6">{username} — Overview</h1>

        {/* ── Hired Banner ─────────────────────────────────────── */}
        {assigned.length > 0 && (
          <div className="mb-6 space-y-3">
            {assigned.map(proj => (
              <div key={proj.id}
                className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-4 shadow-sm"
              >
                <CheckCircle2 size={32} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-green-800 text-lg">🎉 You've been selected!</p>
                  <p className="text-green-700 text-sm mt-0.5">
                    You are now assigned to: <strong>{proj.title}</strong>
                    {proj.clientName && <> (Client: {proj.clientName})</>}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-green-700">
                    <span className="flex items-center gap-1"><Briefcase size={12} /> Budget: ${proj.budget?.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {proj.deadline || 'No deadline'}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${statusBadge(proj.status)}`}>
                      {proj.status?.replace('_',' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Stat Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card title="Total Earnings"     value={loading ? '…' : `$${stats.totalEarnings.toLocaleString()}`} />
          <Card title="Active Projects"    value={loading ? '…' : stats.activeProjects} />
          <Card title="Applications Sent"  value={loading ? '…' : stats.applicationsSubmitted} />
          <Card title="Completed Projects" value={loading ? '…' : stats.completedProjects} />
        </div>

        {/* ── Main Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-6">
          {/* Earnings Chart */}
          <div className="col-span-2 bg-white p-5 rounded-xl shadow-sm">
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold">Earnings Overview</h2>
              <span className="text-sm text-gray-500">${stats.totalEarnings.toLocaleString()}</span>
            </div>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={v => [`$${v}`, 'Earnings']} />
                  <Line type="monotone" dataKey="earnings" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assigned Projects */}
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="font-semibold mb-4">Assigned Projects</h2>
            {loading ? (
              <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}</div>
            ) : assigned.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <AlertCircle size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No assigned projects yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assigned.map(p => (
                  <div key={p.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-800 truncate max-w-[140px]">{p.title}</p>
                      <p className="text-xs text-green-600 font-medium">In Progress</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      ${p.budget?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── My Applications Table ─────────────────────────────── */}
        <div className="bg-white p-5 rounded-xl shadow-sm mt-6">
          <h2 className="font-semibold mb-4">My Applications</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />)}</div>
          ) : applied.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">
              You haven't applied to any projects yet. Browse jobs to get started!
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-gray-500 border-b">
                <tr>
                  <th className="text-left pb-2">Project</th>
                  <th className="text-left pb-2">Client</th>
                  <th className="text-center pb-2">Budget</th>
                  <th className="text-center pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {applied.map((p, i) => (
                  <tr key={i} className="border-t">
                    <td className="py-2 font-medium truncate max-w-[200px]">{p.title}</td>
                    <td className="text-slate-500">{p.clientName || '—'}</td>
                    <td className="text-center text-blue-600 font-semibold">${p.budget?.toLocaleString()}</td>
                    <td className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold capitalize ${statusBadge(p.applicationStatus)}`}>
                        {p.applicationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};

const Card = ({ title, value }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm">
    <p className="text-sm text-gray-500">{title}</p>
    <h2 className="text-xl font-semibold mt-1">{value}</h2>
  </div>
);

export default FreelancerDashboard;
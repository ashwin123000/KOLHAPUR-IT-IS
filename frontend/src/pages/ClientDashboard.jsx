import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { projectsAPI, statsAPI, ratingsAPI, paymentsAPI } from '../services/api';
import { Briefcase, Users, CheckCircle, DollarSign, AlertCircle, TrendingUp, AlertTriangle, Clock } from 'lucide-react';

const CountdownTimer = ({ deadline }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [isLate, setIsLate] = useState(false);

    useEffect(() => {
        if (!deadline) return;
        const interval = setInterval(() => {
            const target = new Date(deadline).getTime();
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                setIsLate(true);
                setTimeLeft("OVERDUE");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
        }, 1000);
        return () => clearInterval(interval);
    }, [deadline]);

    if (!deadline) return <span className="text-gray-400">—</span>;

    return (
        <span className={`font-mono font-bold ${isLate ? 'text-red-500 animate-pulse' : 'text-blue-600'}`}>
            {timeLeft}
        </span>
    );
};

export default function ClientDashboard() {
  const userId = localStorage.getItem('userId') || '';
  const [stats, setStats] = useState({
    totalProjects: 0, openProjects: 0, activeProjects: 0,
    completedProjects: 0, pendingApplications: 0, totalSpent: 0,
  });
  const [projects, setProjects] = useState([]);
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingId, setShowRatingId] = useState(null); // {id, freelancerId}
  const [ratingData, setRatingData] = useState({ stars: 5, feedback: '' });

  const fetchData = () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      statsAPI.getClientStats(userId),
      projectsAPI.getForClient(userId),
    ])
      .then(([dashRes, projRes]) => {
        const d = dashRes.data?.data || {};
        // Safely map the limited stats currently returned by FastAPI
        setStats({
          totalProjects:       d.projects || d.totalProjects || 0,
          openProjects:        d.openProjects || 0,
          activeProjects:      d.activeProjects || 0,
          completedProjects:   d.completedProjects || 0,
          pendingApplications: d.pendingApplications || 0,
          totalSpent:          d.totalSpent || 0,
        });
        setWaitlist(d.waitlist || []);

        const rawProjects = projRes.data?.data || [];
        // ✅ SYNCED: Unpack FastAPI SQLite tuples into React objects
        setProjects(rawProjects.map(p => {
          const isArray = Array.isArray(p);
          return {
            id: isArray ? p[0] : (p.id || p.projectId),
            name: isArray ? p[2] : p.title,
            status: isArray ? p[5] : p.status,
            hiredFreelancerId: isArray ? p[6] : p.assigned_freelancer_id,
            deadlineStr: '—', // Fallback until deadlines are added to your DB schema
            submissionStatus: p.submissionStatus || null
          };
        }));
      })
      .catch((err) => console.error("Dashboard Sync Error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchData();
  }, [userId]);

  const handleRatingSubmit = async () => {
    try {
      // ✅ SYNCED: Payload matches the FastAPI RatingRequest model
      await ratingsAPI.create({
        projectId: showRatingId.id,
        freelancerId: showRatingId.hiredFreelancerId,
        stars: ratingData.stars,
        feedback: ratingData.feedback,
        onTimeStatus: "ON_TIME" // Sent to calculate the freelancer's reliability score
      });

      // Note: paymentsAPI.release is skipped because your FastAPI main.py 
      // automatically generates a 'released' payment inside create_rating_secure!

      alert("Rating submitted and funds released successfully!");
      setShowRatingId(null);
      setRatingData({ stars: 5, feedback: '' });
      fetchData();
    } catch (err) {
      // FastAPI uses 'detail' for HTTPExceptions
      alert(err.response?.data?.detail || err.response?.data?.error || "Transaction failed.");
    }
  };
  const statCards = [
    { label: 'Total Projects',     value: stats.totalProjects,       icon: Briefcase },
    { label: 'Active Projects',    value: stats.activeProjects,       icon: Users },
    { label: 'Pending Applicants', value: stats.pendingApplications,  icon: AlertCircle },
    { label: 'Total Spent',        value: `$${stats.totalSpent.toLocaleString()}`, icon: DollarSign },
  ];

  const chartData = [
    { name: 'Projects', value: stats.totalProjects },
    { name: 'Active',   value: stats.activeProjects },
    { name: 'Done',     value: stats.completedProjects },
    { name: 'Open',     value: stats.openProjects },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white p-6 rounded-xl border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-slate-500 font-medium text-sm">{label}</h3>
                <p className="text-3xl font-bold mt-2 text-slate-800">
                  {loading ? '…' : value}
                </p>
              </div>
              <Icon className="text-slate-300" size={28} />
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-4">At a Glance</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Project Overview</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#336699" strokeWidth={3}
                  dot={{ r: 4, fill: '#336699' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Recent Applicants</h3>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}</div>
          ) : waitlist.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No pending applicants</p>
          ) : (
            <div className="space-y-3">
              {waitlist.map((w, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{w.name}</p>
                    <p className="text-xs text-slate-400">${w.bidAmount?.toLocaleString() || '—'} bid</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">My Projects</h3>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-10 bg-slate-100 rounded animate-pulse"/>)}</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Briefcase size={32} className="mx-auto mb-2 opacity-40" />
            <p>No projects posted yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Time Left</th>
                  <th className="pb-3 font-medium">Analytics</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(proj => (
                   <tr key={proj.id} className="border-b last:border-0 hover:bg-slate-50 transition">
                    <td className="py-4 font-semibold text-slate-800">
                      <div>{proj.name}</div>
                      {proj.hiredFreelancerName && (
                        <div className="text-[10px] text-slate-400 font-normal">Freelancer: {proj.hiredFreelancerName}</div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                        proj.status === 'open' ? 'text-blue-700 bg-blue-100' :
                        proj.status === 'in_progress' ? 'text-emerald-700 bg-emerald-100' :
                        proj.status === 'completed' ? 'text-amber-700 bg-amber-100 animate-pulse' :
                        'text-slate-700 bg-slate-100'
                      }`}>
                        {proj.status?.replace('_',' ')}
                      </span>
                    </td>
                    <td className="py-4 text-xs">
                        {proj.status === 'in_progress' ? <CountdownTimer deadline={proj.deadline} /> : proj.deadlineStr}
                    </td>
                    <td className="py-4">
                      {proj.submissionStatus === 'BEFORE' && (
                        <div className="flex items-center gap-1 text-green-600 font-black text-[10px] uppercase">
                          <TrendingUp size={14} /> Profitable (Early)
                        </div>
                      )}
                      {proj.submissionStatus === 'LATE' && (
                        <div className="flex items-center gap-1 text-red-500 font-black text-[10px] uppercase">
                          <AlertTriangle size={14} /> Loss Detected
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right">
  {(proj.status === 'completed' || proj.status === 'verified') && (
    <button
      onClick={() => setShowRatingId(proj)}
      className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-bold uppercase shadow-sm"
    >
      Release Payment & Rate
    </button>
  )}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRatingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase text-slate-800">Final Verification & Rating</h3>
            <p className="text-sm text-slate-500">Provide final feedback to close this project and release escrowed funds to the freelancer.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 font-mono">Stars (1-5)</label>
                <div className="flex gap-2">
                    {[1,2,3,4,5].map(s => (
                        <button 
                            key={s}
                            onClick={() => setRatingData({...ratingData, stars: s})}
                            className={`flex-1 py-3 rounded-xl font-bold transition ${ratingData.stars === s ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                        >
                            {s}★
                        </button>
                    ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">Feedback</label>
                <textarea 
                  rows={3}
                  value={ratingData.feedback}
                  onChange={(e) => setRatingData({...ratingData, feedback: e.target.value})}
                  placeholder="Summarize your experience..."
                  className="w-full border-none bg-slate-50 rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowRatingId(null)}
                  className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button 
                  onClick={handleRatingSubmit}
                  className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
                >
                  Confirm Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

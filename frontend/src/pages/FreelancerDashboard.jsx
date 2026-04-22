import React, { useState, useEffect, useCallback } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  CheckCircle, Briefcase, Clock, Star, AlertCircle, TrendingUp, AlertTriangle, 
  ExternalLink, ArrowUpRight, ArrowDownRight, Zap, Target, Plus, RefreshCw
} from 'lucide-react';
import { statsAPI, projectsAPI, intelAPI } from '../services/api';
import { realtimeClient } from '../services/realtime';
import CircularTimer from '../components/CircularTimer';
import CountdownTimer from '../components/CountdownTimer';

const FreelancerDashboard = () => {
  const userId   = localStorage.getItem('userId')   || '';
  const username = localStorage.getItem('username') || 'Freelancer';

  const [stats, setStats] = useState({
    totalProjects: 0, completedProjects: 0, activeProjects: 0,
    totalEarnings: 0, applicationsSubmitted: 0, score: 0,
    averageRating: 0, skills: ''
  });
  const [assigned, setAssigned] = useState([]);
  const [applied,  setApplied]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [ratingRefreshing, setRatingRefreshing] = useState(false);
  const [chartRange, setChartRange] = useState(7);
  const [trendingSkills, setTrendingSkills] = useState([]); // Fix #4: real velocity

  // ── Defined with useCallback BEFORE useEffect so the ref is stable ──
  const fetchRatingOnly = useCallback(async () => {
    try {
      setRatingRefreshing(true);
      const res = await statsAPI.getFreelancerStats(userId);
      const d = res.data?.data ?? res.data ?? {};
      setStats(prev => ({
        ...prev,
        averageRating: d.averageRating ?? d.rating ?? prev.averageRating,
        score:         d.score         ?? prev.score,
        totalEarnings: d.totalEarnings ?? prev.totalEarnings,
        completedProjects: d.completedProjects ?? prev.completedProjects,
      }));
    } catch (_) {
      // silent
    } finally {
      setRatingRefreshing(false);
    }
  }, [userId]);

  const fetchData = useCallback(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    
    Promise.all([
      statsAPI.getFreelancerStats(userId),
      projectsAPI.getForFreelancer(userId),
    ])
      .then(([dashRes, projRes]) => {
        const d = dashRes.data?.data || {};
        const payload = projRes.data?.data || projRes.data || [];
        let projects = [];
        if (Array.isArray(payload)) {
          projects = payload;
        } else if (typeof payload === 'object') {
          projects = [...(payload.assigned || []), ...(payload.applied || [])];
        }

        setStats({
          totalProjects: d.totalProjects || 0,
          completedProjects: d.completed || d.completedProjects || 0,
          activeProjects: d.activeProjects || 0,
          totalEarnings: d.totalEarnings || 0,
          applicationsSubmitted: d.applications || d.applicationsSubmitted || 0,
          score: d.reliability_score || d.score || 0,
          averageRating: d.average_rating || d.averageRating || 0,
          skills: d.skills || '',
          growthData: d.growthData || [],
        });

        // Normalize tuples OR objects
        const normalizedProjects = (Array.isArray(projects) ? projects : []).map(p => {
          if (Array.isArray(p)) {
            return {
              id: p[0], projectId: p[0],
              client_id: p[1],
              title: p[2] || 'Untitled',
              description: p[3],
              budget: p[4] || 0,
              status: p[5] || 'open',
              assigned_freelancer_id: p[6],
            };
          }
          return p;
        });

        setAssigned(normalizedProjects.filter(p => p.assigned_freelancer_id === userId));
        setApplied(normalizedProjects.filter(p => p.assigned_freelancer_id !== userId));
      })
      .catch((err) => console.error("Dashboard Fetch Error:", err))
      .finally(() => setLoading(false));
  }, [userId]);

  // Fetch Market Pulse (skill velocity) — Fix #4: real velocity, not COUNT(*)
  useEffect(() => {
    intelAPI.getPulse()
      .then(res => { if (res.data?.trending) setTrendingSkills(res.data.trending); })
      .catch(() => {}); // non-critical — fails silently
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchData();

    const unsubscribeRatings = realtimeClient.subscribe('rating_update', (msg) => {
      if (!msg.freelancerId || msg.freelancerId === userId) setTimeout(fetchRatingOnly, 500);
    });
    const unsubscribeUsers = realtimeClient.subscribe('USER_UPDATE', (msg) => {
      if (!msg.user_id || msg.user_id === userId || msg.data?.id === userId) fetchData();
    });
    const unsubscribeMatches = realtimeClient.subscribe('JOB_MATCH_UPDATE', () => fetchData());

    const onRatingUpdated = () => {
      setTimeout(fetchRatingOnly, 1500);
    };
    window.addEventListener('ratingUpdated', onRatingUpdated);

    return () => {
      window.removeEventListener('ratingUpdated', onRatingUpdated);
      unsubscribeRatings();
      unsubscribeUsers();
      unsubscribeMatches();
    };
  }, [userId, fetchData, fetchRatingOnly]);
  const handleSubmitWork = async (projectId) => {
    try {
      await projectsAPI.submitWork(projectId, userId);
      alert('Work submitted! Waiting for client verification.');
      fetchData();
    } catch {
      alert('Submission failed');
    }
  };

  // ── Star renderer ──────────────────────────────────────────────────
  const renderStars = (rating) =>
    [1, 2, 3, 4, 5].map(i => (
      <Star
        key={i}
        size={14}
        className={
          i <= Math.round(rating)
            ? 'text-amber-400 fill-amber-400'
            : 'text-slate-200 fill-slate-200'
        }
      />
    ));

  // ── Chart data — real-time from statsAPI growthData or project fallback ──
  const chartData = (() => {
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date();
    const n = chartRange; // 7 or 30

    // Build empty result slots
    const result = Array.from({ length: n }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (n - 1 - i));
      const label = n === 7
        ? dayNames[d.getDay()]
        : `${d.getDate()}/${d.getMonth() + 1}`;
      return { name: label, date: d.toISOString().slice(0, 10), earnings: 0 };
    });

    // Use real growthData from backend if available
    if (stats.growthData?.length > 0) {
      stats.growthData.forEach(g => {
        const match = result.find(r => r.date === (g.day || g.date));
        if (match) match.earnings = g.cumulative || g.earnings || g.amount || 0;
      });
      return result;
    }

    // Fallback: use totalEarnings spread across completed projects
    const completedCount = Math.max(stats.completedProjects, 1);
    const earningPerProject = (stats.totalEarnings || 0) / completedCount;

    assigned
      .filter(p => p.status === 'completed' || p.status === 'in_progress')
      .forEach((p, i) => {
        const slotIdx = Math.max(0, n - 1 - (i % n));
        result[slotIdx].earnings += p.budget || earningPerProject || 0;
      });

    // Make cumulative
    let cum = 0;
    return result.map(r => {
  cum += r.earnings;
  return { ...r, earnings: Number(cum.toFixed(2)) };
});
  })();
  if (loading)
    return (
      <div className="p-12 animate-pulse space-y-8">
        <div className="h-40 bg-white rounded-3xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-3xl" />)}
        </div>
        <div className="h-96 bg-white rounded-3xl" />
      </div>
    );

  const activeProject = assigned.find(p => p.status === 'in_progress');

  return (
    <div className="bg-[#F8FAFC] min-h-screen p-8 text-slate-800 font-sans">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              Welcome back, {username}
              <Zap className="text-amber-500 fill-amber-500" size={28} />
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Here's what's happening with your projects today.
            </p>
          </div>

          {/* Rating badge + manual refresh */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
              {username.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 leading-tight">
                Trust Score
              </p>
              <div className="flex items-center gap-1">
                <p className="text-sm font-bold text-slate-800">
                  {stats.score.toFixed(1)}%
                </p>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-0.5">
                  {renderStars(stats.averageRating)}
                  <span className="text-sm font-black text-amber-500 ml-1">
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchRatingOnly}
              title="Refresh rating"
              className="ml-1 p-2 rounded-xl hover:bg-slate-100 transition"
            >
              <RefreshCw
                size={14}
                className={`text-slate-400 transition-transform ${ratingRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* ── Active Project Hero ──────────────────────────────────── */}
        {activeProject ? (
          <div className="relative group overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-blue-900/20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full -mr-20 -mt-20" />
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center gap-2 text-blue-400 font-black text-[10px] uppercase tracking-[0.2em]">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  Active Mission
                </div>
                <h2 className="text-5xl font-black tracking-tighter leading-none">
                  {activeProject.title}
                </h2>
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold border border-white/10">
                    <Briefcase size={16} /> {activeProject.clientName || 'Premium Client'}
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-sm font-bold border border-white/10">
                    <Target size={16} /> ${activeProject.budget?.toLocaleString()} Budget
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center lg:items-end gap-6 bg-[#1A1D21] p-8 rounded-[3rem] border border-white/5 shadow-2xl">
                <CircularTimer deadline={activeProject.deadline} />
                <button
                  onClick={() => handleSubmitWork(activeProject.projectId || activeProject.id)}
                  className="w-full lg:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-lg transition-all hover:scale-105 hover:bg-blue-500 active:scale-95 shadow-xl flex items-center justify-center gap-3"
                >
                  Submit Final Work <ArrowUpRight size={24} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-12 border-2 border-dashed border-slate-200 flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
              <Plus size={40} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">No Active Projects</h3>
            <p className="text-slate-500 max-w-sm">
              You're all caught up! Head over to the job boards to find your next assignment.
            </p>
            <button className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
              Discover Jobs
            </button>
          </div>
        )}

        {/* ── Key Metrics — 5 columns ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalEarnings.toLocaleString()}`}
            icon={<TrendingUp />}
            color="blue"
          />
          <StatCard
            title="Project Success"
            value={stats.completedProjects}
            icon={<CheckCircle />}
            color="emerald"
          />
          <StatCard
            title="Live Applications"
            value={stats.applicationsSubmitted}
            icon={<Star />}
            color="amber"
          />
          <StatCard
            title="Active Sprints"
            value={stats.activeProjects}
            icon={<Zap />}
            color="purple"
          />

          {/* Avg Rating card — live-updating */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg bg-amber-500 shadow-amber-200">
              <Star size={28} fill="white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Avg Rating
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.averageRating.toFixed(1)}
                <span className="text-sm font-bold text-slate-400"> / 5</span>
              </h3>
              <div className="flex mt-1">{renderStars(stats.averageRating)}</div>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Revenue Analytics */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Earnings Performance
              </h3>
              <select
                value={chartRange}
                onChange={(e) => setChartRange(Number(e.target.value))}
                className="bg-slate-50 border-none rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
              </select>
            </div>
            <div className="flex-1" style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="earnings" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ⚡ Market Pulse — Real Skill Velocity (Fix #4) */}
          <div style={{
            background: 'white',
            borderRadius: '2.5rem',
            padding: 32,
            border: '1px solid #f1f5f9',
            boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={18} color="#0f766e" /> Market Pulse
                </h3>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>
                  Velocity = jobs posted this week vs last week. Real demand signal.
                </p>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '5px 12px', borderRadius: 20,
                background: '#f0fdf9', color: '#0f766e', border: '1px solid #99f6e4',
                textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>Live • 30m cache</span>
            </div>

            {trendingSkills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
                <p style={{ fontSize: 13 }}>Pulse data loading or not enough job activity yet.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                {trendingSkills.map((item, i) => {
                  const color = item.trend === 'high' ? '#d97706'
                    : item.trend === 'medium' ? '#7c3aed'
                    : item.trend === 'declining' ? '#dc2626'
                    : '#64748b';
                  const bg = item.trend === 'high' ? '#fffbeb'
                    : item.trend === 'medium' ? '#faf5ff'
                    : item.trend === 'declining' ? '#fff1f2'
                    : '#f8fafc';
                  const pct = Math.min(100, Math.abs(item.velocity_int || 0) * 5 + 10);
                  
                  return (
                    <div key={i} style={{
                      background: bg,
                      borderRadius: 16,
                      padding: '16px 18px',
                      border: `1px solid ${color}30`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#1e293b' }}>{item.skill}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 900, color,
                          background: `${color}18`,
                          padding: '3px 8px', borderRadius: 8,
                        }}>
                          {item.velocity}
                        </span>
                      </div>
                      <div style={{ width: '100%', background: '#e2e8f0', borderRadius: 4, height: 5, marginBottom: 8 }}>
                        <div style={{
                          height: 5, borderRadius: 4,
                          width: `${pct}%`,
                          background: color,
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                        <span>This week: {item.current}</span>
                        <span>Last vs: {item.previous}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Activity Heatmap */}
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Activity Heatmap</h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last 12 Weeks</span>
            </div>
            <ActivityHeatmap assigned={assigned} applied={applied} stats={stats} />
          </div>

        </div>
      </div>
    </div>
  );
};

const ActivityHeatmap = ({ assigned, applied, stats }) => {
  const today = new Date();
  const weeks = 12;
  const days = weeks * 7;

  // Build a map of date -> activity level
  const activityMap = {};

  // Seed with real data signals we have
  assigned.forEach((p, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 3));
    const key = d.toISOString().slice(0, 10);
    activityMap[key] = (activityMap[key] || 0) + 3;
  });

  applied.forEach((p, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (i * 2));
    const key = d.toISOString().slice(0, 10);
    activityMap[key] = (activityMap[key] || 0) + 1;
  });

  // Fill grid
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const level = Math.min(activityMap[key] || 0, 4);
    cells.push({ key, level, date: d });
  }

  const colorMap = {
    0: 'bg-slate-100',
    1: 'bg-blue-200',
    2: 'bg-blue-400',
    3: 'bg-blue-600',
    4: 'bg-blue-800',
  };

  const monthLabels = [];
  for (let w = 0; w < weeks; w++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (weeks - 1 - w) * 7);
    monthLabels.push(w % 3 === 0 ? d.toLocaleString('default', { month: 'short' }) : '');
  }

  return (
    <div className="space-y-3">
      {/* Month labels */}
      <div className="flex gap-1 pl-6">
        {monthLabels.map((label, i) => (
          <div key={i} className="text-[9px] text-slate-400 font-bold w-[18px] text-center">{label}</div>
        ))}
      </div>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pr-1">
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <div key={i} className="text-[9px] text-slate-400 font-bold h-[18px] flex items-center">{d}</div>
          ))}
        </div>

        {/* Grid — 12 cols (weeks) × 7 rows (days) */}
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${weeks}, 18px)`, gridTemplateRows: 'repeat(7, 18px)' }}>
          {Array.from({ length: weeks }).map((_, wIdx) =>
            Array.from({ length: 7 }).map((_, dIdx) => {
              const cellIndex = (weeks - 1 - wIdx) * 7 + dIdx;
              const cell = cells[days - 1 - ((weeks - 1 - wIdx) * 7 + (6 - dIdx))];
              if (!cell) return <div key={`${wIdx}-${dIdx}`} className="w-[18px] h-[18px]" />;
              return (
                <div
                  key={cell.key}
                  title={`${cell.key}: ${cell.level} activities`}
                  style={{ gridColumn: wIdx + 1, gridRow: dIdx + 1 }}
                  className={`w-[18px] h-[18px] rounded-sm ${colorMap[cell.level]} transition-all hover:scale-110 cursor-pointer`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 pt-2 justify-end">
        <span className="text-[9px] text-slate-400 font-bold uppercase">Less</span>
        {[0,1,2,3,4].map(l => (
          <div key={l} className={`w-[14px] h-[14px] rounded-sm ${colorMap[l]}`} />
        ))}
        <span className="text-[9px] text-slate-400 font-bold uppercase">More</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Active Jobs</p>
          <p className="text-xl font-black text-blue-700">{assigned.length}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-3 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Applications</p>
          <p className="text-xl font-black text-slate-700">{applied.length}</p>
        </div>
      </div>
    </div>
  );
};

// ── Reusable stat card ─────────────────────────────────────────────────
const StatCard = ({ title, value, icon, color }) => {
  const colors = {
    blue:    'bg-blue-600 shadow-blue-200',
    emerald: 'bg-emerald-600 shadow-emerald-200',
    amber:   'bg-amber-600 shadow-amber-200',
    purple:  'bg-purple-600 shadow-purple-200',
  };
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${colors[color]}`}>
        {React.cloneElement(icon, { size: 28 })}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
          {title}
        </p>
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
  );
};

export default FreelancerDashboard;

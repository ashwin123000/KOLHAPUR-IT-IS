  import React, { useState, useEffect } from 'react';
  import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
    CartesianGrid, ResponsiveContainer, Cell, PieChart, Pie, Legend
  } from 'recharts';
  import { statsAPI } from '../services/api';
  import { realtimeClient } from '../services/realtime';
  import { TrendingUp, Award, Briefcase, DollarSign, CheckCircle, Clock } from 'lucide-react';

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  export default function Analytics() {
    const userId = localStorage.getItem('userId') || '';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
  try {
    const res = await statsAPI.getFreelancerStats(userId);
    setData(res.data.data);
    setLoading(false);
  } catch (err) {
    console.error("Error fetching stats:", err);
  }
};

    useEffect(() => {
    if (!userId) return;

    fetchData();
    const unsubscribeRatings = realtimeClient.subscribe('rating_update', () => fetchData());
    const unsubscribeUsers = realtimeClient.subscribe('USER_UPDATE', (msg) => {
      if (!msg.user_id || msg.user_id === userId || msg.data?.id === userId) fetchData();
    });
    const unsubscribeMatches = realtimeClient.subscribe('JOB_MATCH_UPDATE', () => fetchData());

    return () => {
      unsubscribeRatings();
      unsubscribeUsers();
      unsubscribeMatches();
    };

  }, [userId]);
    // Safely mapping FastAPI snake_case/camelCase data to React's expectations
    const stats = {
      totalProjects: data?.totalProjects || 0,
      completedProjects: data?.completed || 0, 
      activeProjects: data?.activeProjects || 0,
      totalEarnings: data?.totalEarnings || 0,
      applicationsSubmitted: data?.applications || 0, 
      score: data?.score || 0, 
      skills: data?.skills || '',
      growthData: data?.growthData || []
    };

    const barData = [
      { name: 'Applied', value: stats.applicationsSubmitted },
      { name: 'Active',  value: stats.activeProjects },
      { name: 'Done',    value: stats.completedProjects },
    ];

    const pieData = [
      { name: 'Active',    value: stats.activeProjects    || 0 },
      { name: 'Completed', value: stats.completedProjects || 0 },
    ].filter(d => d.value > 0);

    const skills = (stats.skills || '').split(',').filter(Boolean).map(s => s.trim());

    const statCards = [
      { label: 'Trust Score',     value: `${Math.round(stats.score)}/100`, icon: Award,       color: 'text-purple-600 bg-purple-50 border-purple-200' },
      { label: 'Total Earnings',  value: `$${(stats.totalEarnings||0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
      { label: 'Active Projects', value: stats.activeProjects,    icon: Clock,      color: 'text-blue-600 bg-blue-50 border-blue-200' },
      { label: 'Completed',       value: stats.completedProjects, icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
    ];

    return (
      <div className="min-h-screen bg-[#F5F7FA] p-6">
        <div className="max-w-[1200px] mx-auto">

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={24} className="text-blue-500" /> Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-1">Your performance metrics and insights</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[1,2,3,4].map(i => <div key={i} className="h-28 bg-white rounded-xl animate-pulse border" />)}
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {statCards.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className={`bg-white rounded-xl border p-5 ${color.split(' ')[2]}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color.split(' ').slice(1,3).join(' ')}`}>
                      <Icon size={20} className={color.split(' ')[0]} />
                    </div>
                    <p className="text-2xl font-black text-slate-800">{value}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-6 mb-6">
                {/* Bar Chart */}
                <div className="col-span-8 bg-white rounded-xl border p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Project Activity</h3>
                  <div className="h-52 w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6,6,0,0]}>
                          {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pie Chart */}
                <div className="col-span-4 bg-white rounded-xl border p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-4">Status Split</h3>
                  {pieData.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                      Complete projects to see data
                    </div>
                  ) : (
                    <div className="h-40 w-full min-w-0 overflow-hidden">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Legend />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Growth Chart */}
              <div className="bg-white rounded-xl border p-6 shadow-sm mb-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-500" /> Financial Growth
                </h3>
                <div className="h-64 w-full min-w-0 overflow-hidden">
                  {(stats.growthData && stats.growthData.length > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.growthData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                        <Tooltip />
                        <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                      No transaction history yet to plot growth.
                    </div>
                  )}
                </div>
              </div>

              {/* Skills */}
              {skills.length > 0 && (
                <div className="bg-white rounded-xl border p-6 shadow-sm">
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Briefcase size={18} className="text-blue-500" /> Your Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                      <span key={s} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

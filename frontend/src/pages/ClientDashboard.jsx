import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { statsAPI, projectsAPI } from '../services/api';

const defaultChartData = [
  { name: 'Jan', spend: 400 }, { name: 'Feb', spend: 800 },
  { name: 'Mar', spend: 600 }, { name: 'Apr', spend: 1100 },
  { name: 'May', spend: 900 }, { name: 'Jun', spend: 1400 }
];

export default function ClientDashboard() {
  const [stats, setStats] = useState({ activeProjects: 0, waitlisted: 12, pendingApps: 8, totalSpend: 0 });
  const [projects, setProjects] = useState([]);
  const [chartData] = useState(defaultChartData);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'user_001';
    Promise.all([statsAPI.getDashboard(userId), projectsAPI.getAll()])
      .then(([statsRes, projRes]) => {
        const s = statsRes.data?.stats || {};
        setStats({
          activeProjects: s.activeProjects ?? 3,
          waitlisted: s.waitlisted ?? 12,
          pendingApps: s.pendingApplications ?? 8,
          totalSpend: s.totalSpent ?? 25400,
        });
        setProjects((projRes.data?.data || []).slice(0, 6).map(p => ({
          id: p.id,
          name: p.title,
          status: p.status === 'open' ? 'Active' : p.status === 'completed' ? 'Approved' : 'Pending',
          deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : 'TBD',
          badgeTheme: p.status === 'open'
            ? 'text-emerald-700 bg-emerald-100'
            : p.status === 'completed'
            ? 'text-orange-700 bg-orange-100'
            : 'text-blue-700 bg-blue-100',
        })));
      })
      .catch(() => {
        setStats({ activeProjects: 3, waitlisted: 12, pendingApps: 8, totalSpend: 25400 });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleAddProject = async () => {
    try {
      const clientId = localStorage.getItem('userId') || 'client_001';
      const res = await projectsAPI.create({
        title: 'New Project',
        description: 'Describe this project',
        budget: 5000,
        clientId,
        requiredSkills: [],
        difficultyLevel: 1,
      });
      const p = res.data?.project;
      if (p) {
        setProjects(prev => [...prev, {
          id: p.id, name: p.title, status: 'Active',
          deadline: 'TBD', badgeTheme: 'text-blue-700 bg-blue-100',
        }]);
        setStats(s => ({ ...s, activeProjects: s.activeProjects + 1 }));
      }
    } catch (err) {
      console.error('Create project failed', err);
    }
  };

  const handleDeleteProject = (id) => {
    setProjects(projects.filter(p => p.id !== id));
    setStats(s => ({ ...s, activeProjects: Math.max(0, s.activeProjects - 1) }));
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Active Projects', value: loading ? '…' : stats.activeProjects, color: '' },
          { label: 'Waitlisted Freelancers', value: loading ? '…' : stats.waitlisted, color: '' },
          { label: 'Pending Applications', value: loading ? '…' : stats.pendingApps, color: 'text-orange-600' },
          { label: 'Total Spend (Year)', value: loading ? '…' : `$${stats.totalSpend.toLocaleString()}`, color: '' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-slate-500 font-medium text-sm">{label}</h3>
            <p className={`text-3xl font-bold mt-2 text-slate-800 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4"><h2 className="text-xl font-bold text-slate-800 mb-4">At a Glance</h2></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">Earnings & Spend Overview</h3>
            <select className="border border-slate-300 rounded px-3 py-1 text-sm bg-white"><option>This Year</option></select>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} formatter={v => [`$${v}`, 'Spend']} />
                <Line type="monotone" dataKey="spend" stroke="#336699" strokeWidth={3} dot={{ r: 4, fill: '#336699' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">People Waitlist</h3>
            </div>
            <div className="space-y-3">
              {['Sarah Jenkins', 'Manss Carner', 'Sarah James'].map((name, i) => (
                <div key={name} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <img src={`https://i.pravatar.cc/150?u=${i + 1}`} className="w-6 h-6 rounded-full" alt="" />
                    <span className="text-sm font-medium">{name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${i === 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {i === 0 ? 'In Review' : 'Top Pick'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Recent Project Activity</h3>
          <div className="space-y-4">
            {['"Mobile App Redesign" — Mile 3 Approved', '"Content Strategy" — New message from Alex R.', '"SEO Audit" — Invoiced'].map((t, i) => (
              <div key={i} className="flex gap-3 items-start border-b pb-3 last:border-0">
                <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${i === 2 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{t}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{i === 0 ? '1 day ago' : i === 1 ? '1 month ago' : '2 months ago'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Project Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="pb-3 font-medium">Project</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Deadline</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(proj => (
                  <tr key={proj.id} className="border-b">
                    <td className="py-3 font-semibold text-slate-800 truncate max-w-[160px]">{proj.name}</td>
                    <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${proj.badgeTheme}`}>{proj.status}</span></td>
                    <td className="py-3 text-slate-500">{proj.deadline}</td>
                    <td className="py-3 text-right flex justify-end gap-2">
                      <button className="text-slate-500 hover:text-blue-600 text-xs">Edit</button>
                      <button onClick={() => handleDeleteProject(proj.id)} className="text-slate-500 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && !loading && (
                  <tr><td colSpan="4" className="py-4 text-center text-slate-400">No projects found. Click "Add New Project" below.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button onClick={handleAddProject} className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium px-4 py-2 border border-blue-200 rounded transition">
              + Add New Project (via API)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

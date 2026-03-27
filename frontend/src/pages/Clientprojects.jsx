import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Bell, UserCircle, Plus, Trash2, Edit3,
  Users, UserPlus, Clock, Send, Activity, CheckCircle2,
  ChevronDown, X, Star, DollarSign, Briefcase
} from 'lucide-react';
import { projectsAPI, applyAPI } from '../services/api';

// ─── Create Project Modal ───────────────────────────────────────
function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '', description: '', budget: '', deadline: '',
    requiredSkills: '', difficultyLevel: 2,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const clientId = localStorage.getItem('userId');
      const res = await projectsAPI.create({
        ...form,
        budget: parseFloat(form.budget),
        requiredSkills: form.requiredSkills.split(',').map(s => s.trim()).filter(Boolean),
        clientId,
      });
      onCreated(res.data?.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-800 mb-5">Create New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Title *</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Build a React e-commerce app" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Describe the project scope and goals..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Budget ($) *</label>
              <input required type="number" min="1" value={form.budget}
                onChange={e => setForm({...form, budget: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Required Skills (comma-separated)</label>
            <input value={form.requiredSkills} onChange={e => setForm({...form, requiredSkills: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="React, Node.js, PostgreSQL" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition disabled:opacity-60">
            {loading ? 'Creating…' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────
const Clientprojects = () => {
  const [projects, setProjects]             = useState([]);
  const [selectedIdx, setSelectedIdx]       = useState(0);
  const [applications, setApplications]     = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingApps, setLoadingApps]       = useState(false);
  const [showCreate, setShowCreate]         = useState(false);
  const [hiringId, setHiringId]             = useState(null);
  const [hireMsg, setHireMsg]               = useState('');

  const clientId = localStorage.getItem('userId');

  // Fetch this client's projects from DB
  const fetchProjects = useCallback(() => {
    if (!clientId) return;
    setLoadingProjects(true);
    projectsAPI.getForClient(clientId)
      .then(res => {
        const data = res.data?.data || [];
        setProjects(data);
        if (data.length > 0) fetchApplications(data[0].id);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, [clientId]);

  // Fetch applications for a specific project from DB
  const fetchApplications = async (projectId) => {
    if (!projectId) return;
    setLoadingApps(true);
    setApplications([]);
    setHireMsg('');
    try {
      const res = await applyAPI.getApplications(projectId);
      setApplications(res.data?.data || []);
    } catch {
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const selectProject = (idx) => {
    setSelectedIdx(idx);
    if (projects[idx]) fetchApplications(projects[idx].id);
  };

  const handleHire = async (app) => {
    setHiringId(app.applicationId);
    setHireMsg('');
    try {
      await applyAPI.hire({
        applicationId: app.applicationId,
        projectId:     app.projectId,
        freelancerId:  app.freelancerId,
        clientId,
      });
      setHireMsg(`✅ ${app.freelancerName} has been hired!`);
      // Refresh project list and applications to reflect new status
      fetchProjects();
      if (projects[selectedIdx]) fetchApplications(projects[selectedIdx].id);
    } catch (err) {
      setHireMsg('❌ ' + (err.response?.data?.error || 'Hire failed'));
    } finally {
      setHiringId(null);
    }
  };

  const selected = projects[selectedIdx];

  const statusColor = (status) => {
    if (status === 'in_progress') return 'bg-blue-100 text-blue-700';
    if (status === 'completed')   return 'bg-green-100 text-green-700';
    if (status === 'open')        return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  const appStatusColor = (status) => {
    if (status === 'accepted') return 'bg-green-100 text-green-700';
    if (status === 'rejected') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="min-h-screen p-6 bg-slate-50 text-slate-800 font-sans">
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(proj) => {
            setProjects(prev => [proj, ...prev]);
            setSelectedIdx(0);
            setApplications([]);
          }}
        />
      )}

      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Workspace</h1>
            <p className="text-sm text-slate-500">Manage your projects and review applicants.</p>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search projects..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 shadow-sm" />
            </div>
            <UserCircle size={28} className="text-blue-600" />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT — Projects List */}
          <div className="lg:col-span-3 space-y-4">
            <button
              onClick={() => setShowCreate(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Create New Project
            </button>

            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm h-[calc(100vh-220px)] overflow-y-auto">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Your Projects</h2>

              {loadingProjects ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : projects.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No projects yet. Create one!</p>
              ) : (
                <ul className="space-y-2">
                  {projects.map((project, idx) => (
                    <li key={project.id}>
                      <button
                        onClick={() => selectProject(idx)}
                        className={`w-full text-left p-3 rounded-lg border transition ${
                          selectedIdx === idx
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold text-sm text-slate-800 block truncate">{project.title}</span>
                        <div className="flex justify-between items-center mt-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor(project.status)}`}>
                            {project.status?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-slate-500">${project.budget?.toLocaleString()}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* MIDDLE — Project Details + Applicants */}
          <div className="lg:col-span-9 space-y-6">
            {!selected ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 shadow-sm">
                <Briefcase size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No project selected</p>
                <p className="text-sm">Create a project or select one from the left panel.</p>
              </div>
            ) : (
              <>
                {/* Project Header */}
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selected.title}</h2>
                      <p className="text-sm text-slate-500 mt-1 max-w-xl">{selected.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={14} /> {selected.deadline || 'No deadline'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">Budget: <strong className="text-slate-700">${selected.budget?.toLocaleString()}</strong></span>
                        <span>•</span>
                        <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor(selected.status)}`}>
                          {selected.status?.replace('_', ' ')}
                        </span>
                      </div>
                      {selected.requiredSkills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {selected.requiredSkills.map(s => (
                            <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    {selected.assignedFreelancerId && (
                      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center">
                        <CheckCircle2 size={20} className="text-green-600 mx-auto mb-1" />
                        <p className="text-xs font-semibold text-green-700">Freelancer Assigned</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Applications Panel */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Users size={18} className="text-blue-600" />
                      Applications
                      {applications.length > 0 && (
                        <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                          {applications.length}
                        </span>
                      )}
                    </h3>
                    {hireMsg && (
                      <span className={`text-sm font-medium ${hireMsg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                        {hireMsg}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    {loadingApps ? (
                      <div className="space-y-3">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : applications.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">
                        <UserPlus size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium">No applications yet</p>
                        <p className="text-sm">Freelancers will appear here once they apply.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {applications.map(app => (
                          <div key={app.applicationId}
                            className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/30 transition"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                {/* Avatar */}
                                <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
                                  {(app.freelancerName || 'F')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-slate-800">{app.freelancerName}</p>
                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${appStatusColor(app.status)}`}>
                                      {app.status}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">{app.freelancerEmail}</p>

                                  {/* Metrics */}
                                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                                    <span className="flex items-center gap-1">
                                      <Star size={12} className="text-amber-400" />
                                      {parseFloat(app.averageRating || 0).toFixed(1)} rating
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Activity size={12} className="text-blue-400" />
                                      {parseFloat(app.reliabilityScore || 100).toFixed(0)}% reliable
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <DollarSign size={12} className="text-green-500" />
                                      Bid: ${parseFloat(app.bidAmount || 0).toLocaleString()}
                                    </span>
                                  </div>

                                  {/* Skills */}
                                  {Array.isArray(app.skills) && app.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {app.skills.slice(0, 5).map(s => (
                                        <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{s}</span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Cover Letter */}
                                  {app.coverLetter && (
                                    <p className="mt-2 text-xs text-slate-600 italic line-clamp-2">"{app.coverLetter}"</p>
                                  )}
                                </div>
                              </div>

                              {/* Hire Button */}
                              {app.status === 'pending' && selected.status === 'open' && (
                                <button
                                  onClick={() => handleHire(app)}
                                  disabled={hiringId === app.applicationId}
                                  className="flex-shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
                                >
                                  {hiringId === app.applicationId ? 'Hiring…' : 'Hire'}
                                </button>
                              )}
                              {app.status === 'accepted' && (
                                <span className="flex-shrink-0 px-4 py-2 bg-green-100 text-green-700 text-sm font-semibold rounded-lg flex items-center gap-1">
                                  <CheckCircle2 size={14} /> Hired
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Clientprojects;
import React, { useState } from "react";
import { 
  Search, UserCircle, CheckCircle, MessageSquare, Clock, ExternalLink, AlertCircle, Check
} from "lucide-react";

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState(0);

  const projects = [
    { id: 1, title: "Project Alpha (UI/UX)", client: "Sarah Jenkins", status: "Active", progress: 68, due: "10h 14m" },
    { id: 2, title: "Backend API Integration", client: "Alex Johnson", status: "Active", progress: 53, due: "2d 10h" },
    { id: 3, title: "Mobile App Redesign", client: "Jane Doe", status: "Review", progress: 81, due: "5d 02h" },
    { id: 4, title: "SEO & Analytics Dashboard", client: "John Smith", status: "Planning", progress: 12, due: "12d 14h" }
  ];

  const activeChats = [
    { id: 1, name: "Sarah Jenkins", role: "Lead Reviewer", initials: "SJ", active: true, color: "text-blue-600 bg-blue-100" },
    { id: 2, name: "Alex Johnson", role: "Project Lead", initials: "AJ", active: true, color: "text-purple-600 bg-purple-100" },
    { id: 3, name: "Jane Doe", role: "Technical Lead", initials: "JD", active: true, color: "text-emerald-600 bg-emerald-100" },
    { id: 4, name: "John Smith", role: "Finance Lead", initials: "JS", active: true, color: "text-slate-600 bg-slate-200" }
  ];

  const selected = projects[selectedProject];

  return (
    <div className="min-h-screen p-6 bg-slate-50 text-slate-800 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="flex items-center justify-between border-b border-slate-300 pb-4">
          <div>
            <h1 className="text-2xl font-bold">My Projects</h1>
            <p className="text-sm text-slate-500">Simple project list with details and quick actions.</p>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <Search size={18} />
            <span className="text-sm">{selected.client}</span>
            <UserCircle size={20} />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: PROJECTS LIST */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-2 h-fit">
            <h2 className="text-sm font-semibold text-slate-700">Projects</h2>
            <ul className="space-y-2">
              {projects.map((project, idx) => (
                <li key={project.id}>
                  <button
                    onClick={() => setSelectedProject(idx)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedProject === idx ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{project.title}</span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">{project.status}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{project.client} • due {project.due}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* MIDDLE COLUMN: PROJECT DETAILS */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 shadow-sm h-fit">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">{selected.title}</h3>
                <p className="text-sm text-slate-500 mt-1">Client: {selected.client}</p>
              </div>
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-700 bg-blue-100 rounded-full px-3 py-1 border border-blue-200">
                  {selected.status}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <p className="text-xs text-slate-500 font-medium">Progress</p>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-2xl font-bold text-slate-800">{selected.progress}%</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-3">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{width: `${selected.progress}%`}}></div>
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <p className="text-xs text-slate-500 font-medium">Due In</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{selected.due}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <CheckCircle size={16} /> Update Status
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                <ExternalLink size={16} /> Open Repository
              </button>
              <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                <MessageSquare size={16} /> Message Client
              </button>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-6">
              <h4 className="text-sm font-semibold text-slate-800">Recent Activity</h4>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <Clock size={16} className="text-slate-400 mt-0.5" /> 
                  <span>Design System setup completed</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={16} className="text-slate-400 mt-0.5" /> 
                  <span>API integration 70% complete</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock size={16} className="text-slate-400 mt-0.5" /> 
                  <span>QA review scheduled for tomorrow</span>
                </li>
              </ul>
            </div>
          </div>

          {/* RIGHT COLUMN: NOTIFICATIONS & CHATS */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Notifications Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <AlertCircle size={16} className="text-slate-500" />
                <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
              </div>
              <div className="p-4 space-y-5">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 text-blue-500">
                    <MessageSquare size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-800">Sarah Jenkins</span> updated the client requirements
                    </p>
                    <p className="text-xs text-slate-400 mt-1">3h ago</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-700 font-semibold text-xs">
                    SJ
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 mt-1">
                      <span className="font-semibold text-slate-800">Sarah Jenkins</span> is typing...
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Chats Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col h-[400px]">
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500" />
                <h3 className="font-semibold text-sm text-slate-800">Active Chats (4)</h3>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-2">
                {activeChats.map((chat, idx) => (
                  <div 
                    key={chat.id} 
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      idx === 0 ? "bg-blue-50 border-blue-100" : "bg-white border-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${chat.color}`}>
                      {chat.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{chat.name}</p>
                      <p className="text-xs text-slate-500 truncate">{chat.role}</p>
                    </div>
                    {chat.active && (
                      <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 shadow-sm"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-lg">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow bg-white shadow-sm" 
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 transition-colors text-white p-1.5 rounded-md shadow-sm">
                    <Check size={14} />
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default Projects;
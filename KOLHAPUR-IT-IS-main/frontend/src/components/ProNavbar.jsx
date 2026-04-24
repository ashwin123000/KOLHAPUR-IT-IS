import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Plus, Monitor, MessageSquare, User, Bell } from 'lucide-react';

const NAV = [
  { label: 'Dashboard',      icon: LayoutDashboard, path: '/client-dashboard' },
  { label: 'Projects',       icon: Briefcase,       path: '/client-projects' },
  { label: 'Create Project', icon: Plus,            path: '/create-project' },
  { label: 'VM Analysis',    icon: Monitor,         path: '/vm-analysis' },
  { label: 'Messages',       icon: MessageSquare,   path: '/client-manage-bids' },
];

export default function ProNavbar() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-0 flex items-center gap-1 h-14 shrink-0 z-40">
      {/* Logo */}
      <button onClick={() => navigate('/client-projects')}
        className="flex items-center gap-1 font-bold text-lg select-none mr-6">
        <span className="text-green-600">fiverr</span>
        <span className="text-gray-700">Intern</span>
        <span className="text-[11px] font-semibold bg-green-600 text-white px-1.5 py-0.5 rounded ml-0.5">Pro</span>
      </button>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {NAV.map(({ label, icon: Icon, path }) => {
          const active = pathname === path;
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${active ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
              <Icon size={15}/>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
          <Bell size={18}/>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-green-500 rounded-full"/>
        </button>
        <button onClick={() => navigate('/client-dashboard')}
          className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1 transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold">HM</div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-gray-400 leading-tight">Welcome,</p>
            <p className="text-sm font-semibold text-gray-800 leading-tight">Hiring Manager</p>
          </div>
        </button>
      </div>
    </header>
  );
}

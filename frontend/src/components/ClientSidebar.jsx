import React from 'react';
import { LayoutDashboard, FolderOpen, Search, Users, ClipboardCheck, FileText, BarChart2, Settings } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ClientSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;
  
  const getButtonClass = (path) =>
    `w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${
      isActive(path) ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full sticky top-0">
      <div className="p-6 text-2xl font-black text-blue-600 flex items-center gap-2">
        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white">f</div> 
        Freelance
      </div>
      
      <nav className="flex-1 px-4 space-y-1.5 mt-2 overflow-y-auto">
        <button onClick={() => navigate('/client-dashboard')} className={getButtonClass('/client-dashboard')}>
          <LayoutDashboard size={18}/> Dashboard
        </button>
        <button onClick={() => navigate('/client-projects')} className={getButtonClass('/client-projects')}>
           <FolderOpen size={18}/> Projects
        </button>
        <button onClick={() => navigate('/recommendations/project-client')} className={getButtonClass('/recommendations/project-client')}>
           <Search size={18}/> Find Talent
        </button>
        <button onClick={() => navigate('/client-payouts')} className={getButtonClass('/client-payouts')}>
           <Users size={18}/> Payouts
        </button>
        <button onClick={() => navigate('/client-manage-bids')} className={getButtonClass('/client-manage-bids')}>
           <FileText size={18}/> Manage Bids
        </button>
        <button className={`w-full text-left px-4 py-3 rounded-lg text-slate-600 hover:bg-slate-50 font-medium flex items-center gap-3`}>
           <Settings size={18}/> Settings
        </button>
      </nav>

      <div className="p-4 border-t border-slate-200 mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold overflow-hidden">
             SJ
          </div>
          <div>
            <p className="font-bold text-slate-800 text-sm">Sarah Jenkins</p>
            <p className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full inline-block mt-0.5 font-semibold">Client</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

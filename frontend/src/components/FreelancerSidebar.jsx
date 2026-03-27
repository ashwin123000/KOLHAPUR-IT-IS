import React from 'react';
import { Home, FolderOpen, Clock, FileText, ClipboardCheck, FilePlus, BarChart2, Settings, Search, Briefcase } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function FreelancerSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const getButtonClass = (path) =>
    `w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition ${
      isActive(path) ? 'bg-[#374151] text-white' : 'hover:bg-slate-800 hover:text-white text-slate-300'
    }`;

  const getIconClass = (path) => isActive(path) ? 'text-cyan-400' : '';

  return (
    <aside className="w-64 bg-[#111827] border-r border-slate-800 flex flex-col h-full sticky top-0 text-slate-300">
      <div className="p-6 text-2xl font-black text-cyan-400 flex items-center gap-2">
        <div className="w-8 h-8 rounded flex items-center justify-center text-white bg-gradient-to-tr from-cyan-600 to-blue-500 font-bold italic">f</div> 
        FreePro
      </div>
      
      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        <button onClick={() => navigate('/freelancer-projects')} className={getButtonClass('/freelancer-projects')}>
          <Search size={18} className={getIconClass('/freelancer-projects')}/> EXPLORE JOBS
        </button>
        <button onClick={() => navigate('/freelancer-dashboard')} className={getButtonClass('/freelancer-dashboard')}>
           <BarChart2 size={18} className={getIconClass('/freelancer-dashboard')}/> ANALYTICS
        </button>
        <button onClick={() => navigate('/my-projects')} className={getButtonClass('/my-projects')}>
           <FolderOpen size={18} className={getIconClass('/my-projects')}/> MY PROJECTS
        </button>
        <button onClick={() => navigate('/bidder-management')} className={getButtonClass('/bidder-management')}>
           <Briefcase size={18} className={getIconClass('/bidder-management')}/> BIDDER MANAGEMENT
        </button>
        <button onClick={() => navigate('/my-invoices')} className={getButtonClass('/my-invoices')}>
           <FilePlus size={18} className={getIconClass('/my-invoices')}/> INVOICES
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto space-y-2">
        <button className="w-full text-left px-4 py-2 rounded hover:bg-slate-800 font-medium flex items-center gap-3 transition text-slate-300">
           <Settings size={18}/> Settings
        </button>
        <div className="flex items-center gap-3 pt-4 pl-2">
          <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
             {/* Profile stub */}
             <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Alex Johnson</p>
            <p className="text-xs bg-cyan-900/50 text-cyan-400 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-cyan-800 uppercase">Freelancer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

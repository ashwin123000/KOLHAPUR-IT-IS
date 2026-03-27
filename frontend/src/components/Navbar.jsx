import React from 'react';
import { Search, Bell, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ role }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate(role === 'freelancer' ? '/login-freelancer' : '/login-client');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Search Bar Segment */}
      <div className="flex-1 flex items-center">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-transparent focus:bg-white focus:border-indigo-300"
          />
        </div>
      </div>

      {/* Action Segment */}
      <div className="flex items-center gap-6">
        <button className="relative text-slate-500 hover:text-indigo-600 transition">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
            {role === 'freelancer' ? 'F' : 'C'}
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-semibold text-slate-700 leading-none">{role === 'freelancer' ? 'Freelancer' : 'Client Profile'}</p>
            <button onClick={handleLogout} className="text-slate-500 text-xs hover:text-red-500 mt-1">Log out</button>
          </div>
        </div>
      </div>
    </header>
  );
}

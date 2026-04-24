import React from 'react';
import Navbar from './Navbar';
import ClientSidebar from './ClientSidebar';
import FreelancerSidebar from './FreelancerSidebar';

export const ClientLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <ClientSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar role="client" />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export const FreelancerLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <FreelancerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar role="freelancer" />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

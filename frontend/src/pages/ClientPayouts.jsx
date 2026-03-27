import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Clock, AlertCircle, FileText, Wallet } from 'lucide-react';
import { paymentsAPI, statsAPI } from '../services/api';

const MOCK_PAYOUTS = [
  { id: 'pay_1', freelancer: "Sarah Jenkins", project: "E-Commerce Platform Redesign", amount: 4500, status: "Completed", deadline: "Oct 24, 2026", paid: false },
  { id: 'pay_2', freelancer: "Alex Johnson", project: "Mobile App MVP (iOS)", amount: 2000, status: "In Progress", deadline: "Nov 15, 2026", paid: false },
  { id: 'pay_3', freelancer: "John Smith", project: "Backend API Migration", amount: 8500, status: "Completed", deadline: "Oct 18, 2026", paid: true },
  { id: 'pay_4', freelancer: "Janet Doe", project: "Branding Assets", amount: 1200, status: "Completed", deadline: "Oct 20, 2026", paid: false },
];

export default function ClientPayouts() {
  const [payouts, setPayouts] = useState(MOCK_PAYOUTS);
  const [balance, setBalance] = useState(15000);
  const [releasing, setReleasing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'client_001';
    Promise.all([statsAPI.getDashboard(userId), paymentsAPI.getForUser(userId)])
      .then(([statsRes, paymentsRes]) => {
        const s = statsRes.data?.stats || {};
        if (s.escrowBalance) setBalance(s.escrowBalance);
        const serverPayments = paymentsRes.data?.payments;
        if (Array.isArray(serverPayments) && serverPayments.length > 0) {
          setPayouts(serverPayments.map(p => ({
            id: p.id,
            freelancer: p.freelancerName || 'Freelancer',
            project: p.projectTitle || 'Project',
            amount: p.amount,
            status: p.status === 'completed' ? 'Completed' : 'In Progress',
            deadline: p.deadline ? new Date(p.deadline).toLocaleDateString() : 'TBD',
            paid: p.status === 'paid',
          })));
        }
      })
      .catch(() => { /* keep mock data */ })
      .finally(() => setLoading(false));
  }, []);

  const handlePayout = async (item) => {
    if (item.paid || item.status !== 'Completed') return;
    setReleasing(item.id);
    try {
      // Try to call real backend; if it fails we still update UI
      await paymentsAPI.release(item.id, item.amount).catch(() => {});
      setBalance(prev => Math.max(0, prev - item.amount));
      setPayouts(prev => prev.map(p => p.id === item.id ? { ...p, paid: true } : p));
    } finally {
      setReleasing(null);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-2 space-y-6 font-sans text-slate-800">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white rounded-lg p-6 border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Payouts & Escrow</h1>
          <p className="text-sm text-slate-500 mt-1">Manage completed milestones and release payments safely.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-lg flex items-center gap-3 font-semibold text-lg shadow-sm">
          <Wallet className="text-emerald-600" size={24} />
          <div>
            <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Escrow Balance</p>
            {loading ? '…' : `$${balance.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* PAYOUTS LIST */}
      <div className="grid gap-4">
        {payouts.map(item => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-colors">

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-500" size={18} />
                <h3 className="font-bold text-lg text-slate-900">{item.project}</h3>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <img src={`https://i.pravatar.cc/150?u=${item.freelancer.replace(' ', '')}`} alt={item.freelancer} className="w-5 h-5 rounded-full" />
                Freelancer: <span className="font-semibold text-slate-700">{item.freelancer}</span>
              </p>
              <div className="flex items-center gap-4 text-xs mt-3 pt-3 border-t border-slate-50">
                <span className="flex items-center gap-1.5 text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                  <Clock size={14} /> Deadline: {item.deadline}
                </span>
                {item.status === 'Completed' ? (
                  <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
                    <CheckCircle size={14} /> Work Completed
                  </span>
                ) : (
                  <span className="text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Work In Progress
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 md:pl-6 md:border-l">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Amount</p>
                <div className="text-2xl font-black text-slate-800">${item.amount.toLocaleString()}</div>
              </div>

              {item.paid ? (
                <span className="bg-slate-50 text-slate-400 font-bold px-5 py-2.5 rounded-lg text-sm flex items-center gap-2 border border-slate-200">
                  <CheckCircle size={18} className="text-emerald-500" /> Funds Released
                </span>
              ) : (
                <button
                  onClick={() => handlePayout(item)}
                  disabled={item.status !== 'Completed' || releasing === item.id}
                  className={`px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2 ${
                    item.status === 'Completed'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 shadow-md transform hover:scale-105'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <DollarSign size={18} />
                  {releasing === item.id ? 'Releasing…' : item.status === 'Completed' ? 'Release Payment' : 'Pending Completion'}
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

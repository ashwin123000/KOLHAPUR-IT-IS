import React, { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Clock, AlertCircle, FileText, Wallet } from 'lucide-react';
import { paymentsAPI } from '../services/api';

export default function ClientPayouts() {
  const userId = localStorage.getItem('userId') || '';
  const [payouts, setPayouts] = useState([]);
  const [releasing, setReleasing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    paymentsAPI.getForUser(userId)
      .then(res => {
        const rawData = res.data?.data || [];
        
        // ✅ SYNCED: Unpack FastAPI SQLite tuples into React objects
        setPayouts(rawData.map(p => {
          const isArray = Array.isArray(p);
          const status = isArray ? p[5] : p.status;
          const projId = isArray ? p[1] : p.project_id;
          const freeId = isArray ? p[3] : p.freelancer_id;

          return {
            id: isArray ? p[0] : p.id,
            projectId: projId,
            freelancerId: freeId,
            // Fallbacks using the last 4 characters of the ID since names aren't in this table
            freelancer: `Freelancer ${freeId?.slice(-4) || ''}`,
            project: `Project ${projId?.slice(-4) || ''}`,
            amount: isArray ? p[4] : p.amount,
            status: status === 'released' ? 'Completed' : 'Pending',
            timestamp: '—', // SQLite schema currently lacks a timestamp column for payments
            paid: status === 'released',
          };
        }));
      })
      .catch((err) => console.error("Payments Sync Error:", err))
      .finally(() => setLoading(false));
  }, [userId]); 

  const totalBalance = payouts
    .filter(p => !p.paid)
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleRelease = async (item) => {
    if (item.paid) return; // ✅ FIXED: Removed the buggy status check that blocked clicks
    setReleasing(item.id);
    try {
      // ✅ SYNCED: Sends the payload to FastAPI
      await paymentsAPI.release(item.projectId);
      setPayouts(prev => prev.map(p => p.id === item.id ? { ...p, paid: true, status: 'Completed' } : p));
      alert("Funds successfully released!");
    } catch (err) {
      alert("Failed to release funds: " + (err.response?.data?.detail || "Server error"));
    }
    finally { setReleasing(null); }
  };
  return (
    <div className="max-w-[1200px] mx-auto p-2 space-y-6 font-sans text-slate-800">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white rounded-lg p-6 border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wide">Payouts & Escrow</h1>
          <p className="text-sm text-slate-500 mt-1">Manage completed milestones and release payments safely.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-lg flex items-center gap-3 font-semibold text-lg shadow-sm">
          <Wallet className="text-emerald-600" size={24} />
          <div>
            <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold">Pending Balance</p>
            {loading ? '…' : `$${totalBalance.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-xl border animate-pulse"/>)}
        </div>
      )}

      {/* Empty state */}
      {!loading && payouts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <DollarSign size={40} className="mx-auto mb-3 opacity-40"/>
          <p className="font-medium">No payment records found</p>
          <p className="text-sm mt-1">Payments will appear here once you create and assign projects.</p>
        </div>
      )}

      {/* Payouts List */}
      {!loading && (
        <div className="grid gap-4">
          {payouts.map(item => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-colors">

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="text-blue-500" size={18} />
                  <h3 className="font-bold text-lg text-slate-900">{item.project}</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Freelancer: <span className="font-semibold text-slate-700">{item.freelancer}</span>
                </p>
                <div className="flex items-center gap-4 text-xs mt-3 pt-3 border-t border-slate-50">
                  <span className="flex items-center gap-1.5 text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                    <Clock size={14} /> {item.timestamp}
                  </span>
                  {item.paid ? (
                    <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
                      <CheckCircle size={14} /> Paid
                    </span>
                  ) : (
                    <span className="text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5">
                      <AlertCircle size={14} /> Pending
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
                    onClick={() => handleRelease(item)}
                    disabled={releasing === item.id}
                    className="px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <DollarSign size={18} />
                    {releasing === item.id ? 'Releasing…' : 'Release Payment'}
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

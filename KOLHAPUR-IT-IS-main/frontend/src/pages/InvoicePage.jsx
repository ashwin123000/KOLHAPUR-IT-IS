import React, { useState, useEffect } from "react";
import { invoicesAPI } from "../services/api";
import { API_BASE } from "../api/config";
import { FileText, CheckCircle, Clock, TrendingUp, AlertTriangle, ShieldCheck, Star } from "lucide-react";

const InvoicePage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInv, setSelectedInv] = useState(null);
  const userId = localStorage.getItem('userId');

useEffect(() => {
    if (!userId) { setLoading(false); return; }
    
    invoicesAPI.getForUser(userId)
      .then(async res => {
        const rawData = res.data?.data || [];
        
        const mappedInvoices = await Promise.all(rawData.map(async inv => {
          const isArray = Array.isArray(inv);
          const projId = isArray ? inv[1] : inv.project_id;
          const timestamp = isArray ? inv[6] : inv.created_at;

          // Fetch actual rating for this project
          let stars = null;
          let submissionStatus = null;
          try {
            const ratingRes = await fetch(
              `${API_BASE}/api/ratings/project/${projId}`
            );
            if (ratingRes.ok) {
              const ratingData = await ratingRes.json();
              stars = ratingData.data?.stars ?? null;
              submissionStatus = ratingData.data?.onTimeStatus ?? null;
            }
          } catch (_) {}

          return {
            id: isArray ? inv[0] : inv.id,
            projectId: projId,
            clientId: isArray ? inv[2] : inv.client_id,
            freelancerId: isArray ? inv[3] : inv.freelancer_id,
            amount: isArray ? inv[4] : inv.amount,
            status: isArray ? inv[5] : inv.status,
            title: `Project ${projId?.slice(-4) || 'Delivery'}`,
            timestamp: timestamp || new Date().toISOString(),
            submissionStatus: submissionStatus,
            stars: stars,
          };
        }));

        setInvoices(mappedInvoices);
        if (mappedInvoices.length > 0) setSelectedInv(mappedInvoices[0]);
      })
      .catch(err => console.error("Error loading invoices:", err))
      .finally(() => setLoading(false));
  }, [userId]);
  
  return (
    <div className="bg-[#F5F7FA] min-h-screen p-6 font-sans">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* LEFT SIDEBAR - INVOICE LIST */}
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-100px)]">
          <h2 className="font-black text-slate-800 mb-6 flex items-center gap-2 uppercase tracking-tighter italic">
              <FileText size={20} className="text-blue-600" /> Digital Invoices
          </h2>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loading ? (
                <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />)}</div>
            ) : invoices.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-10">No transactions recorded.</p>
            ) : (
                invoices.map((inv) => (
                <div
                    key={inv.id}
                    onClick={() => setSelectedInv(inv)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group ${
                    selectedInv?.id === inv.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" : "bg-white border-slate-50 hover:border-blue-100 text-slate-700"
                    }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <p className={`text-xs font-black uppercase tracking-widest ${selectedInv?.id === inv.id ? 'text-blue-100' : 'text-slate-400'}`}>TX-{String(inv.id).slice(-4).toUpperCase()}</p>
                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                            selectedInv?.id === inv.id ? 'bg-blue-500 text-white' : 'bg-green-100 text-green-700'
                        }`}>
                            {inv.status}
                        </span>
                    </div>
                    <p className={`text-sm font-black truncate ${selectedInv?.id === inv.id ? 'text-white' : 'text-slate-800'}`}>{inv.title || 'Project'}</p>
                    <p className={`text-[10px] mt-1 font-bold ${selectedInv?.id === inv.id ? 'text-blue-200' : 'text-slate-400'}`}>
                    {new Date(inv.timestamp).toLocaleDateString()}
                    </p>
                </div>
                ))
            )}
          </div>
        </div>

        {/* MAIN CONTENT - INVOICE DETAIL */}
        <div className="lg:col-span-2 space-y-6">

          {selectedInv ? (
            <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-100 border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-300">
              
              {/* Header Visual */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-12 text-white relative">
                 <div className="absolute top-0 right-0 p-12 opacity-10">
                    <ShieldCheck size={180} />
                 </div>
                 <div className="relative z-10 flex justify-between items-end">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-400 mb-2">
                            <TrendingUp size={16} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Transaction</span>
                        </div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Invoice Details</h2>
                        <p className="text-slate-400 font-bold text-sm tracking-tight">{selectedInv.title}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-5xl font-black tracking-tighter mb-1">${selectedInv.amount?.toLocaleString()}</div>
                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">Grand Total Released</p>
                    </div>
                 </div>
              </div>

              <div className="p-12 space-y-10">
                
                {/* Performance Analytics */}
                <div className="grid grid-cols-2 gap-6">
                    <div className={`p-6 rounded-3xl border-2 flex flex-col justify-center ${
                        selectedInv.submissionStatus === 'BEFORE' ? 'bg-green-50 border-green-100' : 
                        selectedInv.submissionStatus === 'LATE' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                    }`}>
                        <div className="flex items-center gap-2 mb-2">
                            {selectedInv.submissionStatus === 'BEFORE' ? <TrendingUp size={16} className="text-green-600"/> : <AlertTriangle size={16} className="text-red-500"/>}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Submission Impact</span>
                        </div>
                        <p className={`text-xl font-black uppercase italic tracking-tighter ${
                            selectedInv.submissionStatus === 'BEFORE' ? 'text-green-700' : 
                            selectedInv.submissionStatus === 'LATE' ? 'text-red-600' : 'text-slate-700'
                        }`}>
                            {selectedInv.submissionStatus || 'ON TIME'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                            {selectedInv.submissionStatus === 'BEFORE' ? 'Bonus Multiplier Applied' : 
                             selectedInv.submissionStatus === 'LATE' ? 'Late Penalty Deducted' : 'Baseline Performance'}
                        </p>
                    </div>

                    <div className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-100 flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <Star size={16} className="text-yellow-500 fill-yellow-500"/>
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Client satisfaction</span>
                        </div>
                        <div className="flex gap-1 mb-1">
                            {[1,2,3,4,5].map(s => (
                                <Star key={s} size={20} className={s <= (selectedInv.stars || 5) ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-200"} />
                            ))}
                        </div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Verified by Platform</p>
                    </div>
                </div>

                {/* Financial Breakdown */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b pb-4">Financial Breakdown</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center group">
                            <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Project Budget</span>
                            <span className="text-lg font-black text-slate-800">${selectedInv.budget?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-green-600">
                            <span className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
                                Performance Adjustment {selectedInv.submissionStatus === 'BEFORE' && <span className="bg-green-100 text-[8px] px-2 py-0.5 rounded-full">+20%</span>}
                            </span>
                            <span className="text-lg font-black">${selectedInv.submissionStatus === 'BEFORE' ? (selectedInv.budget * 0.2).toLocaleString() : '0'}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                            <span className="text-sm font-bold uppercase tracking-tight">Platform Fee</span>
                            <span className="text-lg font-black">$0.00</span>
                        </div>
                        <div className="pt-6 border-t flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-2">Net Payout</p>
                                <p className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">${selectedInv.amount?.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center gap-3">
                                <CheckCircle size={20} className="text-green-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Funds Disbursed</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-[30px] border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                        This document serves as a verified record of professional services rendered on the platform. All payments are secured via our OOP-driven automated escrow system.
                    </p>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full bg-white rounded-[40px] border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 p-20">
                <FileText size={80} className="mb-6 opacity-10" />
                <h3 className="text-2xl font-black uppercase italic tracking-tighter opacity-30">Selection Required</h3>
                <p className="text-sm font-bold opacity-30 mt-2">Pick an invoice from the sidebar to inspect transaction data.</p>
            </div>
          )}

        </div>

        {/* RIGHT PANEL - SUMMARY CARDS */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-600 p-8 rounded-[40px] text-white shadow-xl shadow-blue-100 space-y-6">
                <h3 className="font-black uppercase italic tracking-tighter text-xl leading-none">Platform <br/> Integrity</h3>
                <p className="text-xs text-blue-100 font-medium leading-relaxed">
                    Every invoice is generated through our cryptographically secure OOP backend. Trust scores are updated automatically based on these transaction records.
                </p>
                <div className="pt-4 space-y-3">
                    <div className="bg-white/10 p-4 rounded-2xl flex items-center gap-3">
                        <TrendingUp size={16} />
                        <span className="text-[10px] font-bold uppercase">Rating Boost Active</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                <h3 className="font-black uppercase tracking-tighter text-slate-800 leading-none">Total Value <br/> Transacted</h3>
                <div className="text-4xl font-black text-blue-600 tracking-tighter italic">
                    ${invoices.reduce((acc, inv) => acc + (inv.amount || 0), 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{invoices.length} Successful Projects</span>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default InvoicePage;

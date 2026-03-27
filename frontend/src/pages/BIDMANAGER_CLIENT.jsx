import React, { useState, useEffect } from 'react';
import { Folder, FileText, CheckCircle } from 'lucide-react';
import { projectsAPI, bidsAPI } from '../services/api';

const FALLBACK_BIDDERS = [
  { id: "bid_1", name: "Arsh Jenkins", match: 97, score: 29, outOf: 30, amount: "$13k", amountNum: 13000, timeline: "2 months", valueScore: 9.1, bestValue: false },
  { id: "bid_2", name: "Jane Doe", match: 93, score: 30, outOf: 30, amount: "$15k", amountNum: 15000, timeline: "2 months", valueScore: 8.8, bestValue: false },
  { id: "bid_3", name: "Janet Doe", match: 97, score: 25, outOf: 30, amount: "$12k", amountNum: 12000, timeline: "2 months", valueScore: 8.0, bestValue: false },
  { id: "bid_4", name: "James Smith", match: 97, score: 28, outOf: 30, amount: "$10k", amountNum: 10000, timeline: "2 months", valueScore: 9.4, bestValue: true },
];

const BidManagerClient = () => {
  const [selectedBidder, setSelectedBidder] = useState("Arsh Jenkins");
  const [bidders, setBidders] = useState(FALLBACK_BIDDERS);
  const [projects, setProjects] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    projectsAPI.getAll()
      .then(res => {
        const data = res.data?.data || [];
        if (data.length > 0) setProjects(data.slice(0, 4));
        // Fetch bids for first project
        if (data[0]?.id) {
          return projectsAPI.getBids(data[0].id);
        }
      })
      .then(bidsRes => {
        if (!bidsRes) return;
        const serverBids = bidsRes.data?.bids || [];
        if (serverBids.length > 0) {
          setBidders(serverBids.map((b, i) => ({
            id: b.id,
            name: b.freelancerName || `Bidder ${i + 1}`,
            match: b.skillScore || 90,
            score: Math.round((b.skillScore || 85) * 30 / 100),
            outOf: 30,
            amount: `$${(b.amount / 1000).toFixed(0)}k`,
            amountNum: b.amount,
            timeline: b.timeline || '2 months',
            valueScore: b.priceValueScore || 8.5,
            bestValue: i === 0,
          })));
        }
      })
      .catch(() => {}); // keep fallback
  }, []);

  const handleBidAction = async (bidId, action) => {
    setActionLoading(bidId + action);
    try {
      if (action === 'accept') await bidsAPI.accept(bidId);
      else if (action === 'shortlist') await bidsAPI.shortlist(bidId);
      else if (action === 'reject') await bidsAPI.reject(bidId);
    } catch (e) { /* fail silently on demo */ }
    finally { setActionLoading(null); }
  };

  const handleSelect = (name) => { setSelectedBidder(name); };

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 font-sans text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold uppercase tracking-wide">Client Bid Management Dashboard</h1>
      </div>

      {/* HORIZONTAL PROJECT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Request Beta (UI/UX)", sub: "sarah Jenkins" },
          { title: "App Redesign - alpha", sub: "alpha" },
          { title: "Request Beta (UI/UX)", sub: "sarah sian" },
          { title: "Project Possign - alpha", sub: "alpha" }
        ].map((card, idx) => (
          <div key={idx} className="bg-white border text-center border-slate-200 rounded-xl p-4 shadow-sm relative hover:border-blue-300 transition-colors cursor-pointer group">
            <h3 className="font-semibold text-sm truncate">{card.title}</h3>
            <p className="text-xs text-slate-500 mt-1">Client Info - {card.sub}</p>
            <div className="mt-3">
              <span className="inline-block px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-md">Open</span>
            </div>
            
            {/* Tooltip on hover for the 2nd item */}
            {idx === 1 && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-lg p-3 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <p className="text-sm font-semibold">Bid details</p>
                <p className="text-xs text-slate-500">Client info: $133k</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
          <p className="text-sm font-semibold text-slate-600">Total Bids Received</p>
          <h2 className="text-3xl font-black mt-2">15</h2>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm text-center">
          <p className="text-sm font-semibold text-slate-600">Average Bid Amount</p>
          <h2 className="text-3xl font-black mt-2">$13,500</h2>
        </div>
      </div>

      {/* CHART & INSIGHTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b pb-2">Value & Trade-off Analysis</h3>
          <div className="relative w-full h-48 mt-4 flex items-end">
             {/* Y-Axis Left (Score) */}
             <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-slate-400 py-1 font-mono text-right w-8">
                <span>10-</span>
                <span>8-</span>
                <span>6-</span>
                <span>4-</span>
                <span>0-</span>
             </div>
             
             {/* Chart Area */}
             <div className="w-full flex-1 ml-10 mr-4 h-full relative border-l border-b border-slate-200">
               {/* Grid */}
               <div className="absolute w-full h-full flex flex-col justify-between pointer-events-none">
                 <div className="border-b border-dashed border-slate-100 w-full flex-1"></div>
                 <div className="border-b border-dashed border-slate-100 w-full flex-1"></div>
                 <div className="border-b border-dashed border-slate-100 w-full flex-1"></div>
                 <div className="w-full flex-1"></div>
               </div>
               
               {/* Bars */}
               <div className="absolute w-full h-full flex items-end justify-around px-2 lg:px-6 z-10">
                 {/* Arsh Jenkins (9.1) */}
                 <div className="w-12 md:w-16 bg-blue-500 hover:bg-blue-600 rounded-t-lg transition-all flex flex-col items-center justify-end group shadow-[0_-2px_6px_rgba(0,0,0,0.05)]" title="Arsh Jenkins: $13k" style={{height: '91%'}}>
                   <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white mb-2 transition-opacity">9.1</span>
                 </div>
                 {/* Jane Doe (8.8) */}
                 <div className="w-12 md:w-16 bg-slate-300 hover:bg-blue-600 rounded-t-lg transition-all flex flex-col items-center justify-end group shadow-[0_-2px_6px_rgba(0,0,0,0.05)]" title="Jane Doe: $15k" style={{height: '88%'}}>
                   <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white mb-2 transition-opacity">8.8</span>
                 </div>
                 {/* Janet Doe (8.0) */}
                 <div className="w-12 md:w-16 bg-slate-300 hover:bg-blue-600 rounded-t-lg transition-all flex flex-col items-center justify-end group shadow-[0_-2px_6px_rgba(0,0,0,0.05)]" title="Janet Doe: $12k" style={{height: '80%'}}>
                   <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white mb-2 transition-opacity">8.0</span>
                 </div>
                 {/* James Smith (9.4) */}
                 <div className="w-12 md:w-16 bg-[#16a34a] hover:bg-green-600 rounded-t-lg transition-all flex flex-col items-center justify-end group relative shadow-[0_-2px_6px_rgba(0,0,0,0.1)]" title="James Smith: $10k" style={{height: '94%'}}>
                   <div className="absolute -top-6 bg-green-100 text-green-800 border border-green-200 text-[8px] font-bold px-1.5 md:px-2 py-0.5 rounded shadow-sm whitespace-nowrap">Best Value</div>
                   <span className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-white mb-2 transition-opacity">9.4</span>
                 </div>
               </div>
             </div>
             
             {/* X-Axis */}
             <div className="absolute bottom-[-24px] w-full ml-10 pr-4 flex justify-around text-[10px] text-slate-600 font-semibold px-2 lg:px-6">
               <span className="w-12 md:w-16 text-center truncate">Arsh J.</span>
               <span className="w-12 md:w-16 text-center truncate">Jane D.</span>
               <span className="w-12 md:w-16 text-center truncate">Janet D.</span>
               <span className="w-12 md:w-16 text-center truncate">James S.</span>
             </div>
             
             {/* Axis Title */}
             <div className="absolute -left-2 top-1/2 -rotate-90 -translate-y-1/2 text-[10px] font-bold tracking-widest text-slate-500 uppercase whitespace-nowrap">Value Score</div>
          </div>
        </div>

        {/* INSIGHTS */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-center">
          <h3 className="text-sm font-bold uppercase tracking-wider mb-2">Value Insights:</h3>
          <div className="mb-3">
             <p className="font-semibold text-sm">Arsh Jenkins (Best Value):</p>
             <p className="text-sm text-slate-600">Score 9, $13k.</p>
          </div>
          <div>
             <p className="font-semibold text-sm">James Smith (Budget Option):</p>
             <p className="text-sm text-slate-600">Score 8.2, $10k.</p>
          </div>
        </div>
      </div>

      {/* BIDDERS TABLE CARED */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left align-middle">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-xs">
              <tr>
                <th className="px-5 py-4">Bidder</th>
                <th className="px-5 py-4 text-center">Skills Match (%)</th>
                <th className="px-5 py-4 text-center">Technical Score</th>
                <th className="px-5 py-4 text-center">Bid Amount</th>
                <th className="px-5 py-4 text-center">Timeline</th>
                <th className="px-5 py-4 text-center">Value Score</th>
                <th className="px-5 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bidders.map((bidder, idx) => (
                <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${selectedBidder === bidder.name ? 'bg-slate-100' : ''}`}>
                  <td className="px-5 py-3 flex items-center gap-3">
                    <img src={`https://i.pravatar.cc/150?u=${bidder.name.replace(' ', '')}`} alt={bidder.name} className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300" />
                    <span className="font-semibold text-slate-800">{bidder.name}</span>
                  </td>
                  <td className="px-5 py-3 text-center font-medium">{bidder.match}%</td>
                  <td className="px-5 py-3 text-center">{bidder.score} / {bidder.outOf}</td>
                  <td className="px-5 py-3 text-center">{bidder.amount}</td>
                  <td className="px-5 py-3 text-center">{bidder.timeline}</td>
                  <td className="px-5 py-3 text-center font-semibold text-slate-800">{bidder.valueScore}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center gap-2">
                       <button className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded text-xs transition-colors">View Profile</button>
                       <button className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded text-xs transition-colors">Shortlist</button>
                       
                       <div className="relative group">
                         <button 
                            onClick={() => handleSelect(bidder.name)}
                            className="px-3 py-1 bg-white border border-slate-300 hover:border-slate-800 hover:bg-slate-800 hover:text-white text-slate-800 font-bold rounded text-xs transition-colors uppercase tracking-wide">
                            ACCEPT BID
                         </button>
                         {/* Hover Tooltip for Accept */}
                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-1.5 bg-black text-white text-xs font-bold rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-10 shadow-lg">
                           **ACCEPT BID - Proceed to Contract
                           <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                         </div>
                       </div>
                    </div>
                    {bidder.bestValue && (
                       <p className="text-center text-[10px] font-semibold text-slate-500 mt-1 uppercase">Highly Recommended (Best Value)</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM DOSSIER SECTION */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-6 mt-4">
        <div className="p-3 bg-slate-600 rounded-xl flex-shrink-0">
          <Folder size={48} className="text-white" fill="currentColor" fillOpacity={0.2} strokeWidth={1.5} />
        </div>
        
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            Dossier & Acceptance for {selectedBidder} (Selected Bids)
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Comprehensive text from foresaero, compresentor adipiscing elits, rend-level in comprehensive tws detailed table card. i.e: a multi-column detailed table, a-column table:finnn-column labives not om column table card, and very nore professional nor-seolsline dossiers. Enned Progress is no and replaced ink standard labens. Made with professional, non sensical free text.
          </p>
        </div>
        
        <div className="flex flex-col gap-2 w-full md:w-auto mt-4 md:mt-0">
          <button className="w-full bg-[#009b4d] hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded shadow-sm flex items-center justify-center gap-2 text-sm transition-colors border-2 border-green-700">
             **CONFIRM ACCEPTANCE
          </button>
          <div className="flex gap-2">
            <button className="flex-1 bg-[#009b4d] hover:bg-green-700 text-white font-bold py-2 px-3 rounded text-xs transition-colors flex items-center justify-center border-2 border-green-700">
              **CONFIRM ACCEPTANCE
            </button>
            <button className="flex-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold py-2 px-3 rounded text-xs transition-colors flex items-center justify-center">
              View Dossier PDF
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default BidManagerClient;

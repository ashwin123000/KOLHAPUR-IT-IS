import React, { useState, useEffect, useRef } from 'react';
import { Folder, CheckCircle, XCircle, Clock, AlertCircle, TrendingUp, TrendingDown, Calendar, Send } from 'lucide-react';
import { projectsAPI, applyAPI, messagesAPI } from '../services/api';
import CircularTimer from '../components/CircularTimer';

export default function BidManagerClient() {
  const clientId = localStorage.getItem('userId') || '';
  const [projects, setProjects] = useState([]);
  const [bids, setBids] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [negMsg, setNegMsg] = useState({});
  const [projectMessages, setProjectMessages] = useState([]);

  // Deadline Modal State
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [hiringBid, setHiringBid] = useState(null);
  const [deadlineDays, setDeadlineDays] = useState(1);
  const [deadlineHours, setDeadlineHours] = useState(0);

  // Fix stale closure in poll interval
  const selectedProjectRef = useRef(null);
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);

  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    refreshProjects();
    const pollId = setInterval(() => { refreshProjects(); }, 5000);
    return () => clearInterval(pollId);
  }, [clientId]);

  const refreshProjects = () => {
    projectsAPI.getForClient(clientId)
      .then(res => {
        const raw = res.data?.data || [];
        const data = raw.map(p => {
          const isArray = Array.isArray(p);
          return {
            id:          isArray ? p[0] : (p.id || p.projectId),
            clientId:    isArray ? p[1] : p.client_id,
            title:       isArray ? p[2] : p.title,
            description: isArray ? p[3] : p.description,
            budget:      isArray ? p[4] : p.budget,
            status:      isArray ? p[5] : p.status,
            assignedFreelancerId: isArray ? p[6] : p.assigned_freelancer_id,
          };
        });

        setProjects(data);

        const currentSel = selectedProjectRef.current;
        if (data.length > 0 && !currentSel) {
          const firstProj = data[0].id;
          setSelectedProject(firstProj);
          selectedProjectRef.current = firstProj;
          fetchBids(firstProj);
          fetchMessages(firstProj);
        } else if (currentSel) {
          fetchBids(currentSel);
          fetchMessages(currentSel);
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  };

  const fetchBids = (projectId) => {
    applyAPI.getApplications(projectId)
      .then(res => {
        const rawBids = res.data?.data || [];
        const mappedBids = rawBids.map(b => {
          const isArray = Array.isArray(b);
          return {
            applicationId: isArray ? b[0] : (b.applicationId || b.id),
            projectId:     isArray ? b[1] : (b.projectId || b.project_id),
            freelancerId:  isArray ? b[2] : (b.freelancerId || b.freelancer_id),
            status:        isArray ? b[3] : b.status,
            coverLetter:   isArray ? b[4] : b.cover_letter,
            bidAmount:     isArray ? b[5] : (b.bidAmount || b.bid_amount),
            freelancerName: `Freelancer ${isArray ? b[2].slice(-4) : ''}`,
            reliabilityScore: 100
          };
        });
        setBids(mappedBids);
      })
      .catch(() => setBids([]))
      .finally(() => setLoading(false));
  };

  const fetchMessages = (projectId) => {
    messagesAPI.getByProject(projectId)
      .then(res => {
        const raw = res.data?.data || [];
        const msgs = raw.map(m => {
          const isArray = Array.isArray(m);
          return {
            id:         isArray ? m[0] : m.id,
            projectId:  isArray ? m[1] : m.project_id,
            senderId:   isArray ? m[2] : (m.senderId || m.sender_id),
            receiverId: isArray ? m[3] : (m.receiverId || m.receiver_id),
            content:    isArray ? m[4] : (m.content || m.message),
            timestamp:  isArray ? m[5] : m.timestamp,
          };
        });
        setProjectMessages(msgs);
      })
      .catch(() => {});
  };
  const handleSelectProject = (projectId) => {
    setSelectedProject(projectId);
    fetchBids(projectId);
    fetchMessages(projectId);
  };

  const handleHireClick = (bid) => {
    setHiringBid(bid);
    setShowDeadlineModal(true);
  };

  const handleConfirmHire = async () => {
    if (!hiringBid) return;
    setActionLoading(hiringBid.applicationId || hiringBid.id);
    try {
      await applyAPI.hire({
        applicationId: hiringBid.applicationId || hiringBid.id,
        projectId: selectedProject,
        freelancerId: hiringBid.freelancerId
      });
      alert("Freelancer hired!");
      setShowDeadlineModal(false);
      refreshProjects();
    } catch (err) {
      alert("Hiring failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBidAction = async (bidId, action) => {
    setActionLoading(bidId + action);
    try {
      if (action === 'reject') {
        setBids(prev => prev.filter(b => (b.applicationId || b.id) !== bidId));
      }
    } catch (_) {}
    finally { setActionLoading(null); }
  };

  const handleNegotiate = async (bidId, freelancerId) => {
    const msg = negMsg[bidId];
    if (!msg || !msg.trim()) return;

    const currentClientId = clientId || localStorage.getItem('userId');
    if (!currentClientId) {
      alert("Error: Your Client ID is missing. Please log out and back in.");
      return;
    }

    setActionLoading(bidId + 'neg');
    const payload = {
      projectId: selectedProject,
      senderId: currentClientId,
      receiverId: freelancerId,
      content: msg
    };

    try {
      await messagesAPI.send(payload);
      setNegMsg(prev => ({ ...prev, [bidId]: '' }));
      fetchMessages(selectedProject);
    } catch (err) {
      alert("Failed to send: " + (err.response?.data?.error || "Error"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (projectId, verify) => {
    try {
      await projectsAPI.verify(projectId, verify);
      alert(verify ? "Work verified and project closed!" : "Submission undone. Project back to In Progress.");
      refreshProjects();
    } catch (err) {
      alert("Action failed");
    }
  };

  const currProj = projects.find(p => (p.projectId || p.id) === selectedProject);

  const getMessagesForBid = (bid) =>
    projectMessages.filter(m =>
      String(m.senderId) === String(bid.freelancerId) ||
      String(m.receiverId) === String(bid.freelancerId) ||
      String(m.senderId) === String(clientId) ||
      String(m.receiverId) === String(clientId)
    );

  return (
    <div className="max-w-[1200px] mx-auto p-4 space-y-6">

      {/* Header */}
      <div className="bg-white rounded-xl p-6 border shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bid Management</h1>
          <p className="text-sm text-slate-500 mt-1">Review proposals and hire top talent for your projects.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
            <p className="text-xs text-green-600 font-bold uppercase">System Status</p>
            <p className="text-sm font-black text-green-700">OOP Integrated</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Sidebar: Projects List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-2">
            <Folder size={14} /> My Projects
          </h2>

          {projects.length === 0 && !loading && (
            <div className="bg-white border rounded-xl p-6 text-center text-slate-400 text-sm">
              No projects posted yet.
            </div>
          )}

          {projects.map(p => {
            const pid = p.id;
            const isSel = selectedProject === pid;
            return (
              <div
                key={pid}
                onClick={() => !isSel && handleSelectProject(pid)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSel ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-blue-300 text-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-sm truncate pr-2">{p.title}</h3>
                  {p.submissionStatus === 'BEFORE' && <TrendingUp size={14} className="text-green-400" />}
                  {p.submissionStatus === 'LATE' && <TrendingDown size={14} className="text-red-400" />}
                </div>
                <div className={`text-[10px] mt-2 inline-block px-2 py-0.5 rounded-full font-semibold uppercase ${
                  isSel ? 'bg-blue-500 text-blue-50' : 'bg-slate-100 text-slate-500'
                }`}>
                  {(p.status || '').replace('_', ' ')}
                </div>
                {p.submissionStatus && (
                  <div className={`text-[9px] font-black mt-2 block ${
                    p.submissionStatus === 'LATE' ? 'text-red-300' : 'text-green-300'
                  }`}>
                    {p.submissionStatus === 'LATE' ? 'LOSS DETECTED (LATE)' : 'PROFITABLE (EARLY)'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Area: Bids List */}
        <div className="lg:col-span-3">
          <div className="bg-white border rounded-xl shadow-sm overflow-hidden min-h-[500px]">

            <div className="bg-slate-50 border-b p-4 flex justify-between items-center">
              <h2 className="font-bold text-slate-800">
                {loading ? 'Loading Bids...' : `Proposals (${bids.length})`}
              </h2>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg" />)}
              </div>
            ) : bids.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <AlertCircle size={48} className="mb-4 opacity-30" />
                <p>No proposals received for this project yet.</p>
              </div>
            ) : (
              <div className="divide-y">
                {bids.map(bid => {
                  const bidMessages = getMessagesForBid(bid);
                  const bidId = bid.applicationId || bid.id;
                  return (
                    <div key={bidId} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-6 justify-between">

                        {/* Left: Freelancer Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-slate-800">{bid.freelancerName || 'Freelancer'}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              bid.status === 'accepted' ? 'bg-green-100 text-green-700' :
                              bid.status === 'rejected'  ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {bid.status}
                            </span>
                          </div>

                          <div className="flex gap-4 text-xs text-slate-500 mb-3">
                            <span className="flex items-center gap-1"><TrendingUp size={12} /> {bid.reliabilityScore || 0}% Trust</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> Year {bid.studyYear || '?'}</span>
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed bg-white border p-3 rounded-lg mt-3 italic text-gray-400">
                            "{bid.coverLetter || 'No cover letter provided.'}"
                          </p>
                        </div>

                        {/* Right: Bid Amount + Negotiation Panel */}
                        <div className="flex flex-row md:flex-col justify-between items-end md:items-end gap-3 min-w-[160px] pl-6 md:border-l border-slate-100">
                          <div className="text-right">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bid Amount</p>
                            <p className="text-2xl font-black text-slate-800">${(bid.bidAmount || 0).toLocaleString()}</p>
                          </div>

                          {(bid.status === 'pending' || bid.status === 'accepted') && (
                            <div className="flex flex-col gap-2 w-full mt-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest pl-1 mb-1">Negotiation Node</p>

                              {/* Chat History */}
                              <div className="max-h-40 overflow-y-auto space-y-2 mb-3 px-1">
                                {bidMessages.map(m => (
                                  <div
                                    key={m.id}
                                    className={`p-2 rounded-xl text-[10px] border ${
                                      String(m.senderId) === String(clientId)
                                        ? 'bg-blue-100 ml-4 border-blue-200'
                                        : 'bg-white mr-4 border-slate-200'
                                    }`}
                                  >
                                    <p className="font-bold text-slate-500 mb-1 uppercase tracking-tighter">
                                      {String(m.senderId) === String(clientId) ? 'You' : (m.senderName || 'Freelancer')}
                                    </p>
                                    <p className="text-slate-700 italic">"{m.content || m.message}"</p>
                                  </div>
                                ))}
                                {bidMessages.length === 0 && (
                                  <p className="text-[9px] text-slate-400 italic text-center py-2">No transmissions logged</p>
                                )}
                              </div>

                              {/* Message Input */}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Message freelancer (e.g. 'Can you do $3500?')"
                                  value={negMsg[bidId] || ''}
                                  onChange={(e) => setNegMsg(prev => ({ ...prev, [bidId]: e.target.value }))}
                                  className="flex-1 text-[11px] border border-blue-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white shadow-sm"
                                />
                                <button
                                  onClick={() => handleNegotiate(bidId, bid.freelancerId)}
                                  disabled={actionLoading === bidId + 'neg'}
                                  className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                                >
                                  {actionLoading === bidId + 'neg' ? '...' : <><Send size={12} /> Negotiate</>}
                                </button>
                              </div>

                              {/* Hire / Reject — only for pending */}
                              {bid.status === 'pending' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleBidAction(bidId, 'reject')}
                                    disabled={actionLoading === bidId + 'reject'}
                                    className="flex-1 flex justify-center items-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors disabled:opacity-50"
                                    title="Reject"
                                  >
                                    <XCircle size={18} />
                                  </button>
                                  <button
                                    onClick={() => handleHireClick(bid)}
                                    disabled={actionLoading === bidId}
                                    className="flex-[2] flex justify-center items-center gap-1.5 p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 font-bold shadow-sm disabled:opacity-50 transition-colors"
                                  >
                                    <CheckCircle size={16} /> Hire
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* Verification Section */}
          {currProj?.status === 'submitted' && (
            <div className="mt-6 bg-slate-800 rounded-xl p-6 text-white shadow-xl flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-green-500 p-3 rounded-full">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Submission Review Required</h3>
                  <p className="text-slate-400 text-sm">Review the work. Verify to finalize or undo to request changes.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVerify(selectedProject, false)}
                  className="bg-slate-700 hover:bg-slate-600 px-6 py-2 rounded-lg font-bold text-sm transition"
                >
                  Undo Submission
                </button>
                <button
                  onClick={() => handleVerify(selectedProject, true)}
                  className="bg-green-500 hover:bg-green-600 px-6 py-2 rounded-lg font-bold text-sm transition"
                >
                  Verify & Close
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Deadline Modal */}
      {showDeadlineModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center gap-4 text-blue-600">
              <Clock size={32} />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Set Project Deadline</h2>
            </div>

            <p className="text-slate-500 text-sm">Setting a deadline enables the real-time profit/loss tracking system. Hired freelancer must submit before this time.</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Days from now</label>
                <input
                  type="number" min="0" max="365"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                  className="w-full text-2xl font-bold bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Hours from now</label>
                <input
                  type="number" min="0" max="23"
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(e.target.value)}
                  className="w-full text-2xl font-bold bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="bg-[#2D333B] p-6 rounded-[2.5rem] border border-slate-700 flex flex-col items-center shadow-inner">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Calculated Deadline Preview</p>
              {(() => {
                const d = new Date();
                d.setDate(d.getDate() + parseInt(deadlineDays || 0));
                d.setHours(d.getHours() + parseInt(deadlineHours || 0));
                return <CircularTimer deadline={d.toISOString()} />;
              })()}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setShowDeadlineModal(false)}
                className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHire}
                className="flex-[2] bg-blue-600 py-4 rounded-2xl font-black text-white shadow-lg shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <CheckCircle size={20} /> Start Project
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
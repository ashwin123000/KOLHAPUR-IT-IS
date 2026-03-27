import React, { useState } from "react";
import { Phone, MessageSquare, Clock, DollarSign, TrendingUp, User, CheckCircle, AlertCircle } from "lucide-react";

const BidderManagement = () => {
  const [selectedBid, setSelectedBid] = useState(0);
  const [selectedChat, setSelectedChat] = useState(0);

  const proposals = [
    {
      id: 1,
      title: "Request Beta (UI/UX) - sarah",
      client: "Sarah Jenkins",
      description: "Project and design",
      deadline: "10h 22m",
      status: "Open"
    },
    {
      id: 2,
      title: "App Redesign - alpha",
      client: "Alex Johnson",
      description: "Mobile app wireframes",
      deadline: "10h 29m",
      status: "Open"
    },
    {
      id: 3,
      title: "Backend API - beta",
      client: "Jane Doe",
      description: "Database and routing",
      deadline: "10h 21m",
      status: "Open"
    },
    {
      id: 4,
      title: "SEO Optimization - gamma",
      client: "John Smith",
      description: "Marketing & SEO",
      deadline: "10h 29m",
      status: "Open"
    }
  ];

  const bidDetails = {
    title: "PROPOSAL Alpha (Detailed Bid Review)",
    client: "Sarah Jenkins",
    clientEmail: "sarah.jenkins@clientd",
    reviewer: "Alex Johnson",
    reviewerRole: "Lead Reviewer",
    bidsReceived: 15,
    avgBid: "$4,500",
    maxBid: "$9,200",
    minBid: "$1,200",
    earnedProgress: "60%",
    executionProgress: "60%",
    bidAmount: 1,
    clientReviewer: "68%"
  };

  const bidders = [
    { name: "Arsh Jenkins", experience: "8 Years", approach: "Agile, User Research Focus", bid: "$4,500", months: "12 months", score: 29, match: "Yes" },
    { name: "Jane Doe", experience: "5 Years", approach: "Rapid Prototyping", bid: "$4,200", months: "10 months", score: 30, match: "Yes" },
    { name: "Janet Doe", experience: "4 Years", approach: "Mobile First Design", bid: "$3,800", months: "9 days", score: 25, match: "No" },
    { name: "James Smith", experience: "6 Years", approach: "Standard Templates", bid: "$4,100", months: "9 days", score: 28, match: "No" },
  ];

  const notifications = [
    { type: "comment", user: "Sarah Jenkins", action: "updated the client requirements", time: "3h ago", icon: "comments" },
    { type: "update", user: "Sarah Jenkins", action: "is typing...", highlight: true }
  ];

  const activeChats = [
    { name: "Sarah Jenkins", role: "Lead Reviewer", avatar: "SJ", color: "bg-blue-100 text-blue-700" },
    { name: "Alex Johnson", role: "Project Lead", avatar: "AJ", color: "bg-purple-100 text-purple-700" },
    { name: "Jane Doe", role: "Technical Lead", avatar: "JD", color: "bg-emerald-100 text-emerald-700" },
    { name: "John Smith", role: "Finance Lead", avatar: "JS", color: "bg-gray-200 text-gray-700" }
  ];

  return (
    <div className="bg-gray-50 min-h-screen p-6 font-sans text-gray-800">
      <div className="max-w-[1600px] mx-auto space-y-6">

        {/* TOP ROW - HORIZONTAL PROPOSAL REQUESTS */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-gray-900 font-bold text-lg flex items-center gap-2">
              <Clock size={20} className="text-blue-500" /> 
              Open Proposal Requests
            </h2>
            <span className="text-gray-500 text-sm">{proposals.length} Active Requests</span>
          </div>
          
          <div className="p-4 flex overflow-x-auto gap-4 snap-x hide-scrollbar">
            {proposals.map((proposal, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedBid(idx)}
                className={`min-w-[300px] snap-start flex-shrink-0 text-left p-4 rounded-lg border transition-all duration-200 ${
                  selectedBid === idx 
                    ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400" 
                    : "bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-900 font-semibold text-sm truncate pr-2">{proposal.title}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${selectedBid === idx ? 'bg-blue-600 text-white font-medium' : 'bg-gray-100 text-gray-600'}`}>
                    {proposal.status}
                  </span>
                </div>
                <p className="text-gray-500 text-xs mb-3 flex items-center gap-1">
                  <User size={12} /> {proposal.client}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <p className="text-gray-500 truncate max-w-[140px]">{proposal.description}</p>
                  <p className="text-gray-700 font-medium flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" /> {proposal.deadline}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT/CENTER - PROPOSAL DETAILS (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* PROPOSAL OVERVIEW */}
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-blue-600 text-xs font-bold tracking-wider uppercase mb-1 block">Selected Proposal</span>
                  <h3 className="text-gray-900 font-semibold text-xl">{bidDetails.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <p className="text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-full text-sm border border-emerald-200">Evaluation Phase</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                {/* CLIENT INFO */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    <img src="https://i.pravatar.cc/150?img=5" alt="client" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Client</p>
                    <p className="text-gray-900 text-sm font-medium">{bidDetails.client}</p>
                    <p className="text-gray-500 text-xs">{bidDetails.clientEmail}</p>
                  </div>
                </div>

                {/* REVIEWER INFO */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                    <img src="https://i.pravatar.cc/150?img=11" alt="reviewer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">{bidDetails.reviewerRole}</p>
                    <p className="text-gray-900 text-sm font-medium">{bidDetails.reviewer}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* KEY METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                <p className="text-gray-500 text-xs mb-1">Bids Received</p>
                <p className="text-gray-900 font-bold text-2xl">{bidDetails.bidsReceived}</p>
              </div>
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                <p className="text-gray-500 text-xs mb-1">Avg Bid Amount</p>
                <p className="text-gray-900 font-bold text-2xl">{bidDetails.avgBid}</p>
              </div>
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                <p className="text-gray-500 text-xs mb-1">Max Bid</p>
                <p className="text-gray-900 font-bold text-2xl">{bidDetails.maxBid}</p>
              </div>
              <div className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm flex flex-col justify-center">
                <p className="text-gray-500 text-xs mb-1">Client Match Score</p>
                <p className="text-blue-600 font-bold text-2xl">{bidDetails.clientReviewer}</p>
              </div>
            </div>

            {/* DETAILED BID ANALYSIS */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-gray-900 font-semibold">Detailed Bid Analysis</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-gray-600 py-3 px-6 font-medium border-b border-gray-200">Bidder Name</th>
                      <th className="text-gray-600 py-3 px-4 font-medium border-b border-gray-200">Experience</th>
                      <th className="text-gray-600 py-3 px-4 font-medium border-b border-gray-200">Proposed Approach</th>
                      <th className="text-gray-600 py-3 px-4 font-medium border-b border-gray-200">Bid Amount</th>
                      <th className="text-gray-600 py-3 px-4 font-medium border-b border-gray-200">Timeline</th>
                      <th className="text-gray-600 py-3 px-4 font-medium border-b border-gray-200 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bidders.map((bidder, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="text-gray-900 py-4 px-6 font-medium">{bidder.name}</td>
                        <td className="text-gray-600 py-4 px-4">{bidder.experience}</td>
                        <td className="text-gray-600 py-4 px-4 text-xs max-w-[200px] truncate">{bidder.approach}</td>
                        <td className="text-gray-900 py-4 px-4 font-semibold">{bidder.bid}</td>
                        <td className="text-gray-600 py-4 px-4">{bidder.months}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${bidder.score >= 28 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {bidder.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>

          {/* RIGHT SIDEBAR (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* NOTIFICATIONS */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100">
                <h3 className="text-gray-900 font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="text-gray-400"/> Notifications
                </h3>
              </div>
              <div className="p-6 space-y-5">
                {notifications.map((notif, idx) => (
                  <div key={idx} className={`flex gap-4 ${notif.highlight ? 'opacity-100' : 'opacity-70'}`}>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-1">
                      {notif.icon === 'comments' ? <MessageSquare size={14} className="text-blue-500" /> : <span className="text-gray-600 font-bold text-xs">SJ</span>}
                    </div>
                    <div>
                      <p className="text-gray-800 text-sm">
                        <span className="font-bold">{notif.user}</span> <span className="text-gray-600">{notif.action}</span>
                      </p>
                      {notif.time && <p className="text-gray-500 text-xs mt-1">{notif.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ACTIVE CHATS */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
              <div className="bg-white px-6 py-4 border-b border-gray-100">
                <h3 className="text-gray-900 font-bold flex items-center gap-2">
                  <MessageSquare size={18} className="text-blue-500"/> Active Chats ({activeChats.length})
                </h3>
              </div>

              <div className="p-4 space-y-2 overflow-y-auto flex-1 hide-scrollbar">
                {activeChats.map((chat, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedChat(idx)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      selectedChat === idx ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`${chat.color} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className="text-sm font-bold">{chat.avatar}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-gray-900 text-sm font-semibold truncate">{chat.name}</p>
                      <p className="text-gray-500 text-xs truncate">{chat.role}</p>
                    </div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"></div>
                  </button>
                ))}
              </div>

              {/* MESSAGE INPUT */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="relative">
                  <textarea 
                    placeholder="Type a message..."
                    className="w-full bg-white text-gray-900 placeholder-gray-400 rounded-lg pl-4 pr-12 py-3 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm resize-none shadow-sm"
                    rows="2"
                  />
                  <button className="absolute right-3 bottom-3 bg-blue-600 hover:bg-blue-700 transition text-white p-1.5 rounded-md">
                    <CheckCircle size={16} />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default BidderManagement;
import React, { useEffect, useState } from 'react';
import { Award, Zap, AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function FreelancerRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Assume projectId is passed via route or context. Hardcoded for UI demo.
    setTimeout(() => {
      setRecommendations([
        {
          freelancer: { id: 'f_1', username: 'Rahul Sharma', experienceLevel: 4, skills: ['React', 'C++', 'Node.js'], reliabilityScore: 98, totalEarnings: 15400, completedProjects: 24, isActive: true },
          finalScore: 92.5,
          matchPercentage: 100,
          matchedSkills: ['React', 'C++'],
          missingSkills: [],
          isEligible: true
        },
        {
          freelancer: { id: 'f_2', username: 'Pooja Patel', experienceLevel: 3, skills: ['React', 'Tailwind'], reliabilityScore: 85, totalEarnings: 4200, completedProjects: 8, isActive: true },
          finalScore: 78.0,
          matchPercentage: 50,
          matchedSkills: ['React'],
          missingSkills: ['C++'],
          isEligible: true
        },
        {
          freelancer: { id: 'f_3', username: 'Amit Kumar', experienceLevel: 2, skills: ['Python'], reliabilityScore: 40, totalEarnings: 1200, completedProjects: 3, isActive: false },
          finalScore: 12.0,
          matchPercentage: 0,
          matchedSkills: [],
          missingSkills: ['React', 'C++'],
          isEligible: false
        }
      ]);
    }, 800);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">AI Freelancer Matches</h1>
            <p className="text-slate-500 mt-1">Recommended talent for Project: <span className="font-semibold">Fullstack C++ Integration</span></p>
          </div>
          <button onClick={() => navigate('/client-dashboard')} className="text-emerald-600 font-medium hover:underline">
            Back to Dashboard
          </button>
        </header>

        <div className="space-y-6">
          {recommendations.map((rec, idx) => (
            <div key={rec.freelancer.id} className={`bg-white p-6 rounded-xl shadow-sm border ${idx === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} transition flex items-start flex-col sm:flex-row gap-6`}>
              
              {/* Profile Image & Rank Placeholder */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-xl font-bold text-slate-500 mb-2">
                  {rec.freelancer.username.charAt(0)}
                </div>
                {idx === 0 && <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Zap size={12}/> Top Pick</span>}
              </div>

              {/* Main Info */}
              <div className="flex-1 w-full">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      {rec.freelancer.username} 
                      {rec.freelancer.reliabilityScore >= 90 && <ShieldCheck className="text-blue-500" size={18} title="Highly Reliable"/>}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">Level {rec.freelancer.experienceLevel} Freelancer &bull; ${rec.freelancer.totalEarnings} earned</p>
                  </div>
                  
                  {/* Matching Score Circle */}
                  <div className="flex flex-col items-end">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Match Score</span>
                      <p className={`text-2xl font-black ${rec.finalScore > 80 ? 'text-emerald-600' : rec.finalScore > 50 ? 'text-orange-500' : 'text-red-500'}`}>
                        {rec.finalScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trust & Fraud Info */}
                <div className="flex gap-4 mt-3 mb-4">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <CheckCircle size={16} className={rec.freelancer.reliabilityScore > 80 ? "text-emerald-500" : "text-slate-400"} />
                    Reliability: {rec.freelancer.reliabilityScore}%
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                    <Award size={16} className="text-indigo-500" />
                    {rec.freelancer.completedProjects} Jobs Completed
                  </div>
                  {!rec.freelancer.isActive && (
                    <div className="flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                      <AlertTriangle size={16} /> Inactive Flag
                    </div>
                  )}
                </div>

                {/* Skills Analysis */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-2">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Skill Gap Analysis ({rec.matchPercentage}% Match)</p>
                  <div className="flex flex-wrap gap-2">
                    {rec.matchedSkills.map(skill => (
                      <span key={skill} className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-200">{skill}</span>
                    ))}
                    {rec.missingSkills.map(skill => (
                      <span key={skill} className="bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded border border-red-200 line-through decoration-red-300">{skill}</span>
                    ))}
                  </div>
                </div>

              </div>
              
              {/* Action Button */}
              <div className="w-full sm:w-auto mt-4 sm:mt-0 flex flex-col justify-center h-full pt-2">
                <button 
                  disabled={!rec.isEligible}
                  className={`px-6 py-2.5 rounded-lg font-semibold w-full whitespace-nowrap transition ${
                    rec.isEligible 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {rec.isEligible ? 'View Profile & Hire' : 'Not Eligible'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { hiringOSAPI, applyAPI, projectsAPI } from "../services/api";
import { normalizeSkillWeights } from "../utils/normalizeSkills";
import CareerChatWidget from "../components/CareerChatWidget";

function LeftPanel({ matchDetails, matchLoading, matchError }) {
  if (matchLoading) {
    return (
      <div className="space-y-5">
        <section className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="space-y-2">
            <div className="h-32 bg-slate-200 rounded"></div>
          </div>
        </section>
      </div>
    );
  }

  if (matchError === "upload_resume") {
    return (
      <div className="space-y-5">
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-bold text-amber-900 mb-2">Upload Your Resume</h3>
          <p className="text-sm text-amber-800">
            To see your match score and personalized insights, please upload your resume first.
          </p>
        </section>
      </div>
    );
  }

  if (!matchDetails) {
    return (
      <div className="space-y-5">
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-4">Match Score</h3>
          <div className="text-sm text-slate-600">Loading match analysis...</div>
        </section>
      </div>
    );
  }

  const matchScore = matchDetails.totalScore || 0;
  const decision = matchDetails.decision || "BORDERLINE";
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - circumference * (matchScore / 100);
  const ringColor =
    matchScore >= 70 ? "#16a34a" : matchScore >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="space-y-5">
      {/* Match Score Card */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-bold text-slate-900 mb-4">Your Match Score</h3>
        <div className="flex justify-center">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-40 h-40 -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-slate-900">{matchScore}%</span>
              <span className="text-xs uppercase tracking-wide text-slate-500">Match</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-600 space-y-2">
          <div className="flex items-center justify-between">
            <span>Decision:</span>
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                decision === "STRONG_MATCH"
                  ? "bg-green-100 text-green-800"
                  : decision === "BORDERLINE"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {decision?.replace("_", " ")}
            </span>
          </div>
          {matchDetails.confidence !== undefined && (
            <div>
              <span>Confidence:</span>
              <div className="mt-1 h-2 bg-slate-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.round(matchDetails.confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs text-slate-500">{Math.round(matchDetails.confidence * 100)}%</span>
            </div>
          )}
          {matchDetails.explanation && (
            <div className="p-2 bg-blue-50 rounded border border-blue-200 text-blue-900 text-xs">
              {matchDetails.explanation}
            </div>
          )}
        </div>
      </section>

      {/* Score Breakdown */}
      {matchDetails.scoreBreakdown && Object.keys(matchDetails.scoreBreakdown).length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-4">Score Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: "Core skills", key: "coreSkills", color: "bg-purple-500" },
              { label: "Supporting skills", key: "supportingSkills", color: "bg-blue-400" },
              { label: "Project evidence", key: "evidence", color: "bg-teal-400" }
            ].map(({ label, key, color }) => {
              const data = matchDetails.scoreBreakdown[key];
              if (!data) return null;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm text-slate-700 mb-1">
                    <span className="font-medium">{label}</span>
                    <span>{data.score}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${data.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skill Gaps / Weaknesses */}
      {matchDetails.weaknesses && matchDetails.weaknesses.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-4">Skill Gaps</h3>
          <div className="space-y-2">
            {matchDetails.weaknesses.map((w, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  w.severity === "high"
                    ? "bg-red-50 border border-red-200"
                    : "bg-amber-50 border border-amber-200"
                }`}
              >
                <div
                  className={`font-semibold text-sm ${
                    w.severity === "high" ? "text-red-800" : "text-amber-800"
                  }`}
                >
                  {w.severity === "high" ? "🚫" : "⚠️"} {w.skill}
                </div>
                <p
                  className={`text-xs mt-1 ${
                    w.severity === "high" ? "text-red-700" : "text-amber-700"
                  }`}
                >
                  {w.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strong Skills */}
      {matchDetails.strongSkills && matchDetails.strongSkills.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-3">Your Strengths</h3>
          <div className="flex flex-wrap gap-2">
            {matchDetails.strongSkills.map((skill, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium"
              >
                ✓ {skill}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CenterPanel({ roleHeader = {}, skillGraph = [], domainTable = [] }) {
  const normalizedSkills = useMemo(() => normalizeSkillWeights(skillGraph), [skillGraph]);

  return (
    <div className="space-y-5">
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h1 className="text-3xl font-black text-slate-900">{roleHeader.title}</h1>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold">{roleHeader.domain}</span>
          <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold">{roleHeader.seniorityLevel}</span>
          <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            {roleHeader.personaArchetype || "Not specified"}
          </span>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-bold text-slate-900 mb-4">Core Competencies</h3>
        <div className="space-y-3">
          {normalizedSkills.map((skill) => (
            <div key={skill.skill}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-800">{skill.skill}</span>
                <span className="text-slate-500">{skill.displayPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(4, skill.displayPercent)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="font-bold text-slate-900 mb-4">Domains of Responsibility</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="pb-2 font-semibold">Domain</th>
                <th className="pb-2 font-semibold">Core Responsibility</th>
                <th className="pb-2 font-semibold">Success Metric</th>
              </tr>
            </thead>
            <tbody>
              {domainTable.map((domain, index) => (
                <tr key={`${domain.domain}-${index}`} className="border-b border-slate-100 align-top">
                  <td className="py-3 font-semibold text-slate-800">{domain.domain}</td>
                  <td className="py-3 text-slate-600">{domain.coreResponsibility}</td>
                  <td className="py-3 text-slate-600">{domain.successMetric}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RightPanel({ matchDetails, screeningQuestions = [], eligibilityFilters = [], exclusionFilters = [] }) {
  return (
    <div className="space-y-5">
      {/* Insights Section */}
      {matchDetails?.insights && matchDetails.insights.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-3">🧠 Key Insights</h3>
          <div className="space-y-2">
            {matchDetails.insights.map((insight, i) => (
              <div
                key={i}
                className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg text-sm text-blue-900"
              >
                {insight}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Suggestions Section */}
      {matchDetails?.suggestions && matchDetails.suggestions.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-3">🚀 How to Improve</h3>
          <div className="space-y-3">
            {matchDetails.suggestions.map((s, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-slate-800 text-sm">{s.title}</span>
                  <span className="text-green-600 font-bold text-xs bg-green-50 px-2 py-1 rounded-full">
                    {s.impact}
                  </span>
                </div>
                {s.timeToLearn && (
                  <p className="text-xs text-slate-500 mb-2">⏱️ {s.timeToLearn}</p>
                )}
                <ul className="space-y-1">
                  {s.steps && s.steps.map((step, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex gap-2">
                      <span className="text-slate-400 flex-shrink-0">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
                {s.projectIdea && (
                  <div className="mt-2 p-2 bg-white rounded text-xs text-slate-600 border border-slate-200">
                    💡 <span className="font-medium">Project idea:</span> {s.projectIdea}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Interview Questions Section */}
      {matchDetails?.interviewQuestions && matchDetails.interviewQuestions.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-3">🎯 Interview Prep</h3>
          <div className="space-y-2">
            {matchDetails.interviewQuestions.map((question, i) => (
              <details key={i} className="group border border-slate-200 rounded-lg p-3 bg-slate-50 cursor-pointer">
                <summary className="font-medium text-sm text-slate-800 flex justify-between items-center">
                  <span>Q{i + 1}: {question.substring(0, 50)}...</span>
                  <span className="text-slate-400">▼</span>
                </summary>
                <p className="mt-2 text-sm text-slate-700 pt-2 border-t border-slate-200">{question}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Screening Questions (from job) */}
      {screeningQuestions.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-4">Screening Questions</h3>
          <div className="space-y-3">
            {screeningQuestions.map((question, index) => (
              <details key={`${question.question}-${index}`} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                <summary className="cursor-pointer font-semibold text-slate-800">
                  <span className="text-[10px] uppercase tracking-wide text-emerald-700 mr-2">{question.category}</span>
                  {question.question}
                </summary>
                <div className="mt-3 text-sm text-slate-600 space-y-2">
                  <div><strong>Look for:</strong> {question.whatToLookFor}</div>
                  <div><strong>Green flags:</strong> {(question.greenFlags || []).join(", ")}</div>
                  <div><strong>Red flags:</strong> {(question.redFlags || []).join(", ")}</div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Eligibility */}
      {((eligibilityFilters || []).length > 0 || (exclusionFilters || []).length > 0) && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="font-bold text-slate-900 mb-4">Eligibility</h3>
          <div className="space-y-2">
            {(eligibilityFilters || []).map((filter, index) => (
              <div key={`${filter.filter}-${index}`} className="text-sm text-slate-700 border border-slate-200 rounded-lg p-2 bg-slate-50">
                <strong className="text-slate-900">✓ {filter.requirement}:</strong> {filter.filter}
              </div>
            ))}
            {(exclusionFilters || []).map((filter, index) => (
              <div key={`${filter.filter}-${index}`} className="text-sm text-red-700 border border-red-100 rounded-lg p-2 bg-red-50">
                <strong>✗ {filter.filter}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function AIJobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") || "";
  const token = localStorage.getItem("token") || "";
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasApplied, setHasApplied] = useState(false);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [applying, setApplying] = useState(false);
  
  // Match details state
  const [matchDetails, setMatchDetails] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);

  // Fetch job data
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await hiringOSAPI.getAIJobDetail(id, userId);
        if (!active) return;
        if (res.data?.error) {
          setError(res.data.message || "Unable to calculate match.");
          return;
        }
        const job = res.data?.job;
        if (!job?.compiledDashboard?.roleHeader || !job?.compiledDashboard?.skillGraph || !job?.compiledDashboard?.domainTable) {
          setError("Incomplete job data");
          return;
        }
        setData(res.data);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.response?.data?.detail || loadError.message || "Failed to load job.");
      } finally {
        if (active) setLoading(false);
      }
    }

    async function checkApplicationStatus() {
      if (!userId) return;
      try {
        const res = await projectsAPI.getForFreelancer(userId);
        if (!active) return;
        const myProjects = res.data?.data || [];
        const ids = new Set(myProjects.map(p => p.projectId || p.id));
        if (ids.has(id)) {
          setHasApplied(true);
        }
      } catch (err) {
        console.error("Failed to check application status", err);
      }
    }

    load();
    checkApplicationStatus();
    return () => {
      active = false;
    };
  }, [id, userId]);

  // Fetch match details
  useEffect(() => {
    if (!data || !userId) return;
    
    let active = true;
    async function fetchMatch() {
      setMatchLoading(true);
      try {
        const axios = (await import('axios')).default;
        const response = await axios.post(
          "/api/match/calculate",
          { jobId: id, seekerId: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (active) {
          // TEMP DEBUG
          const matchRes = response.data;
          const fields = ["weaknesses", "insights", "suggestions", "interviewQuestions", "scoreBreakdown"];
          fields.forEach(f => {
            if (!matchRes[f]) {
              console.error(`MISSING FIELD: ${f} not in API response`);
            } else if (Array.isArray(matchRes[f]) && matchRes[f].length === 0) {
              console.warn(`EMPTY FIELD: ${f} is an empty array`);
            } else {
              console.log(`OK: ${f} has ${Array.isArray(matchRes[f]) ? matchRes[f].length : 'value'}`);
            }
          });
          console.log("Match intelligence loaded:", matchRes);
          
          setMatchDetails(matchRes);
        }
      } catch (err) {
        if (active) {
          // Check if it's an "upload resume" error
          if (err.response?.status === 404 && err.response?.data?.detail?.includes("Seeker not found")) {
            setMatchError("upload_resume");
          } else {
            setMatchError("Could not calculate match score");
            console.error("Match error:", err);
          }
        }
      } finally {
        if (active) setMatchLoading(false);
      }
    }
    
    fetchMatch();
    return () => {
      active = false;
    };
  }, [data, userId, token, id]);

  const handleMatchScoreUpdate = (newScore) => {
    setMatchDetails(prev => ({
      ...prev,
      totalScore: newScore
    }));
  };

  const handleApply = async () => {
    if (!id || !userId) {
      setApplyMsg("❌ Missing project or user information");
      return;
    }
    setApplying(true);
    setApplyMsg("");
    try {
      await applyAPI.apply({
        projectId: id,
        freelancerId: userId,
        coverLetter: coverLetter || "No proposal"
      });
      setApplyMsg("✅ Application submitted successfully!");
      setHasApplied(true);
      setTimeout(() => setApplyModalOpen(false), 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Application failed";
      setApplyMsg(`❌ ${errorMsg}`);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={30} />
      </div>
    );
  }

  if (error || !data?.job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-lg">
          <div className="flex gap-3 text-red-700">
            <AlertTriangle className="shrink-0" />
            <div>
              <h2 className="font-bold">Job unavailable</h2>
              <p className="text-sm mt-1">{error || "The job could not be loaded."}</p>
              <button onClick={() => navigate("/jobs")} className="mt-4 text-sm font-semibold text-red-700">
                Back to AI Jobs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { job } = data;
  const jobTitle = job?.compiledDashboard?.roleHeader?.title || job?.basicDetails?.projectTitle || "Unknown Role";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/jobs")} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <ArrowLeft size={16} />
            Back to AI Jobs
          </button>
          {hasApplied ? (
            <button
              disabled
              className="bg-emerald-50 text-emerald-600 px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 border border-emerald-100"
            >
              ✓ Already Applied
            </button>
          ) : (
            <button
              onClick={() => {
                setCoverLetter("");
                setApplyMsg("");
                setApplyModalOpen(true);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              Apply for Project
            </button>
          )}
        </div>

        <div className="grid xl:grid-cols-[0.28fr_0.44fr_0.28fr] gap-6">
          <LeftPanel 
            matchDetails={matchDetails} 
            matchLoading={matchLoading}
            matchError={matchError}
          />
          <CenterPanel
            roleHeader={job.compiledDashboard?.roleHeader}
            skillGraph={job.compiledDashboard?.skillGraph || []}
            domainTable={job.compiledDashboard?.domainTable || []}
          />
          <RightPanel
            matchDetails={matchDetails}
            screeningQuestions={job.compiledDashboard?.screeningQuestions || []}
            eligibilityFilters={job.compiledDashboard?.eligibilityFilters || []}
            exclusionFilters={job.compiledDashboard?.exclusionFilters || []}
          />
        </div>
      </div>

      {/* Career Chat Widget */}
      <CareerChatWidget 
        jobId={id}
        jobTitle={jobTitle}
        matchScore={matchDetails?.totalScore}
        onMatchScoreUpdate={handleMatchScoreUpdate}
      />

      {/* APPLY MODAL */}
      {applyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setApplyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>

            <h2 className="text-2xl font-black text-slate-800 mb-1">Apply for {jobTitle}</h2>
            <p className="text-slate-500 mb-6 font-medium">Set your terms for this project</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Why should we hire you?</label>
                <textarea
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Describe your experience and how you can help..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              {applyMsg && (
                <div className={`p-3 rounded-lg text-xs font-bold text-center ${applyMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                  {applyMsg}
                </div>
              )}

              <button
                onClick={handleApply}
                className="bg-blue-600 text-white py-4 w-full rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                disabled={applying}
              >
                {applying ? "Sending Proposal..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

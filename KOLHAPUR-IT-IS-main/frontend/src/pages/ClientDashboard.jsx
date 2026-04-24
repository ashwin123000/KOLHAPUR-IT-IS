import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Briefcase, CheckCircle2, Eye, Loader2, Shield, Sparkles, Users } from 'lucide-react';

import { clientDashboardAPI } from '../services/api';


function MetricCard({ label, value, helper, icon: Icon }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{helper}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </div>
  );
}


function JobCard({ job, selected, onClick, onManageTest }) {
  const topMatch = job.topCandidates?.[0]?.matchData?.totalScore || 0;
  const assessment = job.assessment || {};
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border p-5 text-left transition ${selected ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-900">{job.basicDetails?.projectTitle}</p>
          <p className="mt-1 text-sm text-slate-500">{job.compiledDashboard?.roleHeader?.domain || 'Project pipeline'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] ${job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : job.status === 'in_progress' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          {job.status}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Applied</p>
          <p className="mt-2 text-xl font-black text-slate-900">{job.applicationCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Shortlisted</p>
          <p className="mt-2 text-xl font-black text-slate-900">{job.shortlistedCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Top Match</p>
          <p className="mt-2 text-xl font-black text-slate-900">{topMatch}%</p>
        </div>
      </div>

      {job.topCandidates?.length ? (
        <div className="mt-5 flex items-center gap-2">
          <div className="flex -space-x-2">
            {job.topCandidates.map((candidate) => (
              <div key={candidate.applicationId || candidate._id} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-emerald-200 text-xs font-black text-emerald-900">
                {candidate.seekerSnapshot?.name?.[0] || '?'}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">AI-ranked using real seeker profile, skill depth, persona, and gaps.</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${assessment.configured ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          {assessment.configured ? (assessment.isActive ? 'Test Active' : 'Test Draft') : 'No Test'}
        </span>
        {assessment.configured ? (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
            Pending reviews {assessment.pendingReviewCount || 0}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onManageTest?.();
          }}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          Manage Test
        </button>
      </div>
    </button>
  );
}


function ApplicationRow({ application, selected, onClick, onStatus }) {
  const score = application.matchData?.totalScore || 0;
  const scoreTone = score >= 80 ? 'bg-emerald-100 text-emerald-700' : score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full border-b border-slate-100 px-4 py-4 text-left transition ${selected ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'}`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
          {application.seekerSnapshot?.name?.[0] || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{application.seekerSnapshot?.name || 'Unnamed candidate'}</p>
          <p className="truncate text-xs text-slate-500">{application.seekerSnapshot?.careerTrajectory || 'Seeker profile'}</p>
        </div>
        <div className={`rounded-2xl px-3 py-2 text-center ${scoreTone}`}>
          <p className="text-lg font-black">{score}%</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]">match</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{application.status}</span>
        <button type="button" onClick={(event) => { event.stopPropagation(); onStatus('shortlisted'); }} className="text-xs font-semibold text-emerald-700 hover:text-emerald-900">Shortlist</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onStatus('interview'); }} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Interview</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onStatus('rejected'); }} className="text-xs font-semibold text-rose-600 hover:text-rose-800">Reject</button>
      </div>
    </button>
  );
}


function DetailPanel({ application, seeker }) {
  if (!application || !seeker) {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Select a candidate to inspect their full seeker intelligence profile.</p>
      </div>
    );
  }

  const matchData = application.matchData || {};
  const githubFlags = seeker.githubAnalysis?.authenticityFlags || [];

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-black text-slate-900">{seeker.identity?.name}</p>
            <p className="mt-1 text-sm text-slate-500">{seeker.aiProfile?.careerTrajectory} · {seeker.aiProfile?.seniorityLevel}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Match Score</p>
            <p className="mt-1 text-3xl font-black text-emerald-700">{matchData.totalScore || 0}%</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {[
            ['Technical', matchData.breakdown?.technicalDepth || 0, 40],
            ['Persona', matchData.breakdown?.personaAlignment || 0, 20],
            ['Domain', matchData.breakdown?.domainOverlap || 0, 30],
            ['Filter', matchData.breakdown?.hardFilterPass || 0, 10],
          ].map(([label, score, max]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{score}/{max}</p>
            </div>
          ))}
        </div>
      </div>

      {githubFlags.length ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <Shield className="h-4 w-4" />
            GitHub Authenticity Analysis
          </div>
          <div className="mt-4 space-y-3">
            {githubFlags.map((flag) => (
              <div key={`${flag.skill}-${flag.issue}`} className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800">
                <p className="font-semibold">{flag.skill}</p>
                <p className="mt-1 text-xs">{flag.message}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Skill Depth Heatmap
        </div>
        <div className="mt-5 space-y-3">
          {(seeker.skills || []).map((skill) => (
            <div key={skill.skillNormalized}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">{skill.skillNormalized}</span>
                <span className="text-slate-400">{skill.depthScore}/10</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${skill.depthScore >= 8 ? 'bg-emerald-500' : skill.depthScore >= 5 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ width: `${(skill.depthScore || 0) * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Projects vs JD-style Domain Table</p>
        <div className="mt-5 space-y-4">
          {(seeker.projects || []).map((project) => (
            <div key={project.title} className="rounded-2xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{project.title}</p>
              <div className="mt-3 space-y-2">
                {(project.domainTable || []).map((row, index) => (
                  <div key={`${row.domain}-${index}`} className="grid gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Domain</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{row.domain}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Responsibility</p>
                      <p className="mt-1 text-sm text-slate-700">{row.coreResponsibility}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Success Metric</p>
                      <p className="mt-1 text-sm text-slate-700">{row.successMetric}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Gap Analysis</p>
          <div className="mt-4 space-y-2">
            {(matchData.gaps || []).length ? (
              matchData.gaps.map((gap) => (
                <div key={gap} className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{gap}</div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No major hard gaps detected.</p>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Improve My Score Suggestions</p>
          <div className="mt-4 space-y-2">
            {(matchData.improvementSuggestions || []).map((item) => (
              <div key={item} className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{item}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export default function ClientDashboard() {
  const navigate = useNavigate();
  const clientId = localStorage.getItem('userId') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApplicationId, setSelectedApplicationId] = useState('');
  const [selectedSeeker, setSelectedSeeker] = useState(null);

  const selectedJob = useMemo(() => jobs.find((job) => job._id === selectedJobId) || null, [jobs, selectedJobId]);
  const selectedApplication = useMemo(
    () => applications.find((application) => (application.applicationId || application._id) === selectedApplicationId) || null,
    [applications, selectedApplicationId],
  );

  const fetchDashboard = async () => {
    if (!clientId) return;
    setLoading(true);
    setError('');
    try {
      const [summaryResponse, jobsResponse] = await Promise.all([
        clientDashboardAPI.getSummary(clientId),
        clientDashboardAPI.getJobs(clientId),
      ]);
      const nextSummary = summaryResponse.data?.data || null;
      const nextJobs = jobsResponse.data?.jobs || [];
      setSummary(nextSummary);
      setJobs(nextJobs);
      if (nextJobs.length) {
        const initialJobId = selectedJobId || nextJobs[0]._id;
        setSelectedJobId(initialJobId);
      }
    } catch (loadError) {
      setError(loadError.response?.data?.detail || loadError.message || 'Failed to load client dashboard.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async (jobId) => {
    if (!jobId) return;
    const response = await clientDashboardAPI.getApplications(jobId, { sortBy: 'matchScore' });
    const nextApplications = response.data?.applications || [];
    setApplications(nextApplications);
    if (nextApplications.length) {
      const first = nextApplications[0];
      const applicationId = first.applicationId || first._id;
      setSelectedApplicationId(applicationId);
      if (first.seekerId) {
        const seekerResponse = await clientDashboardAPI.getSeeker(first.seekerId, jobId);
        setSelectedSeeker(seekerResponse.data?.seeker || null);
      } else {
        setSelectedSeeker(null);
      }
    } else {
      setSelectedApplicationId('');
      setSelectedSeeker(null);
    }
  };

  const handleStatus = async (applicationId, status) => {
    await clientDashboardAPI.updateApplicationStatus(applicationId, { status });
    await fetchApplications(selectedJobId);
    await fetchDashboard();
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedJobId) fetchApplications(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    const loadSeeker = async () => {
      if (!selectedApplication?.seekerId || !selectedJobId) return;
      const response = await clientDashboardAPI.getSeeker(selectedApplication.seekerId, selectedJobId);
      setSelectedSeeker(response.data?.seeker || null);
    };
    loadSeeker();
  }, [selectedApplicationId]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Client Intelligence Dashboard</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900">Posted projects, real applications, and seeker intelligence in one place.</h1>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Projects" value={summary?.totalProjects || 0} helper="Active client-side job pipeline" icon={Briefcase} />
        <MetricCard label="Pending Applications" value={summary?.pendingApplications || 0} helper="Fresh submissions awaiting review" icon={Users} />
        <MetricCard label="In Progress" value={summary?.activeProjects || 0} helper="Projects currently moving" icon={CheckCircle2} />
        <MetricCard label="Total Spend" value={`$${Number(summary?.totalSpent || 0).toLocaleString()}`} helper="Tracked from live client projects" icon={Eye} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              <Briefcase className="h-4 w-4 text-emerald-500" />
              Posted Projects
            </div>
            <div className="mt-5 space-y-4">
              {jobs.length ? jobs.map((job) => (
                <JobCard
                  key={job._id}
                  job={job}
                  selected={job._id === selectedJobId}
                  onClick={() => setSelectedJobId(job._id)}
                  onManageTest={() => navigate(`/recruiter/jobs/${job._id}/test`)}
                />
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  No client projects found yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Applications</p>
              <p className="mt-1 text-sm text-slate-500">Sorted by intelligence match score for the selected project.</p>
            </div>
            <div className="max-h-[560px] overflow-auto">
              {applications.length ? applications.map((application) => {
                const id = application.applicationId || application._id;
                return (
                  <ApplicationRow
                    key={id}
                    application={application}
                    selected={id === selectedApplicationId}
                    onClick={() => setSelectedApplicationId(id)}
                    onStatus={(status) => handleStatus(id, status)}
                  />
                );
              }) : (
                <div className="px-6 py-10 text-sm text-slate-500">No applications for this project yet.</div>
              )}
            </div>
          </div>

          {selectedApplication?.matchData?.semanticBonusApplied ? (
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <Sparkles className="h-4 w-4" />
                Semantic skill distance bonus applied
              </div>
              <p className="mt-2 text-sm text-emerald-700">
                This candidate earned partial credit for adjacent skills, not just exact keywords.
              </p>
            </div>
          ) : null}

          {selectedApplication?.matchData?.gaps?.length ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
                <AlertTriangle className="h-4 w-4" />
                Current Gaps For This Job
              </div>
              <div className="mt-3 space-y-2">
                {selectedApplication.matchData.gaps.map((gap) => (
                  <div key={gap} className="rounded-2xl bg-white px-4 py-3 text-sm text-rose-700">{gap}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DetailPanel application={selectedApplication} seeker={selectedSeeker} />
      </div>
    </div>
  );
}

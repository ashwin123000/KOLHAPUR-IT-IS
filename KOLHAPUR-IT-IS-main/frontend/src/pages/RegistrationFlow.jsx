import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Check, Cpu, FileText, Loader2, Sparkles, UploadCloud } from 'lucide-react';

import { authAPI, seekerAPI } from '../services/api';


const PIPELINE_STAGES = [
  'Extracting layout-aware text from your resume',
  'Normalizing skills and college names',
  'Scoring field confidence',
  'Inferring persona and career trajectory',
  'Preparing seeker intelligence profile',
];

function formatUploadError(err) {
  const detail = err?.response?.data?.detail;
  const fallback = err?.response?.data?.error || err?.message || 'Resume parsing failed';

  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail
      .map((item) => item?.msg || item?.message || (typeof item === 'string' ? item : ''))
      .filter(Boolean)
      .join(', ') || fallback;
  }
  return fallback;
}

function normalizeResumePayload(payload) {
  const parsed = payload?.prefillData || payload?.parsed || payload?.data || null;
  if (!parsed) {
    return { profile: null, confidence: null, fileUrl: payload?.file_url || '' };
  }

  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.map((skill) => {
        if (typeof skill === 'string') {
          return { skillNormalized: skill, depthScore: 5 };
        }
        return {
          ...skill,
          skillNormalized: skill?.skillNormalized || skill?.name || skill?.skill || 'Unknown Skill',
          depthScore: Number(skill?.depthScore ?? skill?.depth_score ?? skill?.score ?? 5),
        };
      })
    : [];

  const education = Array.isArray(parsed.education)
    ? parsed.education.map((item) => ({
        ...item,
        institutionNormalized: item?.institutionNormalized || item?.institution || '',
        matchConfidence: Number(item?.matchConfidence ?? item?.confidence ?? 0),
      }))
    : [];

  const profile = {
    identity: {
      name: parsed?.identity?.name || parsed?.full_name || '',
      email: parsed?.identity?.email || parsed?.email || '',
      location: {
        city: parsed?.identity?.location?.city || parsed?.city || '',
        state: parsed?.identity?.location?.state || parsed?.state || '',
        country: parsed?.identity?.location?.country || 'India',
      },
      github: parsed?.identity?.github || '',
    },
    skills,
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    education,
    aiProfile: {
      profileCompleteness: Number(parsed?.aiProfile?.profileCompleteness ?? parsed?.confidence ?? 0),
      personaArchetype: parsed?.aiProfile?.personaArchetype || '',
      careerTrajectory: parsed?.aiProfile?.careerTrajectory || '',
      seniorityLevel: parsed?.aiProfile?.seniorityLevel || '',
      topDomains: Array.isArray(parsed?.aiProfile?.topDomains) ? parsed.aiProfile.topDomains : [],
    },
  };

  const confidence = payload?.confidence || parsed?.confidence || parsed?.confidenceScore || null;
  const normalizedConfidence = typeof confidence === 'number'
    ? { overall: confidence, strong_fields: [], review_fields: [], missing_fields: [] }
    : confidence;

  return {
    profile,
    confidence: normalizedConfidence,
    fileUrl: payload?.file_url || '',
  };
}


function ConfidenceBanner({ confidence }) {
  const tone =
    confidence?.overall >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : confidence?.overall >= 60 ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-center gap-4">
        <div className="text-3xl font-black">{confidence?.overall || 0}%</div>
        <div>
          <p className="text-sm font-semibold">Extraction Confidence</p>
          <p className="text-xs">
            {confidence?.strong_fields?.length ? `Strong: ${confidence.strong_fields.join(', ')}` : 'No high-confidence fields yet.'}
          </p>
        </div>
      </div>
      {confidence?.review_fields?.length ? (
        <p className="mt-3 text-xs">Needs review: {confidence.review_fields.join(', ')}</p>
      ) : null}
      {confidence?.missing_fields?.length ? (
        <p className="mt-1 text-xs">Missing: {confidence.missing_fields.join(', ')}</p>
      ) : null}
    </div>
  );
}


function SkillChip({ skill, onRemove }) {
  const scoreClass =
    skill.depthScore >= 8 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : skill.depthScore >= 5 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-rose-100 text-rose-700 border-rose-200';

  return (
    <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${scoreClass}`}>
      <span>{skill.skillNormalized}</span>
      <span className="ml-2 opacity-75">{skill.depthScore}/10</span>
      <button type="button" onClick={onRemove} className="ml-2 opacity-70 hover:opacity-100">x</button>
    </div>
  );
}


export default function RegistrationFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [resumeMeta, setResumeMeta] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    city: '',
    state: '',
    college: '',
    aadhaar: '',
    github: '',
  });

  const parsedSkills = profile?.skills || [];
  const education = profile?.education || [];

  const profileStrength = useMemo(() => {
    if (!profile?.aiProfile?.profileCompleteness) return [];
    const suggestions = [];
    if (!profile?.identity?.github) suggestions.push('Add GitHub link for authenticity checks');
    if ((profile?.projects || []).length < 2) suggestions.push('Add one more project to strengthen matching');
    if (!parsedSkills.some((skill) => skill.depthScore >= 7)) suggestions.push('Confirm one production-ready skill');
    return suggestions.slice(0, 3);
  }, [profile, parsedSkills]);

  const updateProfile = (updater) => setProfile((current) => ({ ...current, ...updater }));

  const handleResumeUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setFileName(file.name);
    setStageIndex(0);

    const ticker = window.setInterval(() => {
      setStageIndex((current) => (current + 1 >= PIPELINE_STAGES.length ? current : current + 1));
    }, 1100);

    try {
      const response = await authAPI.uploadResume(file);
      const payload = response.data;
      const normalized = normalizeResumePayload(payload);
      setResumeMeta(normalized.fileUrl);
      setConfidence(normalized.confidence);
      setProfile(normalized.profile);
      setForm((current) => ({
        ...current,
        full_name: normalized.profile?.identity?.name || current.full_name,
        email: normalized.profile?.identity?.email || current.email,
        city: normalized.profile?.identity?.location?.city || current.city,
        state: normalized.profile?.identity?.location?.state || current.state,
        college: normalized.profile?.education?.[0]?.institutionNormalized || current.college,
      }));
      setStep(1);
    } catch (err) {
      setError(formatUploadError(err));
    } finally {
      window.clearInterval(ticker);
      setUploading(false);
      setStageIndex(PIPELINE_STAGES.length - 1);
    }
  };

  const handleComplete = async () => {
    if (!profile || !form.email || !password || !form.github) {
      setError('Email, password, GitHub profile, and parsed profile are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const registerPayload = {
        full_name: form.full_name,
        email: form.email,
        password,
        city: form.city,
        state: form.state,
        college: form.college,
        aadhaar: form.aadhaar,
        github: form.github,
        skills: profile.skills?.map((skill) => skill.skillNormalized) || [],
        resume_file_url: resumeMeta,
      };
      const registerResponse = await authAPI.registerV2(registerPayload);
      const userId = registerResponse.data?.data?.id;
      const completedProfile = structuredClone(profile);

      completedProfile.identity = {
        ...completedProfile.identity,
        name: form.full_name,
        email: form.email,
        location: {
          ...(completedProfile.identity?.location || {}),
          city: form.city,
          state: form.state,
          country: 'India',
        },
      };
      if (completedProfile.education?.[0]) {
        completedProfile.education[0].institutionNormalized = form.college || completedProfile.education[0].institutionNormalized;
      }
      completedProfile.preferences = completedProfile.preferences || {
        workMode: 'any',
        expectedStipend: 0,
        openToRelocation: true,
        preferredRoles: [],
        noticePeriod: 'Immediate',
      };

      await seekerAPI.saveProfile(userId, completedProfile);
      navigate('/login-freelancer');
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-emerald-600">Seeker Intelligence Registration</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Upload once. Review once. Start matching with real profile intelligence.</h1>
        </div>

        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <div
                className="flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-emerald-300 bg-emerald-50 text-center transition hover:border-emerald-500"
                onClick={() => document.getElementById('resume-file-input')?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleResumeUpload(event.dataTransfer.files?.[0]);
                }}
              >
                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(event) => handleResumeUpload(event.target.files?.[0])}
                />
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                  {uploading ? <Loader2 className="h-7 w-7 animate-spin text-emerald-600" /> : <UploadCloud className="h-7 w-7 text-emerald-600" />}
                </div>
                <h2 className="text-xl font-bold text-slate-900">{uploading ? 'Analyzing your resume' : 'Drop your resume PDF here'}</h2>
                <p className="mt-2 text-sm text-slate-500">{uploading ? PIPELINE_STAGES[stageIndex] : 'Layout-aware parsing, confidence scoring, skill normalization, and profile generation.'}</p>
                {fileName ? <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">{fileName}</p> : null}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                <Cpu className="h-4 w-4 text-emerald-500" />
                Pipeline Stages
              </div>
              <div className="mt-6 space-y-4">
                {PIPELINE_STAGES.map((label, index) => {
                  const active = index <= stageIndex && uploading;
                  return (
                    <div key={label} className={`rounded-2xl border px-4 py-3 text-sm ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? 'bg-emerald-600 text-white' : 'bg-white text-slate-400'}`}>
                          {active ? <Check className="h-4 w-4" /> : index + 1}
                        </div>
                        {label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 && profile ? (
          <div className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-6">
              <ConfidenceBanner confidence={confidence} />

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Profile Strength
                </div>
                <div className="mt-4 text-4xl font-black text-slate-900">{profile.aiProfile?.profileCompleteness || 0}%</div>
                <div className="mt-4 space-y-2">
                  {profileStrength.map((item) => (
                    <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{item}</div>
                  ))}
                </div>
              </div>

              {profile.aiProfile?.personaArchetype ? (
                <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">AI Persona</p>
                  <p className="mt-3 text-2xl font-black text-slate-900">{profile.aiProfile.personaArchetype}</p>
                  <p className="mt-1 text-sm text-slate-500">{profile.aiProfile.careerTrajectory} · {profile.aiProfile.seniorityLevel}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(profile.aiProfile.topDomains || []).map((domain) => (
                      <span key={domain} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{domain}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-black text-slate-900">Review your seeker profile</h2>
              <p className="mt-2 text-sm text-slate-500">Everything below came from your uploaded resume or your edits. No dummy data is being shown here.</p>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Full Name</label>
                  <input value={form.full_name} onChange={(e) => setForm((current) => ({ ...current, full_name: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Email</label>
                  <input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">City</label>
                  <input value={form.city} onChange={(e) => setForm((current) => ({ ...current, city: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">State</label>
                  <input value={form.state} onChange={(e) => setForm((current) => ({ ...current, state: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">College</label>
                  <input value={form.college} onChange={(e) => setForm((current) => ({ ...current, college: e.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Aadhaar</label>
                  <input value={form.aadhaar} onChange={(e) => setForm((current) => ({ ...current, aadhaar: e.target.value.replace(/\D/g, '').slice(0, 12) }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.2em] text-slate-500">GitHub Profile Link <span className="text-rose-600">*</span></label>
                  <input value={form.github} onChange={(e) => setForm((current) => ({ ...current, github: e.target.value }))} placeholder="https://github.com/yourprofile" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-400" />
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Normalized Skills</p>
                  <p className="text-xs text-slate-400">{parsedSkills.length} skills</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {parsedSkills.map((skill, index) => (
                    <SkillChip
                      key={`${skill.skillNormalized}-${index}`}
                      skill={skill}
                      onRemove={() => updateProfile({ skills: parsedSkills.filter((_, skillIndex) => skillIndex !== index) })}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                {education.map((item, index) => (
                  <div key={`${item.institutionNormalized}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{item.institutionNormalized || item.institution}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.degree || 'Degree'} {item.field ? `· ${item.field}` : ''}</p>
                    <p className="mt-2 text-xs text-slate-400">Match confidence: {item.matchConfidence || 0}%</p>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Projects</p>
                <div className="mt-3 space-y-3">
                  {(profile.projects || []).map((project, index) => (
                    <div key={`${project.title}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                      <p className="font-semibold text-slate-900">{project.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{project.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(project.techStack || []).map((tech) => (
                          <span key={tech} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{tech}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button type="button" onClick={() => setStep(0)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                  Back to upload
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Confirm & complete registration
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 && !profile ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-4 text-sm text-slate-500">No parsed profile is available yet.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

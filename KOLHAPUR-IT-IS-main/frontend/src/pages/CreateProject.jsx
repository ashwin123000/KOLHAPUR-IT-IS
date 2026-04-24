import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Search,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { apiFetch } from "../api/config";
import { hiringOSAPI } from "../services/api";
import { getSkillColor, isMetricMeasurable, normalizeSkillWeights } from "../utils/normalizeSkills";

const EXPERIENCE_OPTIONS = [
  "Fresher (0-1 yr)",
  "Junior (1-3 yrs)",
  "Mid (3-5 yrs)",
  "Senior (5+ yrs)",
];

const PERSONAS = ["Builder", "Analyst", "Operator", "Researcher", "Creative"];

const METHOD_OPTIONS = [
  {
    value: "manual_text",
    title: "Manual Text",
    description: "Paste or type the JD yourself, then let AI analyze and structure it.",
    icon: FileText,
  },
  {
    value: "ai_chatbot",
    title: "AI Chatbot",
    description: "Start from the raw JD and let AI turn it into structured recruiter intelligence.",
    icon: Bot,
  },
];

const initialFormData = {
  basicDetails: {
    projectTitle: "",
    domain: "",
    experienceRequired: "",
    salary: {
      min: "",
      max: "",
      currency: "USD",
      disclosed: true,
      salaryType: "monthly",
    },
    workMode: "remote",
    timeCommitment: "fulltime",
  },
  jdMethod: "manual_text",
  rawJD: {
    text: "",
    sourceMethod: "manual_typed",
    pdfUrl: null,
  },
  aiAnalysis: null,
  missingFields: [],
  compiledEnhancement: null,
};

function StepIndicator({ step }) {
  const labels = ["Basic Details", "JD Method", "Input", "AI Verify", "Review"];
  return (
    <div className="grid md:grid-cols-5 gap-3 mb-8">
      {labels.map((label, index) => {
        const position = index + 1;
        const done = position < step;
        const active = position === step;
        return (
          <div key={label} className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold ${
                done
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : active
                  ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                  : "bg-white border-slate-200 text-slate-400"
              }`}
            >
              {done ? <CheckCircle2 size={15} /> : position}
            </div>
            <span className={`text-sm font-medium ${active || done ? "text-slate-800" : "text-slate-400"}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PreviewSkillBars({ skills }) {
  const normalized = normalizeSkillWeights(skills);
  if (!normalized.length) {
    return <div className="text-sm text-slate-400">No extracted skills yet.</div>;
  }
  return (
    <div className="space-y-3">
      {normalized.slice(0, 5).map((skill) => (
        <div key={skill.skill}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700">{skill.skill}</span>
            <span className="text-slate-500">{skill.displayPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(4, skill.displayPercent)}%`,
                backgroundColor: getSkillColor(skill),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QAChat({ allQuestions, currentQuestion, currentIndex, onAnswer, history, allDone }) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, currentIndex, allDone]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Bot size={16} className="text-emerald-600" />
        <h3 className="font-bold text-slate-900">AI Verification</h3>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-emerald-500 rounded-full"
          style={{ width: `${allQuestions.length ? Math.round((currentIndex / allQuestions.length) * 100) : 100}%` }}
        />
      </div>
      <div className="text-xs text-slate-500 mb-4">
        {allDone ? "All questions answered" : `Question ${Math.min(currentIndex + 1, allQuestions.length)} of ${allQuestions.length}`}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {history.map((message, index) => (
          <div key={`${message.from}-${index}`} className={`flex ${message.from === "ai" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                message.from === "ai"
                  ? "bg-slate-100 text-slate-700 rounded-bl-sm"
                  : "bg-emerald-600 text-white rounded-br-sm"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {!allDone && currentQuestion && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          {currentQuestion.context ? (
            <div className="text-xs text-slate-500 mb-2">{currentQuestion.context}</div>
          ) : null}
          <div className="font-semibold text-slate-900 mb-3">{currentQuestion.question}</div>
          <div className="space-y-2">
            {(currentQuestion.options || ["Yes", "No"]).map((option) => (
              <button
                key={option}
                onClick={() => onAnswer(currentQuestion, option)}
                className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-sm font-medium"
              >
                {option}
              </button>
            ))}
            <button
              onClick={() => onAnswer(currentQuestion, null)}
              className="w-full text-left px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium"
            >
              Mark as Not Specified
            </button>
          </div>
        </div>
      )}

      {allDone ? (
        <div className="mt-4 border-t border-slate-200 pt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
          Dashboard fully configured. Review the left panel, then continue to review.
        </div>
      ) : null}
    </div>
  );
}

export default function CreateProject() {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId") || "";

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [qaAnswers, setQaAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);

  useEffect(() => {
    const query = formData.basicDetails.projectTitle.trim();
    if (query.length < 2) {
      setTitleSuggestions([]);
      return undefined;
    }
    const timeout = setTimeout(async () => {
      try {
        const response = await hiringOSAPI.autocompleteTitles(query);
        setTitleSuggestions(response.data || []);
      } catch {
        setTitleSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [formData.basicDetails.projectTitle]);

  const allQuestions = useMemo(() => {
    if (!formData.aiAnalysis) return [];
    return [
      ...(formData.aiAnalysis.verificationQuestions || []),
      ...(formData.aiAnalysis.missingFieldQuestions || []),
    ];
  }, [formData.aiAnalysis]);

  const allDone = allQuestions.length === 0 || questionIndex >= allQuestions.length;

  const currentQuestion = allQuestions[questionIndex] || null;
  const normalizedSkills = useMemo(
    () => normalizeSkillWeights(formData.compiledEnhancement?.skillWeights || formData.aiAnalysis?.skillWeights || []),
    [formData.compiledEnhancement, formData.aiAnalysis]
  );

  const canContinueBasic = useMemo(() => {
    const details = formData.basicDetails;
    return Boolean(
      details.projectTitle.trim().length >= 5 &&
      details.experienceRequired &&
      details.workMode &&
      details.timeCommitment
    );
  }, [formData.basicDetails]);

  const canAnalyze = formData.rawJD.text.trim().length >= 150 && !isAnalyzing;

  const updateEnhancementField = (path, value) => {
    setFormData((prev) => {
      const next = {
        ...prev,
        compiledEnhancement: {
          ...(prev.compiledEnhancement || {}),
          skillWeights: [...(prev.compiledEnhancement?.skillWeights || prev.aiAnalysis?.skillWeights || [])],
          personaArchetype: {
            ...(prev.compiledEnhancement?.personaArchetype || prev.aiAnalysis?.personaArchetype || {}),
          },
          hardFilters: {
            ...(prev.compiledEnhancement?.hardFilters || prev.aiAnalysis?.hardFilters || {}),
          },
          domainTable: [...(prev.compiledEnhancement?.domainTable || prev.aiAnalysis?.domainTable || [])],
          tools: [...(prev.compiledEnhancement?.tools || prev.aiAnalysis?.tools || [])],
          codingIntensity: prev.compiledEnhancement?.codingIntensity ?? prev.aiAnalysis?.codingIntensity ?? 50,
          workContext: {
            ...(prev.compiledEnhancement?.workContext || prev.aiAnalysis?.workContext || {}),
          },
        },
      };

      const parts = path.split(".");
      if (parts.length === 1) {
        next.compiledEnhancement[parts[0]] = value;
      } else if (parts.length === 2) {
        next.compiledEnhancement[parts[0]] = {
          ...(next.compiledEnhancement[parts[0]] || {}),
          [parts[1]]: value,
        };
      }
      return next;
    });
  };

  const initializeEnhancementFromAnalysis = (analysis) => {
    setFormData((prev) => ({
      ...prev,
      aiAnalysis: analysis,
      missingFields: analysis.missingFields || [],
      compiledEnhancement: {
        skillWeights: normalizeSkillWeights(analysis.skillWeights || []),
        personaArchetype: analysis.personaArchetype || { selected: "" },
        hardFilters: analysis.hardFilters || {},
        domainTable: analysis.domainTable || [],
        tools: analysis.tools || [],
        codingIntensity: analysis.codingIntensity ?? 50,
        workContext: analysis.workContext || {},
        qaAnswers: {},
      },
    }));

    setQuestionIndex(0);
    setQaAnswers({});
    setChatHistory([
      {
        from: "ai",
        text:
          (analysis.extractionConfidence?.overall || 0) >= 70
            ? `I pre-filled the dashboard with ${Math.round(analysis.extractionConfidence.overall)}% confidence. Let’s verify the remaining assumptions.`
            : "I extracted the structure, but some fields need verification before publishing.",
      },
    ]);
  };

  const handleAnalyzeJD = async (textOverride = "") => {
    const text = (textOverride || formData.rawJD.text).trim();
    if (text.length < 150) {
      setError("Please enter at least 150 characters before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    setError("");
    try {
      const result = await apiFetch("/api/jd/analyze", {
        method: "POST",
        body: JSON.stringify({ rawJD: text }),
      });

      setFormData((prev) => ({
        ...prev,
        rawJD: {
          ...prev.rawJD,
          text,
          sourceMethod: prev.rawJD?.sourceMethod || "manual_typed",
        },
      }));
      initializeEnhancementFromAnalysis(result.analysis);
      setStep(4);
    } catch (analysisError) {
      setError(`Analysis failed: ${analysisError.message}. Check your connection and try again.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("PDF exceeds 10MB limit.");
      return;
    }

    setPdfLoading(true);
    setError("");
    try {
      const response = await hiringOSAPI.parseJDpdf(file);
      const payload = response.data || {};
      setFormData((prev) => ({
        ...prev,
        rawJD: {
          text: payload.text || "",
          sourceMethod: "pdf_parsed",
          pdfUrl: payload.pdfUrl || null,
        },
      }));
      await handleAnalyzeJD(payload.text || "");
    } catch (uploadError) {
      setError(`PDF parsing failed: ${uploadError.message}. Please paste the JD text manually.`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleAnswer = (question, answerValue) => {
    const displayAnswer = answerValue === null ? "Not Specified" : String(answerValue);
    const nextAnswers = {
      ...qaAnswers,
      [question.id]: answerValue,
    };
    setQaAnswers(nextAnswers);

    if (question.affectsField) {
      updateEnhancementField(question.affectsField, answerValue);
    }

    // Move to next question or mark all done
    if (questionIndex + 1 < allQuestions.length) {
      setQuestionIndex((prev) => prev + 1);
      setChatHistory((prev) => [
        ...prev,
        { from: "user", text: displayAnswer },
        {
          from: "ai",
          text: "Got it. I updated the dashboard with that answer.",
        },
      ]);
      setFormData((prev) => ({
        ...prev,
        missingFields:
          answerValue === null
            ? prev.missingFields
            : prev.missingFields.filter((field) => field !== question.affectsField && field !== question.missingField),
        compiledEnhancement: {
          ...(prev.compiledEnhancement || {}),
          qaAnswers: nextAnswers,
        },
      }));
    } else {
      // All questions answered - clear missing fields state
      setChatHistory((prev) => [
        ...prev,
        { from: "user", text: displayAnswer },
        {
          from: "ai",
          text: "All verification questions are complete. The dashboard is ready for review.",
        },
      ]);
      setFormData((prev) => ({
        ...prev,
        step4Complete: true,
        missingFields: [], // FIX 1: Clear top-level missing fields
        aiAnalysis: {
          ...prev.aiAnalysis,
          missingFields: [], // FIX 2: Clear backend's missing fields trigger
          missingFieldQuestions: [],
          verificationQuestions: [],
        },
        compiledEnhancement: {
          ...(prev.compiledEnhancement || {}),
          qaAnswers: nextAnswers,
        },
      }));
    }
  };

  const reviewBlocked = useMemo(() => {
    if (!formData.aiAnalysis) return true;
    if (!allDone) return true;
    return (formData.missingFields || []).length > 0;
  }, [formData.aiAnalysis, allDone, formData.missingFields]);

  const previewModel = useMemo(() => {
    const enhancement = formData.compiledEnhancement || {};
    const analysis = formData.aiAnalysis || {};
    return {
      roleHeader: {
        title: formData.basicDetails.projectTitle || analysis.roleTitle || "Untitled role",
        domain: analysis.domain || formData.basicDetails.domain || "Not specified",
        seniorityLevel: analysis.seniorityLevel || "Not specified",
        personaArchetype: enhancement.personaArchetype?.selected || analysis.personaArchetype?.selected || "Not specified",
      },
      skillGraph: normalizedSkills,
      domainTable: enhancement.domainTable || analysis.domainTable || [],
      hardFilters: enhancement.hardFilters || analysis.hardFilters || {},
      tools: enhancement.tools || analysis.tools || [],
      workContext: enhancement.workContext || analysis.workContext || {},
    };
  }, [formData, normalizedSkills]);

  const publishJob = async () => {
    if (reviewBlocked) {
      setError("Resolve all missing fields in Step 4 before publishing.");
      return;
    }

    setPublishing(true);
    setError("");
    try {
      const payload = {
        postedBy: userId,
        basicDetails: formData.basicDetails,
        rawJD: formData.rawJD.text,
        enhancementData: formData.compiledEnhancement,
        aiAnalysis: formData.aiAnalysis,
      };
      const result = await apiFetch("/api/jobs/publish", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setFormData((prev) => ({
        ...prev,
        publishedJob: result,
      }));
      setStep(5);
    } catch (publishError) {
      setError(`Publish failed: ${publishError.message}. Please try again.`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <button onClick={() => navigate("/client-projects")} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <ArrowLeft size={16} />
          Back to client workspace
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <StepIndicator step={step} />

        {error ? (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 1 of 5: Basic Details</h2>
              <p className="text-sm text-slate-500 mb-6">Set the role frame first so the AI can analyze the JD in the right context.</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Project Title</label>
                  <div className="relative">
                    <input
                      value={formData.basicDetails.projectTitle}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          basicDetails: { ...prev.basicDetails, projectTitle: event.target.value },
                        }))
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm"
                      placeholder="ML Engineer - Data Platform"
                    />
                    <Search size={16} className="absolute right-3 top-3.5 text-slate-400" />
                  </div>
                  {titleSuggestions.length ? (
                    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                      {titleSuggestions.map((item) => (
                        <button
                          key={item.title}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              basicDetails: {
                                ...prev.basicDetails,
                                projectTitle: item.title,
                                domain: prev.basicDetails.domain || item.category,
                              },
                            }))
                          }
                          className="w-full text-left px-4 py-3 bg-white hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-semibold text-sm text-slate-800">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.category}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Domain</label>
                    <input
                      value={formData.basicDetails.domain}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          basicDetails: { ...prev.basicDetails, domain: event.target.value },
                        }))
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                      placeholder="Machine Learning"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Experience Required</label>
                    <select
                      value={formData.basicDetails.experienceRequired}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          basicDetails: { ...prev.basicDetails, experienceRequired: event.target.value },
                        }))
                      }
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    >
                      <option value="">Select experience</option>
                      {EXPERIENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <input
                    type="number"
                    value={formData.basicDetails.salary.min}
                    disabled={!formData.basicDetails.salary.disclosed}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        basicDetails: {
                          ...prev.basicDetails,
                          salary: { ...prev.basicDetails.salary, min: event.target.value },
                        },
                      }))
                    }
                    className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Min salary"
                  />
                  <input
                    type="number"
                    value={formData.basicDetails.salary.max}
                    disabled={!formData.basicDetails.salary.disclosed}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        basicDetails: {
                          ...prev.basicDetails,
                          salary: { ...prev.basicDetails.salary, max: event.target.value },
                        },
                      }))
                    }
                    className="border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    placeholder="Max salary"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={!formData.basicDetails.salary.disclosed}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          basicDetails: {
                            ...prev.basicDetails,
                            salary: {
                              ...prev.basicDetails.salary,
                              disclosed: !event.target.checked,
                            },
                          },
                        }))
                      }
                    />
                    Not disclosed
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-2">
                    {["remote", "onsite", "hybrid"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            basicDetails: { ...prev.basicDetails, workMode: mode },
                          }))
                        }
                        className={`flex-1 px-3 py-3 rounded-xl border text-sm font-semibold ${
                          formData.basicDetails.workMode === mode
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {["fulltime", "parttime", "contract"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            basicDetails: { ...prev.basicDetails, timeCommitment: mode },
                          }))
                        }
                        className={`flex-1 px-3 py-3 rounded-xl border text-sm font-semibold ${
                          formData.basicDetails.timeCommitment === mode
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                            : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <button
                  disabled={!canContinueBasic}
                  onClick={() => setStep(2)}
                  className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-emerald-600" />
                <h3 className="font-bold text-slate-900">What AI will build</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">Skill weighting with must-have detection</div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">Domain table with measurable success metrics</div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">Verification questions for anything uncertain</div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 2 of 5: Choose JD Method</h2>
            <p className="text-sm text-slate-500 mb-6">The analyzer runs in both cases. This only changes how the raw JD gets collected.</p>
            <div className="grid md:grid-cols-2 gap-4">
              {METHOD_OPTIONS.map((option) => {
                const Icon = option.icon;
                const selected = formData.jdMethod === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData((prev) => ({ ...prev, jdMethod: option.value }))}
                    className={`border rounded-2xl p-6 text-left ${
                      selected ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${selected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                      <Icon size={22} />
                    </div>
                    <div className="text-lg font-bold text-slate-900">{option.title}</div>
                    <div className="text-sm text-slate-600 mt-2">{option.description}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                Back
              </button>
              <button onClick={() => setStep(3)} className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold">
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Step 3 of 5: Input Job Description</h2>
            <p className="text-sm text-slate-500 mb-6">Paste the JD or upload a PDF. Then run AI analysis before moving on.</p>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-5">
                <div className="border border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50">
                  <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
                    <UploadCloud size={18} />
                    {pdfLoading ? "Extracting PDF..." : "Upload PDF"}
                    <input type="file" accept="application/pdf" className="hidden" onChange={(event) => handlePdfUpload(event.target.files?.[0])} />
                  </label>
                  <p className="text-xs text-slate-500 mt-2">PDFs auto-fill the textarea and immediately trigger AI analysis.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Raw JD Text</label>
                  <textarea
                    value={formData.rawJD.text}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        rawJD: {
                          ...prev.rawJD,
                          text: event.target.value,
                          sourceMethod: prev.rawJD.sourceMethod || "manual_typed",
                        },
                      }))
                    }
                    rows={14}
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm leading-6"
                    placeholder="Describe role scope, responsibilities, required skills, tools, work context, and success criteria."
                  />
                  <div className="text-xs text-slate-500 mt-2">Character count: {formData.rawJD.text.length} / 8000</div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                  <button
                    onClick={() => handleAnalyzeJD()}
                    disabled={!canAnalyze}
                    className="w-full px-5 py-4 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Analyzing JD... extracting skills, tools and gaps
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Analyze JD →
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 mt-3">
                    AI extracts skill weights, persona, filters, tools, metrics, and follow-up questions for anything uncertain.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-emerald-600" />
                  <h3 className="font-bold text-slate-900">Analysis Preview</h3>
                </div>
                <PreviewSkillBars skills={formData.aiAnalysis?.skillWeights || []} />
                {formData.aiAnalysis?.extractionConfidence ? (
                  <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                    formData.aiAnalysis.extractionConfidence.overall >= 70
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}>
                    {formData.aiAnalysis.extractionConfidence.overall >= 70
                      ? `Extraction confidence: ${formData.aiAnalysis.extractionConfidence.overall}%`
                      : "AI uncertain — please verify carefully in Step 4."}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button onClick={() => setStep(2)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                Back
              </button>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div className="mb-2">
              <h2 className="text-2xl font-bold text-slate-900">Step 4 of 5: AI Verification & Auto-Fill</h2>
              <p className="text-sm text-slate-500 mt-1">
                Answer the AI questions on the right and edit the auto-filled dashboard on the left.
              </p>
            </div>

            <div className="grid xl:grid-cols-[0.62fr_0.38fr] gap-6">
              <div className="space-y-5">
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900">Skill Weight Engine</h3>
                      <p className="text-xs text-slate-500 mt-1">Adjust importance and mark the true must-haves.</p>
                    </div>
                    {formData.aiAnalysis?.extractionConfidence ? (
                      <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                        formData.aiAnalysis.extractionConfidence.overall >= 70
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {(formData.aiAnalysis.extractionConfidence.overall || 0) >= 70
                          ? `${formData.aiAnalysis.extractionConfidence.overall}% confidence`
                          : "Verify carefully"}
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-4">
                    {normalizedSkills.map((skill, index) => (
                      <div key={`${skill.skill}-${index}`} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <div className="font-semibold text-slate-900">{skill.skill}</div>
                            <div className="text-xs text-slate-500">{skill.category}</div>
                          </div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={Boolean(skill.isMustHave)}
                              onChange={(event) => {
                                const next = [...normalizedSkills];
                                next[index] = { ...next[index], isMustHave: event.target.checked };
                                updateEnhancementField("skillWeights", next);
                              }}
                            />
                            Must Have
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={skill.weight || 1}
                            onChange={(event) => {
                              const next = [...normalizedSkills];
                              next[index] = { ...next[index], weight: Number(event.target.value) };
                              updateEnhancementField("skillWeights", next);
                            }}
                            className="flex-1"
                          />
                          <div className="w-12 text-sm font-semibold text-slate-700 text-right">{skill.displayPercent}%</div>
                        </div>
                        {skill.whyImportant ? (
                          <div className="text-xs text-slate-500 mt-2">{skill.whyImportant}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-900 mb-4">Persona & Hard Filters</h3>
                  <div className="grid lg:grid-cols-2 gap-5">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Persona Archetype</div>
                      <div className="grid grid-cols-2 gap-2">
                        {PERSONAS.map((persona) => (
                          <button
                            key={persona}
                            onClick={() => updateEnhancementField("personaArchetype.selected", persona)}
                            className={`px-3 py-3 rounded-xl border text-sm font-semibold ${
                              previewModel.roleHeader.personaArchetype === persona
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                : "bg-white text-slate-600 border-slate-200"
                            }`}
                          >
                            {persona}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {[
                        ["educationRequired", "Education Required"],
                        ["remoteOnly", "Remote Only"],
                        ["toolRecencyRequired", "Tool Recency Required"],
                      ].map(([field, label]) => (
                        <label key={field} className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(formData.compiledEnhancement?.hardFilters?.[field])}
                            onChange={(event) => updateEnhancementField(`hardFilters.${field}`, event.target.checked)}
                          />
                        </label>
                      ))}
                      <div className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Coding Intensity</span>
                          <span className="font-semibold">{formData.compiledEnhancement?.codingIntensity || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={formData.compiledEnhancement?.codingIntensity || 0}
                          onChange={(event) => updateEnhancementField("codingIntensity", Number(event.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <h3 className="font-bold text-slate-900 mb-4">Role Architecture Table</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-slate-200 text-slate-500">
                          <th className="pb-2">Domain</th>
                          <th className="pb-2">Core Responsibility</th>
                          <th className="pb-2">Success Metric</th>
                          <th className="pb-2">Effort</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.compiledEnhancement?.domainTable || []).map((row, index) => (
                          <tr key={`${row.domain}-${index}`} className="border-b border-slate-100 align-top">
                            <td className="py-3 pr-3">
                              <input
                                value={row.domain || ""}
                                onChange={(event) => {
                                  const next = [...(formData.compiledEnhancement?.domainTable || [])];
                                  next[index] = { ...next[index], domain: event.target.value };
                                  updateEnhancementField("domainTable", next);
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <textarea
                                rows={2}
                                value={row.coreResponsibility || ""}
                                onChange={(event) => {
                                  const next = [...(formData.compiledEnhancement?.domainTable || [])];
                                  next[index] = { ...next[index], coreResponsibility: event.target.value };
                                  updateEnhancementField("domainTable", next);
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <input
                                value={row.successMetric || ""}
                                onChange={(event) => {
                                  const next = [...(formData.compiledEnhancement?.domainTable || [])];
                                  next[index] = { ...next[index], successMetric: event.target.value };
                                  updateEnhancementField("domainTable", next);
                                }}
                                className={`w-full border rounded-lg px-3 py-2 ${
                                  isMetricMeasurable(row.successMetric || "")
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-amber-200 bg-amber-50"
                                }`}
                              />
                            </td>
                            <td className="py-3">
                              <input
                                value={row.estimatedEffort || ""}
                                onChange={(event) => {
                                  const next = [...(formData.compiledEnhancement?.domainTable || [])];
                                  next[index] = { ...next[index], estimatedEffort: event.target.value };
                                  updateEnhancementField("domainTable", next);
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <QAChat
                allQuestions={allQuestions}
                currentQuestion={currentQuestion}
                currentIndex={questionIndex}
                onAnswer={handleAnswer}
                history={chatHistory}
                allDone={allDone}
              />
            </div>

            {(formData.missingFields || []).length ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
                Remaining missing fields: {formData.missingFields.join(", ")}
              </div>
            ) : null}

            <div className="flex justify-between">
              <button onClick={() => setStep(3)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                Back
              </button>
              <button
                disabled={reviewBlocked}
                onClick={() => setStep(5)}
                className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40"
              >
                Continue to Review →
              </button>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Step 5 of 5: Review & Publish</h2>
              <p className="text-sm text-slate-500 mt-1">
                This preview is built from the compiled dashboard structure, not the raw JD.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 flex-wrap mb-6">
                <h3 className="text-2xl font-bold text-slate-900">{formData.basicDetails.projectTitle}</h3>
                <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold">{previewModel.roleHeader.domain}</span>
                <span className="px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">{previewModel.roleHeader.personaArchetype}</span>
                <span className="px-2 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold">{previewModel.roleHeader.seniorityLevel}</span>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Top Skills</h4>
                  <PreviewSkillBars skills={normalizedSkills} />
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Role Architecture</h4>
                  <div className="space-y-3">
                    {(previewModel.domainTable || []).map((row, index) => (
                      <div key={`${row.domain}-${index}`} className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                        <div className="font-semibold text-slate-800">{row.domain}</div>
                        <div className="text-xs text-slate-500 mt-1">{row.successMetric}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Hard Filters</h4>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      Education: {previewModel.hardFilters?.educationRequired ? "Required" : "Not required"}
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      Remote: {previewModel.hardFilters?.remoteOnly ? "Remote only" : "Flexible"}
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      Tool recency: {previewModel.hardFilters?.toolRecencyRequired ? "< 2 years" : "Any"}
                    </div>
                    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
                      Coding intensity: {formData.compiledEnhancement?.codingIntensity || 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(4)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold">
                ← Edit
              </button>
              <button
                onClick={publishJob}
                disabled={publishing}
                className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-40 flex items-center gap-2"
              >
                {publishing ? <Loader2 size={16} className="animate-spin" /> : <Briefcase size={16} />}
                Publish Job
              </button>
            </div>
          </div>
        ) : null}

        {step > 5 ? null : null}

        {step === 5 && formData.publishedJob?.success ? null : null}

        {step === 5 && !publishing && formData.publishedJob?.success ? null : null}

        {step === 5 && !publishing && !error && formData.publishedJob?.success ? null : null}

        {step === 5 && !publishing && formData.publishedJob?.success ? null : null}

        {step === 5 && !publishing && formData.publishedJob?.success ? null : null}

        {step === 5 && !publishing && formData.publishedJob?.success ? null : null}

        {step === 5 && formData.publishedJob?.success ? null : null}

        {step === 5 && formData.publishedJob?.success ? null : null}

        {step === 5 && formData.publishedJob?.success ? null : null}

        {step === 5 && formData.publishedJob?.success ? null : null}

        {step === 5 && formData.publishedJob?.success ? null : null}

        {step === 5 && formData.publishedJob?.success ? (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="text-emerald-600" size={30} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Job published successfully</h3>
            <p className="text-slate-600 mt-2">The freelancer side will now render only the compiled dashboard for this role.</p>
            <div className="flex justify-center gap-3 mt-6">
              <button onClick={() => navigate("/jobs")} className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold">
                View AI Jobs
              </button>
              <button onClick={() => navigate("/client-projects")} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold">
                Back to Client Area
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

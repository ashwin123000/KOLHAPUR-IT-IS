import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, UploadCloud, FileText, Cpu, ArrowRight, User, Mail,
  Lock, Eye, EyeOff, MapPin, GraduationCap, CreditCard,
  Briefcase, Loader2, AlertCircle, RefreshCw, X, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

// ─── TOAST SYSTEM ─────────────────────────────────────────
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium max-w-xs
              ${t.type === 'success' ? 'bg-white border-emerald-200 text-slate-700' :
                t.type === 'error'   ? 'bg-white border-red-200 text-slate-700' :
                                       'bg-white border-slate-200 text-slate-700'}`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0
              ${t.type === 'success' ? 'bg-emerald-500' :
                t.type === 'error'   ? 'bg-red-500' : 'bg-blue-500'}`}
            />
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── PASSWORD STRENGTH ────────────────────────────────────
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8)                      score++;
  if (pw.length >= 12)                     score++;
  if (/[A-Z]/.test(pw))                    score++;
  if (/[0-9]/.test(pw))                    score++;
  if (/[^A-Za-z0-9]/.test(pw))            score++;
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Medium', color: 'bg-yellow-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

// ─── AI BADGE ─────────────────────────────────────────────
function AIBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider
      text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full ml-1">
      <Sparkles className="w-2.5 h-2.5" /> Auto-filled
    </span>
  );
}

// ─── FIELD WRAPPER ────────────────────────────────────────
function FieldWrapper({ label, required, children, isAI, isLowConfidence, tooltip }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
        {isAI && <AIBadge />}
        {isLowConfidence && !isAI && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider
            text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full ml-1"
            title={tooltip || 'Please verify this field'}
          >
            <AlertCircle className="w-2.5 h-2.5" /> Verify
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────
const RegistrationFlow = () => {
  const navigate = useNavigate();

  // 0 = resume-first pre-step, 1–4 = main steps
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [toasts, setToasts]           = useState([]);

  // Central form state
  const [formData, setFormData] = useState({
    full_name: '', email: '', city: '', state: '',
    college: '', aadhaar: '', password: '', confirmPassword: '', skills: [],
  });

  // AI prefill tracking
  const [aiFilledFields, setAiFilledFields]             = useState(new Set());
  const [lowConfidenceFields, setLowConfidenceFields]   = useState([]);
  const [parsedData, setParsedData]                     = useState(null);
  const [resumeFileUrl, setResumeFileUrl]               = useState('');
  const [uploadedFileName, setUploadedFileName]         = useState('');
  const [resumeUploading, setResumeUploading]           = useState(false);
  const [alreadyUploaded, setAlreadyUploaded]           = useState(false);

  // Aadhaar validation state
  const [aadhaarStatus, setAadhaarStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const aadhaarTimerRef = useRef(null);

  // Password UI
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  // Parsing simulation for step 3
  const [parsingStep, setParsingStep] = useState(-1);
  const parsingLogs = parsedData
    ? [
        'Scanning document structure...',
        `Detected ${parsedData.skills?.length || 0} skills in resume...`,
        parsedData.email    ? `Email found: ${parsedData.email}` : 'Email: not detected...',
        parsedData.college  ? `Institution: ${parsedData.college.slice(0,40)}...` : 'Searching education section...',
        parsedData.city     ? `Location: ${parsedData.city}, ${parsedData.state}` : 'Location: not found...',
        `Confidence score: ${parsedData.confidence || 0}% ${parsedData.confidence >= 70 ? '✓ HIGH' : '⚠ LOW'}`,
        'Profile prefill ready!',
      ]
    : [
        'Analyzing document structure...',
        'Isolating key information...',
        'Detecting skills...',
        'Extracting education section...',
        'Identifying location data...',
        'Computing confidence score...',
        'Prefill ready!',
      ];

  // ── TOAST HELPERS ─────────────────────────────────────
  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // ── HYDRATION via useEffect ────────────────────────────
  useEffect(() => {
    if (!parsedData) return;
    setFormData(prev => ({
      ...prev,
      full_name: parsedData.full_name || prev.full_name,
      email:     parsedData.email     || prev.email,
      college:   parsedData.college   || prev.college,
      city:      parsedData.city      || prev.city,
      state:     parsedData.state     || prev.state,
      skills:    parsedData.skills?.length ? parsedData.skills : prev.skills,
    }));

    // Track which fields were AI-filled
    const filled = new Set();
    if (parsedData.full_name) filled.add('full_name');
    if (parsedData.email)     filled.add('email');
    if (parsedData.college)   filled.add('college');
    if (parsedData.city)      filled.add('city');
    if (parsedData.state)     filled.add('state');
    if (parsedData.skills?.length) filled.add('skills');
    setAiFilledFields(filled);
    setLowConfidenceFields(parsedData.low_confidence_fields || []);

    if (parsedData.confidence >= 70) {
      addToast('✨ We prefilled your details using AI', 'success');
    } else if (parsedData.confidence > 0) {
      addToast('⚠️ Partial prefill — please verify highlighted fields', 'info');
    }
  }, [parsedData]);

  // ── PARSING SIMULATION (step 3) ───────────────────────
  useEffect(() => {
    if (currentStep !== 3) return;
    setParsingStep(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setParsingStep(i);
      if (i >= parsingLogs.length) {
        clearInterval(timer);
        setTimeout(() => setCurrentStep(4), 1200);
      }
    }, 900);
    return () => clearInterval(timer);
  }, [currentStep]);

  // ── UPDATE FORM ────────────────────────────────────────
  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // If user edits an AI-filled field, remove the AI badge
    if (aiFilledFields.has(field)) {
      setAiFilledFields(prev => {
        const next = new Set(prev);
        next.delete(field);
        return next;
      });
    }
  };

  // ── AADHAAR DEBOUNCED CHECK ───────────────────────────
  const handleAadhaarChange = (e) => {
    // Strip non-digits and limit to 12
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
    updateForm('aadhaar', raw);
    setAadhaarStatus(null);

    if (aadhaarTimerRef.current) clearTimeout(aadhaarTimerRef.current);
    if (raw.length === 12) {
      setAadhaarStatus('checking');
      aadhaarTimerRef.current = setTimeout(async () => {
        try {
          const res = await authAPI.checkAadhaar(raw);
          setAadhaarStatus(res.data.available ? 'available' : 'taken');
        } catch (err) {
          setAadhaarStatus(null);
          setError(err.response?.data?.detail || err.message || 'Aadhaar uniqueness check failed.');
        }
      }, 600);
    }
  };

  // Masked display: simple space formatting for readability during registration
  const aadhaarDisplay = () => {
    const d = formData.aadhaar;
    if (!d) return '';
    // Just space separate every 4 digits: 1234 5678 9012
    return d.replace(/(.{4})/g, '$1 ').trim();
  };

  // ── RESUME UPLOAD ─────────────────────────────────────
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      addToast('Only PDF files are accepted.', 'error');
      return;
    }

    // Double-upload guard
    if (alreadyUploaded) {
      const ok = window.confirm(
        'You have already uploaded a resume. Replace it? This will overwrite the prefilled data.'
      );
      if (!ok) return;
    }

    setResumeUploading(true);
    setUploadedFileName(file.name);

    try {
      const res = await authAPI.uploadResume(file);
      const { file_url, parsed } = res.data;

      setResumeFileUrl(file_url);
      setParsedData(parsed);          // triggers hydration useEffect
      setAlreadyUploaded(true);
      addToast('📄 Resume uploaded successfully', 'success');

      if (parsed?.parse_error) {
        addToast(`⚠️ ${parsed.parse_error}`, 'error', 6000);
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Upload failed.';
      addToast(`Failed to analyze resume: ${detail}`, 'error');
      setUploadedFileName('');
    } finally {
      setResumeUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  // ── RESUME UPLOAD ON STEP 2 ───────────────────────────
  // Called when user uploads on Step 2 and clicks "Analyze with AI"
  const handleStep2Continue = () => {
    if (alreadyUploaded) {
      setCurrentStep(3);
    }
  };

  // ── SUBMIT ────────────────────────────────────────────
  const handleFinish = async () => {
    setLoading(true);
    setError('');
    const payload = {
      full_name:       formData.full_name.trim(),
      email:           formData.email.trim(),
      aadhaar:         formData.aadhaar,
      city:            formData.city.trim(),
      state:           formData.state.trim(),
      college:         formData.college.trim(),
      password:        formData.password,
      skills:          formData.skills,
      resume_file_url: resumeFileUrl,
    };
    console.log("🚀 [REGISTER_V2] Submitting registration payload:", payload);

    try {
      await authAPI.registerV2(payload);
      addToast('🎉 Account created! Redirecting…', 'success');
      setTimeout(() => navigate('/login-freelancer'), 1500);
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Registration failed.';
      if (err.response?.status === 409) {
        setAadhaarStatus('taken');
      }
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  // ── VALIDATION ────────────────────────────────────────
  const strength = getPasswordStrength(formData.password);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;
  const passwordMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  const step4Valid =
    formData.full_name.trim() &&
    formData.email.trim() &&
    formData.city.trim() &&
    formData.state.trim() &&
    strength.score >= 3 &&
    passwordsMatch &&
    (!formData.aadhaar || (formData.aadhaar.length === 12 && aadhaarStatus !== 'taken'));

  // ── INPUT STYLE HELPERS ───────────────────────────────
  const inputClass = (field, extraValid) =>
    `w-full bg-white border rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400
     focus:outline-none focus:ring-2 transition-all font-medium text-sm
     ${aiFilledFields.has(field)
       ? 'border-emerald-400 ring-1 ring-emerald-200 bg-emerald-50/30 focus:ring-emerald-300'
       : lowConfidenceFields.includes(field)
         ? 'border-amber-300 bg-amber-50/30 focus:ring-amber-200 focus:border-amber-400'
         : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'
     }
     ${extraValid || ''}`;

  // ── STEP VARIANTS ─────────────────────────────────────
  const sv = {
    hidden:  { opacity: 0, scale: 0.98, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit:    { opacity: 0, scale: 1.02, y: -10, transition: { duration: 0.2 } },
  };

  const steps = ['Account Details', 'Resume Upload', 'AI Analysis', 'Review Profile'];

  // ── RENDER ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center py-12 px-4 relative">

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Brand Header */}
      <div className="w-full max-w-4xl flex items-center gap-2 mb-10 px-4">
        <div className="text-xl font-bold flex items-center gap-1">
          <span className="text-slate-800 tracking-tight">fiverr<span className="text-emerald-500">Intern</span></span>
          <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Pro</span>
        </div>
        <span className="text-slate-400 text-sm ml-2">/ Registration</span>
      </div>

      <div className="w-full max-w-3xl">

        {/* ── STEP 0: Resume-First Pre-Screen ── */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="step0" variants={sv} initial="hidden" animate="visible" exit="exit">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">

                <div className="max-w-md mx-auto text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-100">
                    <Cpu className="w-7 h-7 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Start with your resume</h2>
                  <p className="text-slate-500 text-sm mb-8">
                    Upload your CV and our AI will auto-fill your profile — name, email, skills, college and location.
                  </p>

                  {/* Drop Zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all group
                      ${alreadyUploaded
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'}`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={e => handleFileSelect(e.target.files[0])}
                    />
                    <div className="flex flex-col items-center gap-3">
                      {resumeUploading ? (
                        <>
                          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                          <p className="text-sm font-semibold text-emerald-700">Analyzing your resume…</p>
                        </>
                      ) : alreadyUploaded ? (
                        <>
                          <FileText className="w-10 h-10 text-emerald-600" />
                          <p className="text-base font-bold text-emerald-800">{uploadedFileName}</p>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
                            Ready — click to replace
                          </span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                          <div>
                            <p className="text-base font-bold text-slate-700">Upload your resume to auto-fill</p>
                            <p className="text-sm text-slate-400 mt-1">Drag & drop or click · PDF only · Max 10MB</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Confidence badge */}
                  {parsedData && (
                    <div className={`mt-4 text-xs font-semibold rounded-lg px-3 py-2 inline-flex items-center gap-2
                      ${parsedData.confidence >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      <span>Confidence: {parsedData.confidence}%</span>
                      {parsedData.confidence < 70 && <span>— Some fields need manual input</span>}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      disabled={!alreadyUploaded || resumeUploading}
                      onClick={() => setCurrentStep(1)}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed
                        text-white font-semibold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      Continue with AI prefill <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors
                        border border-slate-200 rounded-xl py-3 px-6 hover:border-slate-300"
                    >
                      Skip — fill manually →
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── STEPS 1–4 ── */}
        {currentStep >= 1 && (
          <>
            {/* Progress Bar */}
            <div className="flex items-center justify-center mb-12 w-full max-w-2xl mx-auto">
              {steps.map((stepStr, index) => {
                const step      = index + 1;
                const isActive  = currentStep === step;
                const isDone    = currentStep > step;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center relative">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: isDone ? '#10b981' : '#ffffff',
                          borderColor: (isActive || isDone) ? '#10b981' : '#cbd5e1',
                          color: isDone ? '#ffffff' : isActive ? '#10b981' : '#94a3b8',
                        }}
                        className="w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 shadow-sm"
                      >
                        {isDone ? <Check className="w-5 h-5 flex-shrink-0" /> : <span className="text-sm font-semibold">{step}</span>}
                      </motion.div>
                      <div className={`absolute -bottom-6 text-xs font-semibold whitespace-nowrap
                        ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {stepStr}
                      </div>
                    </div>
                    {index < 3 && (
                      <div className="flex-1 h-[2px] mx-2 bg-slate-200 relative overflow-hidden">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: isDone ? '100%' : '0%' }}
                          className="absolute top-0 left-0 h-full bg-emerald-500"
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Content Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden min-h-[400px]">
              <AnimatePresence mode="wait">

                {/* ── STEP 1: Account + Profile Details ── */}
                {currentStep === 1 && (
                  <motion.div key="step1" variants={sv} initial="hidden" animate="visible" exit="exit" className="max-w-md mx-auto">
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">Basic Details</h2>
                      <p className="text-slate-500 text-sm">
                        {aiFilledFields.size > 0 ? '✨ Fields marked Auto-filled were extracted from your resume.' : 'Tell us the fundamentals of your profile.'}
                      </p>
                    </div>

                    <div className="space-y-5">

                      <FieldWrapper label="Full Name" required isAI={aiFilledFields.has('full_name')} isLowConfidence={lowConfidenceFields.includes('full_name')}>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={formData.full_name}
                            onChange={e => updateForm('full_name', e.target.value)}
                            placeholder="e.g. John Doe"
                            className={inputClass('full_name', 'pl-10')}
                          />
                        </div>
                      </FieldWrapper>

                      <FieldWrapper label="Email Address" required isAI={aiFilledFields.has('email')} isLowConfidence={lowConfidenceFields.includes('email')}>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={e => updateForm('email', e.target.value)}
                            placeholder="john@example.com"
                            className={inputClass('email', 'pl-10')}
                          />
                        </div>
                      </FieldWrapper>

                      <div className="grid grid-cols-2 gap-4">
                        <FieldWrapper label="City" isAI={aiFilledFields.has('city')} isLowConfidence={lowConfidenceFields.includes('city')}>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                              type="text"
                              value={formData.city}
                              onChange={e => updateForm('city', e.target.value)}
                              placeholder="Mumbai"
                              className={inputClass('city', 'pl-10')}
                            />
                          </div>
                        </FieldWrapper>
                        <FieldWrapper label="State" isAI={aiFilledFields.has('state')} isLowConfidence={lowConfidenceFields.includes('state')}>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={e => updateForm('state', e.target.value)}
                            placeholder="Maharashtra"
                            className={inputClass('state')}
                          />
                        </FieldWrapper>
                      </div>

                      <FieldWrapper label="College / Institution" isAI={aiFilledFields.has('college')} isLowConfidence={lowConfidenceFields.includes('college')}>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={formData.college}
                            onChange={e => updateForm('college', e.target.value)}
                            placeholder="e.g. IIT Bombay"
                            className={inputClass('college', 'pl-10')}
                          />
                        </div>
                      </FieldWrapper>

                      {/* Aadhaar */}
                      <FieldWrapper label="Aadhaar Number">
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={aadhaarDisplay()}
                            onChange={handleAadhaarChange}
                            maxLength={14}
                            placeholder="**** **** 1234"
                            className={`w-full bg-white border rounded-xl py-3 pl-10 pr-10 text-slate-800
                              placeholder-slate-400 focus:outline-none focus:ring-2 transition-all font-medium text-sm font-mono
                              ${aadhaarStatus === 'taken'
                                ? 'border-red-400 ring-1 ring-red-200 focus:ring-red-200 focus:border-red-400'
                                : aadhaarStatus === 'available'
                                  ? 'border-emerald-400 ring-1 ring-emerald-200 focus:ring-emerald-200'
                                  : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'}`}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {aadhaarStatus === 'checking'   && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
                            {aadhaarStatus === 'available'  && <Check className="w-4 h-4 text-emerald-500" />}
                            {aadhaarStatus === 'taken'      && <X className="w-4 h-4 text-red-500" />}
                          </div>
                        </div>
                        {aadhaarStatus === 'taken' && (
                          <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Already registered with another account
                          </p>
                        )}
                        {formData.aadhaar && formData.aadhaar.length < 12 && (
                          <p className="mt-1 text-xs text-slate-400">Aadhaar must be 12 digits ({12 - formData.aadhaar.length} remaining)</p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">Stored securely — only a hash is saved, never the number itself.</p>
                      </FieldWrapper>

                    </div>

                    <div className="mt-8 flex justify-between items-center">
                      <button onClick={() => setCurrentStep(0)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                        ← Back
                      </button>
                      <button
                        onClick={() => setCurrentStep(2)}
                        disabled={!formData.full_name || !formData.email || aadhaarStatus === 'taken'}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed
                          text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 group"
                      >
                        Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2: Resume Upload ── */}
                {currentStep === 2 && (
                  <motion.div key="step2" variants={sv} initial="hidden" animate="visible" exit="exit" className="max-w-xl mx-auto">
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">Upload Resume</h2>
                      <p className="text-slate-500 text-sm">
                        {alreadyUploaded ? 'Resume already uploaded — you can replace it or continue.' : 'Upload your CV and let AI map your skills automatically.'}
                      </p>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.005 }}
                      onDrop={handleDrop}
                      onDragOver={e => e.preventDefault()}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors group flex flex-col items-center justify-center min-h-[220px]
                        ${alreadyUploaded ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'}`}
                    >
                      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFileSelect(e.target.files[0])} />
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                        {resumeUploading
                          ? <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                          : alreadyUploaded
                            ? <FileText className="w-6 h-6 text-emerald-600" />
                            : <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />}
                      </div>
                      {alreadyUploaded ? (
                        <div className="text-center">
                          <p className="text-base font-bold text-emerald-800">{uploadedFileName}</p>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full inline-block mt-2">
                            Click to replace
                          </span>
                        </div>
                      ) : resumeUploading ? (
                        <p className="text-sm font-semibold text-emerald-700">Analyzing your resume…</p>
                      ) : (
                        <div className="text-center">
                          <h3 className="text-base font-bold text-slate-700 mb-1">Click or drag & drop</h3>
                          <p className="text-sm text-slate-500">PDF only · Max 10MB</p>
                        </div>
                      )}
                    </motion.div>

                    <div className="mt-8 flex justify-between items-center">
                      <button onClick={() => setCurrentStep(1)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">Back</button>
                      <button
                        disabled={!alreadyUploaded || resumeUploading}
                        onClick={handleStep2Continue}
                        className="bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2"
                      >
                        Analyze with AI <Cpu className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3: AI Analysis Terminal ── */}
                {currentStep === 3 && (
                  <motion.div key="step3" variants={sv} initial="hidden" animate="visible" exit="exit" className="max-w-xl mx-auto flex flex-col items-center justify-center py-8">
                    <div className="mb-8 relative flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        className="absolute w-20 h-20 border-t-2 border-r-2 border-emerald-500 rounded-full"
                      />
                      <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center z-10 shadow-sm border border-emerald-100">
                        <Cpu className="w-6 h-6 text-emerald-600 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Profile</h3>
                    <p className="text-sm text-slate-500 mb-8 text-center max-w-sm">
                      Extracting skills, education, and location from your resume.
                    </p>

                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono text-xs md:text-sm shadow-inner">
                      <div className="flex flex-col gap-2 min-h-[160px]">
                        <AnimatePresence>
                          {parsingLogs.map((log, index) =>
                            index <= parsingStep ? (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`${index === parsingStep ? 'text-slate-800 font-medium' : 'text-slate-400'} flex items-start gap-2`}
                              >
                                <span className="text-emerald-500 font-bold shrink-0">{'>'}</span>
                                <span>{log}</span>
                                {index === parsingStep && index < parsingLogs.length && (
                                  <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                    className="w-2 h-4 bg-emerald-500 inline-block ml-1 align-middle"
                                  />
                                )}
                              </motion.div>
                            ) : null
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 4: Password + Review + Submit ── */}
                {currentStep === 4 && (
                  <motion.div key="step4" variants={sv} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
                    <div className="mb-6 flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-1">Review & Set Password</h2>
                        <p className="text-sm text-slate-500">Confirm your details and secure your account.</p>
                      </div>
                      {parsedData?.confidence > 0 && (
                        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg text-right">
                          <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">AI Confidence</div>
                          <div className="text-2xl font-black text-emerald-700 flex items-center justify-end gap-0.5 leading-none">
                            {parsedData.confidence}<span className="text-base">%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {error && (
                      <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                      {/* Left: Review Fields */}
                      <div className="md:col-span-3 space-y-4">

                        {/* Quick review readout */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Profile Summary</h4>
                          {[
                            { icon: User,           label: 'Name',    val: formData.full_name },
                            { icon: Mail,           label: 'Email',   val: formData.email },
                            { icon: MapPin,         label: 'Location',val: [formData.city, formData.state].filter(Boolean).join(', ') },
                            { icon: GraduationCap,  label: 'College', val: formData.college },
                          ].map(({ icon: Icon, label, val }) => (
                            <div key={label} className="flex items-center gap-2 text-sm">
                              <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-slate-500 w-16 flex-shrink-0">{label}</span>
                              <span className="font-medium text-slate-700 truncate">{val || <span className="text-slate-400 italic">—</span>}</span>
                            </div>
                          ))}
                        </div>

                        {/* Skills */}
                        {formData.skills.length > 0 && (
                          <div className="border border-slate-200 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400" /> Extracted Skills
                                {aiFilledFields.has('skills') && <AIBadge />}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {formData.skills.map((s, i) => (
                                <span key={i} className="bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-md text-xs border border-slate-200">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Password */}
                        <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-slate-400" /> Set Password
                          </h4>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={e => updateForm('password', e.target.value)}
                                placeholder="Min 8 chars with upper, number & symbol"
                                className={`w-full bg-white border rounded-xl py-3 px-4 pr-10 text-slate-800
                                  placeholder-slate-400 focus:outline-none focus:ring-2 transition-all font-medium text-sm
                                  ${formData.password
                                    ? strength.score >= 3
                                      ? 'border-emerald-400 focus:ring-emerald-200'
                                      : 'border-amber-400 focus:ring-amber-200'
                                    : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {/* Strength Bar */}
                            {formData.password && (
                              <div className="mt-2">
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${strength.color}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(strength.score / 5) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                  />
                                </div>
                                <p className={`text-xs mt-1 font-semibold
                                  ${strength.color === 'bg-red-500' ? 'text-red-600' :
                                    strength.color === 'bg-yellow-500' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {strength.label}
                                </p>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <input
                                type={showConfirm ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={e => updateForm('confirmPassword', e.target.value)}
                                placeholder="Re-enter password"
                                className={`w-full bg-white border rounded-xl py-3 px-4 pr-10 text-slate-800
                                  placeholder-slate-400 focus:outline-none focus:ring-2 transition-all font-medium text-sm
                                  ${passwordMismatch
                                    ? 'border-red-400 focus:ring-red-200'
                                    : passwordsMatch
                                      ? 'border-emerald-400 focus:ring-emerald-200'
                                      : 'border-slate-300 focus:ring-emerald-500/20 focus:border-emerald-500'}`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirm(p => !p)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {passwordMismatch && (
                              <p className="mt-1 text-xs font-semibold text-red-600 flex items-center gap-1">
                                <X className="w-3 h-3" /> Passwords do not match
                              </p>
                            )}
                            {passwordsMatch && (
                              <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Passwords match
                              </p>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Right: AI Summary Panel */}
                      <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                          <Cpu className="w-3 h-3" /> System Summary
                        </h3>
                        <ul className="space-y-3 flex-1">
                          <li className="flex items-start gap-2.5">
                            <div className="mt-0.5 bg-emerald-100 p-0.5 rounded-full">
                              <Check className="w-3 h-3 text-emerald-600" />
                            </div>
                            <span className="text-sm text-slate-600 font-medium leading-snug">
                              Found <strong>{formData.skills.length}</strong> skills in your resume
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <div className={`mt-0.5 p-0.5 rounded-full ${aadhaarStatus === 'available' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                              <Check className={`w-3 h-3 ${aadhaarStatus === 'available' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-sm text-slate-600 font-medium leading-snug">
                              Aadhaar — {aadhaarStatus === 'available' ? 'verified unique' : aadhaarStatus === 'taken' ? '⚠ already registered' : 'not yet checked'}
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <div className={`mt-0.5 p-0.5 rounded-full ${strength.score >= 3 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                              <Check className={`w-3 h-3 ${strength.score >= 3 ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-sm text-slate-600 font-medium leading-snug">
                              Password strength — <strong>{strength.label || 'not set'}</strong>
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <div className={`mt-0.5 p-0.5 rounded-full ${resumeFileUrl ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                              <Check className={`w-3 h-3 ${resumeFileUrl ? 'text-emerald-600' : 'text-slate-400'}`} />
                            </div>
                            <span className="text-sm text-slate-600 font-medium leading-snug">
                              Resume — {resumeFileUrl ? 'uploaded & saved' : 'not uploaded'}
                            </span>
                          </li>
                        </ul>

                        {/* Aadhaar security note */}
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                            🔒 Your Aadhaar number is hashed with SHA-256 before storage. The original number is never saved.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                      <button onClick={() => setCurrentStep(2)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                        ← Back to Upload
                      </button>
                      <button
                        disabled={!step4Valid || loading}
                        onClick={handleFinish}
                        className="bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-700
                          text-white font-semibold py-2.5 px-8 rounded-lg transition-colors shadow-sm shadow-emerald-600/20
                          flex items-center gap-2"
                      >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Profile'}
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RegistrationFlow;

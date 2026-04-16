import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, UploadCloud, FileText, Cpu, ArrowRight, User, Mail, Lock, ShieldCheck, Link as LinkIcon, Edit3, Briefcase, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const RegistrationFlow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    resumeUploaded: false,
    skills: ['Python', 'C++', 'SQL', 'Git'],
    roleMatch: 'Software Engineer',
    hours: 40,
    openToInterviews: 'yes', // yes or depends
    github: ''
  });

  // Step 3 Variables
  const [parsingStep, setParsingStep] = useState(0);

  const parsingLogs = [
    "Analyzing document structure...",
    "Isolating key information...",
    "Detecting skills: Python, C++, SQL... [12 identified]",
    "Extracting work history...",
    "Estimating years of experience: 3.5 years... [OK]",
    "Predicting role match: Software Engineer... [88% match]",
    "Smart questions prepared... [READY]"
  ];

  const handleNext = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        username: formData.name,
        email: formData.email,
        password: formData.password,
        skills: formData.skills,
      };

      await authAPI.registerFreelancer(payload);
      navigate('/login-freelancer');
    } catch (err) {
      const serverMessage = err.response?.data?.error || err.response?.data?.message;
      setError(serverMessage || err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate parsing timeline
  useEffect(() => {
    if (currentStep === 3) {
      setParsingStep(0);
      let step = 0;
      const interval = setInterval(() => {
        step += 1;
        setParsingStep(step);
        if (step >= parsingLogs.length) {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentStep(4);
          }, 1500); // Wait bit before navigating
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentStep]);

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const stepVariants = {
    hidden: { opacity: 0, scale: 0.98, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, scale: 1.02, y: -10, transition: { duration: 0.2 } }
  };

  const steps = ['Account Details', 'Resume Upload', 'AI Analysis', 'Review Profile'];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col items-center py-12 px-4 relative">
      {/* Brand Header */}
      <div className="w-full max-w-4xl flex items-center gap-2 mb-10 px-4">
        <div className="text-xl font-bold flex items-center gap-1">
          <span className="text-slate-800 tracking-tight">fiverr<span className="text-emerald-500">Intern</span></span>
          <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ml-1">Pro</span>
        </div>
        <span className="text-slate-400 text-sm ml-2">/ Registration</span>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-3xl">
        
        {/* Stepper Header */}
        <div className="flex items-center justify-center mb-12 w-full max-w-2xl mx-auto">
          {steps.map((stepStr, index) => {
            const step = index + 1;
            const isActive = currentStep === step;
            const isCompleted = currentStep > step;

            return (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center relative">
                  <motion.div 
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted ? '#10b981' : isActive ? '#ffffff' : '#ffffff',
                      borderColor: (isActive || isCompleted) ? '#10b981' : '#cbd5e1',
                      color: isCompleted ? '#ffffff' : isActive ? '#10b981' : '#94a3b8'
                    }}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors duration-300 z-10 shadow-sm`}
                  >
                    {isCompleted ? <Check className="w-5 h-5 flex-shrink-0" /> : <span className="text-sm font-semibold">{step}</span>}
                  </motion.div>
                  <div className={`absolute -bottom-6 text-xs font-semibold whitespace-nowrap ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {stepStr}
                  </div>
                </div>
                {index < 3 && (
                  <div className="flex-1 h-[2px] mx-2 bg-slate-200 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: '0%' }}
                      animate={{ width: isCompleted ? '100%' : '0%' }}
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

            {currentStep === 1 && (
              <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="max-w-md mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Basic Details</h2>
                  <p className="text-slate-500 text-sm">Tell us the fundamentals of your profile.</p>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="text" 
                        value={formData.name} onChange={(e) => updateForm('name', e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">Email Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="email" 
                        value={formData.email} onChange={(e) => updateForm('email', e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1">Password <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                      <input 
                        type="password"
                        value={formData.password} onChange={(e) => updateForm('password', e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-10 pr-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 group">
                    Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="max-w-xl mx-auto">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Upload Resume</h2>
                  <p className="text-slate-500 text-sm">Upload your CV and let our AI map your skills automatically.</p>
                </div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`border-2 border-dashed rounded-xl p-10 transition-colors cursor-pointer group flex flex-col items-center justify-center min-h-[240px]
                    ${formData.resumeUploaded ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'}
                  `}
                  onClick={() => updateForm('resumeUploaded', true)}
                >
                  <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    {formData.resumeUploaded ? (
                      <FileText className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-emerald-500" />
                    )}
                  </div>
                  {formData.resumeUploaded ? (
                    <div className="text-center">
                      <p className="text-lg font-bold text-emerald-800">resume_john_doe.pdf</p>
                      <p className="text-emerald-600 text-sm mt-1 px-3 py-1 bg-emerald-100 uppercase tracking-widest text-[10px] rounded-full inline-block font-bold">Ready for parsing</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <h3 className="text-base font-bold text-slate-700 mb-1">Click to upload or drag & drop</h3>
                      <p className="text-sm text-slate-500 mb-4">Supports PDF, DOCX (Max 10MB)</p>
                    </div>
                  )}
                </motion.div>

                <div className="mt-8 flex justify-between items-center">
                  <button onClick={() => setCurrentStep(1)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    Back
                  </button>
                  <button 
                    disabled={!formData.resumeUploaded}
                    onClick={handleNext} 
                    className="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 group"
                  >
                    Analyze with AI <Cpu className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="max-w-xl mx-auto flex flex-col items-center justify-center py-8">
                
                <div className="mb-8 relative flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="absolute w-20 h-20 border-t-2 border-r-2 border-emerald-500 rounded-full"
                  />
                  <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center z-10 shadow-sm border border-emerald-100">
                     <Cpu className="w-6 h-6 text-emerald-600 animate-pulse" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Profile</h3>
                <p className="text-sm text-slate-500 mb-8 text-center max-w-sm">
                  Our system is currently parsing your resume to extract key skills, experience, and relevant roles.
                </p>

                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono text-xs md:text-sm shadow-inner relative overflow-hidden">
                  <div className="flex flex-col gap-2 min-h-[160px]">
                    <AnimatePresence>
                      {parsingLogs.map((log, index) => (
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
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl mx-auto">
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-1">Review Profile</h2>
                    <p className="text-sm text-slate-500">Confirm your auto-extracted details.</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg text-right">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-0.5">Profile Match</div>
                    <div className="text-2xl font-black text-emerald-700 flex items-center justify-end gap-0.5 leading-none">
                      92<span className="text-base">%</span>
                    </div>
                  </div>
                </div>
                
                {error && <div className="mb-6 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}

                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  
                  {/* Left Column: Form Details */}
                  <div className="md:col-span-3 space-y-4">
                    {/* Skills */}
                    <div className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                      <div className="flex justify-between items-center mb-3">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                           Extracted Skills
                        </label>
                        <button className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors">
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map((skill, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-md text-xs border border-slate-200">
                            {skill}
                          </span>
                        ))}
                        <button className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold px-3 py-1 rounded-md text-xs transition-colors flex items-center gap-1">
                          + Add Skill
                        </button>
                      </div>
                    </div>

                    {/* Role */}
                    <div className="border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-slate-300 transition-colors">
                       <div className="flex-1">
                          <label className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-1">
                             Suggested Role
                          </label>
                          <div className="text-slate-900 font-semibold text-lg">{formData.roleMatch}</div>
                       </div>
                       <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-bold text-center">
                          Confidence: High
                       </div>
                    </div>

                    {/* Availability / GitHub */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2">
                          <Clock className="w-3 h-3 text-slate-400" /> Weekly Hours
                        </label>
                        <input type="number" value={formData.hours} onChange={e => updateForm('hours', e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2">
                          <LinkIcon className="w-3 h-3 text-slate-400" /> GitHub / Portfolio
                        </label>
                        <input type="text" placeholder="https://..." value={formData.github} onChange={e => updateForm('github', e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: AI Summary */}
                  <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col h-full">
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                      <Cpu className="w-3 h-3" /> System Summary
                    </h3>
                    
                    <ul className="space-y-4 flex-1">
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 bg-emerald-100 p-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        </div>
                        <span className="text-sm text-slate-600 font-medium leading-snug">Found <strong>12 matching skills</strong> relevant to data and software.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 bg-emerald-100 p-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        </div>
                        <span className="text-sm text-slate-600 font-medium leading-snug">Calculated <strong>~3.5 years</strong> of professional experience.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <div className="mt-0.5 bg-emerald-100 p-0.5 rounded-full">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                        </div>
                        <span className="text-sm text-slate-600 font-medium leading-snug">Matches closely with backend and fullstack positions.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                   <button onClick={() => setCurrentStep(2)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    Back to Upload
                   </button>
                   <button disabled={loading} onClick={handleFinish} className="bg-emerald-600 disabled:opacity-70 disabled:cursor-not-allowed hover:bg-emerald-700 text-white font-semibold py-2.5 px-8 rounded-lg transition-colors shadow-sm shadow-emerald-600/20 flex items-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Profile'}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default RegistrationFlow;

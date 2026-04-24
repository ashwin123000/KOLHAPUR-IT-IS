import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { TOOLS, AI_RESPONSES, WELCOME_CHIP_PROMPTS, ICONS } from './data';

const AIJobAnalyzer = () => {
  const [currentTool, setCurrentTool] = useState('job-analyzer');
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'chat'
  const [chatHistories, setChatHistories] = useState({});
  const [history, setHistory] = useState([]);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [scores, setScores] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [theme, setTheme] = useState('light');
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState('analyze');

  const chatBodyRef = useRef(null);
  const chatInputRef = useRef(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem('ajh') || '[]');
    const savedTotal = parseInt(localStorage.getItem('ajtotal') || '0', 10);
    const savedScores = JSON.parse(localStorage.getItem('ajscores') || '[]');
    const savedTheme = localStorage.getItem('ajtheme') || 'light';

    setHistory(savedHistory);
    setTotalAnalyses(savedTotal);
    setScores(savedScores);
    setTheme(savedTheme);
  }, []);

  // Set chat history for default tool if not exist
  useEffect(() => {
    if (!chatHistories[currentTool]) {
      setChatHistories((prev) => ({ ...prev, [currentTool]: [] }));
    }
  }, [currentTool, chatHistories]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ajtheme', newTheme);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleToolSwitch = (toolId) => {
    setCurrentTool(toolId);
    setChatInput('');
  };

  const handleChipClick = (toolId, promptText) => {
    handleToolSwitch(toolId);
    setCurrentView('chat');
    setTimeout(() => {
      setChatInput(promptText);
      if (chatInputRef.current) {
        chatInputRef.current.style.height = 'auto';
        chatInputRef.current.style.height = Math.min(chatInputRef.current.scrollHeight, 140) + "px";
        chatInputRef.current.focus();
      }
    }, 100);
  };

  const handleInsertSample = () => {
    const tool = TOOLS[currentTool];
    setChatInput(tool.sample || '');
    if (chatInputRef.current) {
      chatInputRef.current.style.height = 'auto';
      setTimeout(() => {
        chatInputRef.current.style.height = Math.min(chatInputRef.current.scrollHeight, 140) + "px";
        chatInputRef.current.focus();
      }, 0);
    }
  };

  const scrollToBottom = () => {
    if (chatBodyRef.current) {
      setTimeout(() => {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
      }, 50);
    }
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const sendMessage = async (textOveride) => {
    const text = typeof textOveride === 'string' ? textOveride : chatInput.trim();
    if (!text || isTyping) return;

    // Add user msg
    const userMsg = { role: 'user', text };
    setChatHistories((prev) => ({
      ...prev,
      [currentTool]: [...(prev[currentTool] || []), userMsg],
    }));
    
    if (typeof textOveride !== 'string') {
        setChatInput('');
    }
    
    if (chatInputRef.current) {
        chatInputRef.current.style.height = 'auto';
    }
    setIsTyping(true);
    scrollToBottom();

    // History log
    const entry = {
      id: Date.now(),
      tool: currentTool,
      icon: ICONS[currentTool] || '🤖',
      text: text.slice(0, 50) + (text.length > 50 ? '…' : ''),
      timestamp: Date.now(),
    };
    const newHistory = [entry, ...history].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem('ajh', JSON.stringify(newHistory));

    const newTotal = totalAnalyses + 1;
    setTotalAnalyses(newTotal);
    localStorage.setItem('ajtotal', newTotal.toString());

    // Artificial delay for typing
    await delay(1200 + Math.random() * 800);

    // AI Response
    const aiFn = AI_RESPONSES[currentTool] || AI_RESPONSES['job-analyzer'];
    const responseData = aiFn(text);

    const aiMsg = { role: 'ai', data: responseData };
    setChatHistories((prev) => ({
      ...prev,
      [currentTool]: [...(prev[currentTool] || []), aiMsg],
    }));

    // Update Scores
    const newScores = [...scores, responseData.score].slice(-20);
    setScores(newScores);
    localStorage.setItem('ajscores', JSON.stringify(newScores));

    setIsTyping(false);
    scrollToBottom();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const triggerQuickAction = (action) => {
    if (isTyping) return;
    const prompts = {
      rewrite: `Please rewrite and improve the above based on best practices for ${TOOLS[currentTool].name}.`,
      improve: `Give me 5 specific, actionable improvements I can make right now to maximize my score.`,
      analyze: `Analyze again with a focus on competitive positioning and what top candidates do differently.`,
      proposal: `Generate a winning proposal template based on this analysis that I can customize and use immediately.`,
    };
    const text = prompts[action] || `Take action: ${action}`;
    sendMessage(text);
  };

  const copyResponse = (data) => {
    const text = `Analysis:\n${data.analysis}\n\nScore: ${data.score}/100`;
    navigator.clipboard.writeText(text)
      .then(() => showToast('Response copied!'))
      .catch(() => showToast('Copy failed'));
  };

  const downloadResponse = (data) => {
    const text = `Analysis:\n${data.analysis}\n\nScore: ${data.score}/100`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Analysis exported!');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('ajh');
    showToast('History cleared');
  };

  const loadHistoryItem = (item) => {
    handleToolSwitch(item.tool);
    setCurrentView('chat');
  };

  const deleteHistoryItem = (e, id) => {
    e.stopPropagation();
    const newHistory = history.filter((h) => h.id !== id);
    setHistory(newHistory);
    localStorage.setItem('ajh', JSON.stringify(newHistory));
  };

  const currentToolData = TOOLS[currentTool];
  const activeToolHistory = chatHistories[currentTool] || [];
  const latestAiResponse = [...activeToolHistory].reverse().find(m => m.role === 'ai')?.data;
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : '—';

  return (
    <div className="ai-analyzer-wrapper" data-theme={theme}>
      <div className="ai-analyzer-app">
        {/* SIDEBAR */}
        <aside className="ai-analyzer-sidebar">
          <div className="ai-analyzer-sidebar-header">
            <div className="ai-analyzer-logo">
              <div className="ai-analyzer-logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="ai-analyzer-logo-text">
                <span className="ai-analyzer-logo-name">Mentors</span>
                <span className="ai-analyzer-logo-sub">Career Intelligence</span>
              </div>
            </div>
            <button className="ai-analyzer-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>

          <div className="ai-analyzer-sidebar-section">
            <span className="ai-analyzer-sidebar-label">EXPERT TEAM</span>
            <nav className="ai-analyzer-tool-nav">
              {Object.values(TOOLS).map((tool) => (
                <button
                  key={tool.id}
                  className={`ai-analyzer-tool-nav-item ${currentTool === tool.id ? 'active' : ''}`}
                  onClick={() => handleToolSwitch(tool.id)}
                >
                  <div className="ai-analyzer-tool-nav-icon" style={{ background: tool.gradient }}>
                    {tool.id === 'job-analyzer' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg>}
                    {tool.id === 'resume-improver' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>}
                    {tool.id === 'proposal-scorer' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
                    {tool.id === 'client-risk' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                    {tool.id === 'skill-gap' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
                  </div>
                  <div className="ai-analyzer-tool-nav-info">
                    <span className="ai-analyzer-tool-nav-name">{tool.name}</span>
                    <span className="ai-analyzer-tool-nav-desc">{
                      tool.id === 'job-analyzer' ? 'Decode any job post' :
                      tool.id === 'resume-improver' ? 'ATS-ready optimization' :
                      tool.id === 'proposal-scorer' ? 'Win more contracts' :
                      tool.id === 'client-risk' ? 'Spot red flags early' : 'Level up your skills'
                    }</span>
                  </div>
                  <div className={`ai-analyzer-tool-badge ${tool.id === 'client-risk' ? 'new' : ''}`}>
                    {tool.id === 'client-risk' ? 'NEW' : 'EXPERT'}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className="ai-analyzer-sidebar-section">
            <div className="ai-analyzer-sidebar-label-row">
              <span className="ai-analyzer-sidebar-label">RECENT HISTORY</span>
              <button className="ai-analyzer-clear-btn" onClick={clearHistory}>Clear</button>
            </div>
            <div className="ai-analyzer-history-list">
              {history.length === 0 ? (
                <div className="ai-analyzer-history-empty">No recent queries yet</div>
              ) : (
                history.map((item) => (
                  <button key={item.id} className="ai-analyzer-history-item" onClick={() => loadHistoryItem(item)}>
                    <span className="ai-analyzer-history-item-icon">{item.icon}</span>
                    <span className="ai-analyzer-history-item-text">{item.text}</span>
                    <span className="ai-analyzer-history-item-del" onClick={(e) => deleteHistoryItem(e, item.id)}>✕</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="ai-analyzer-sidebar-footer">
            <div className="ai-analyzer-sidebar-stats">
              <div className="ai-analyzer-stat-pill">
                <span className="ai-analyzer-stat-num">{totalAnalyses}</span>
                <span className="ai-analyzer-stat-lbl">Analyses</span>
              </div>
              <div className="ai-analyzer-stat-pill">
                <span className="ai-analyzer-stat-num">{avgScore}</span>
                <span className="ai-analyzer-stat-lbl">Avg Score</span>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="ai-analyzer-main-content">
          {/* HOME VIEW */}
          <section className={`ai-analyzer-home-view ${currentView === 'home' ? 'ai-analyzer-view-active' : ''}`}>
            <div className="ai-analyzer-home-hero">
              <div className="ai-analyzer-hero-badge">
                <div className="ai-analyzer-hero-badge-dot"></div>
                <span>Expert Mentors Online</span>
              </div>
              <h1 className="ai-analyzer-hero-title">Your <span className="ai-analyzer-gradient-text">Career Mentorship</span><br />Hub</h1>
              <p className="ai-analyzer-hero-sub">Analyze jobs, improve resumes, score proposals, and detect risky clients — guided by a team of specialized career mentors.</p>
            </div>

            <div className="ai-analyzer-chips-section">
              <span className="ai-analyzer-chips-label">Quick Actions</span>
              <div className="ai-analyzer-chips-row">
                <button className="ai-analyzer-chip" onClick={() => handleChipClick('job-analyzer', "Analyze this job post for red flags, requirements, and my chances of landing it as a React developer with 3 years experience.")}>🔍 Analyze this job post</button>
                <button className="ai-analyzer-chip" onClick={() => handleChipClick('resume-improver', "I need help improving my resume. I have 3 years of React and Node.js experience but keep getting rejected.")}>📄 Improve my resume</button>
                <button className="ai-analyzer-chip" onClick={() => handleChipClick('job-analyzer', "Why am I not getting hired? I apply to 20 jobs a week but rarely hear back.")}>🤔 Why am I not getting hired?</button>
                <button className="ai-analyzer-chip" onClick={() => handleChipClick('proposal-scorer', "Write me a winning proposal for a React developer role on a SaaS startup project.")}>✍️ Write a winning proposal</button>
                <button className="ai-analyzer-chip" onClick={() => handleChipClick('skill-gap', "I'm a React developer. What skills am I missing to land senior-level jobs in 2025?")}>📊 What skills am I missing?</button>
              </div>
            </div>

            <div className="ai-analyzer-tools-grid">
              {Object.values(TOOLS).map((tool) => (
                <div key={tool.id} className="ai-analyzer-tool-card" onClick={() => { handleToolSwitch(tool.id); setCurrentView('chat'); }}>
                  <div className="ai-analyzer-tool-card-glow" style={{ '--glow': tool.color }}></div>
                  <div className="ai-analyzer-tool-card-header">
                    <div className="ai-analyzer-tool-card-icon" style={{ background: tool.gradient }}>
                      {tool.id === 'job-analyzer' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>}
                      {tool.id === 'resume-improver' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>}
                      {tool.id === 'proposal-scorer' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
                      {tool.id === 'client-risk' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                      {tool.id === 'skill-gap' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>}
                    </div>
                    {tool.id === 'job-analyzer' && <span className="ai-analyzer-tool-card-badge">Most Used</span>}
                    {tool.id === 'resume-improver' && <span className="ai-analyzer-tool-card-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>ATS Ready</span>}
                    {tool.id === 'proposal-scorer' && <span className="ai-analyzer-tool-card-badge" style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}>Win Rate+</span>}
                    {tool.id === 'client-risk' && <span className="ai-analyzer-tool-card-badge" style={{ background: 'rgba(5,150,105,0.15)', color: '#059669' }}>NEW</span>}
                    {tool.id === 'skill-gap' && <span className="ai-analyzer-tool-card-badge" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>Growth</span>}
                  </div>
                  <h3 className="ai-analyzer-tool-card-title">{tool.name}</h3>
                  <p className="ai-analyzer-tool-card-desc">{
                    tool.id === 'job-analyzer' ? 'Paste any job description and get instant AI analysis — requirements breakdown, salary estimate, red flags, and your match score.' :
                    tool.id === 'resume-improver' ? 'Transform your resume into an ATS-crushing, recruiter-magnet document. Get section-by-section feedback and rewrites.' :
                    tool.id === 'proposal-scorer' ? 'Score your proposal against winning templates. Get rewrite suggestions, tone analysis, and a predicted success rate.' :
                    tool.id === 'client-risk' ? 'Before you bid — analyze client posts for vague scope, low budgets, scope creep risk, and payment red flags.' :
                    'Compare your skillset to market demand. Get a personalized learning roadmap with top resources to close skill gaps fast.'
                  }</p>
                  <button className="ai-analyzer-tool-card-btn" style={{ background: tool.gradient }}>
                    {tool.id === 'job-analyzer' ? 'Start Analysis →' : tool.id === 'resume-improver' ? 'Improve Resume →' : tool.id === 'proposal-scorer' ? 'Score Proposal →' : tool.id === 'client-risk' ? 'Detect Risks →' : 'Analyze Skills →'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* CHAT VIEW */}
          <section className={`ai-analyzer-chat-view ${currentView === 'chat' ? 'ai-analyzer-view-active' : ''}`}>
            <div className="ai-analyzer-chat-header">
              <button className="ai-analyzer-back-btn" onClick={() => setCurrentView('home')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                <span>Tools</span>
              </button>
              <div className="ai-analyzer-chat-header-info">
                <div className="ai-analyzer-chat-header-icon" style={{ background: currentToolData.gradient }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '18px', height: '18px', color: 'white' }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                </div>
                <div>
                  <div className="ai-analyzer-chat-header-title">{currentToolData.name}</div>
                  <div className="ai-analyzer-chat-header-status"><div className="ai-analyzer-status-dot"></div><span>AI Online · GPT-4 level</span></div>
                </div>
              </div>
              <div className="ai-analyzer-chat-tabs">
                <button className={`ai-analyzer-chat-tab ${activeTab === 'analyze' ? 'active' : ''}`} onClick={() => setActiveTab('analyze')}>Analyze</button>
                <button className={`ai-analyzer-chat-tab ${activeTab === 'improve' ? 'active' : ''}`} onClick={() => setActiveTab('improve')}>Improve</button>
                <button className={`ai-analyzer-chat-tab ${activeTab === 'rewrite' ? 'active' : ''}`} onClick={() => setActiveTab('rewrite')}>Rewrite</button>
              </div>
            </div>

            <div className="ai-analyzer-chat-body" ref={chatBodyRef}>
              {activeToolHistory.length === 0 && (
                <div className="ai-analyzer-chat-welcome">
                  <div className="ai-analyzer-welcome-avatar">
                   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" /><path d="M12 6v6l4 2" /></svg>
                  </div>
                  <h3>{currentToolData.welcomeTitle}</h3>
                  <p>{currentToolData.welcomeDesc}</p>
                  <div className="ai-analyzer-welcome-chips">
                    {(WELCOME_CHIP_PROMPTS[currentTool] || []).map((chipText, index) => (
                      <button key={index} className="ai-analyzer-welcome-chip" onClick={handleInsertSample}>{chipText}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ai-analyzer-messages-list">
                {activeToolHistory.map((msg, idx) => (
                  <div key={idx} className={`ai-analyzer-msg ${msg.role}`}>
                    <div className="ai-analyzer-msg-avatar" style={msg.role === 'ai' ? { background: currentToolData.gradient } : undefined}>
                      {msg.role === 'user' ? 'U' : 'AI'}
                    </div>
                    <div className="ai-analyzer-msg-content" style={msg.role === 'ai' ? { maxWidth: '90%' } : {}}>
                      {msg.role === 'user' ? (
                        <div className="ai-analyzer-msg-bubble">{msg.text}</div>
                      ) : (
                        <>
                          <div className="ai-response-card">
                            <div className="ai-card-section">
                              <div className="ai-section-header">
                                <div className="ai-section-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>🔍</div>
                                <span className="ai-section-title">Analysis</span>
                              </div>
                              <div className="ai-section-content">{msg.data.analysis}</div>
                            </div>
                            <div className="ai-card-section">
                              <div className="ai-section-header">
                                <div className="ai-section-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>⚠️</div>
                                <span className="ai-section-title">Issues & Red Flags</span>
                              </div>
                              <div className="ai-section-content">
                                {msg.data.issues.map((issue, i) => (
                                  <div key={i} className={`ai-analyzer-issue-item ${issue.level}`}>
                                    <span className="ai-analyzer-issue-tag">{issue.level}</span>
                                    <span className="ai-analyzer-issue-text">{issue.text}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="ai-card-section">
                              <div className="ai-section-header">
                                <div className="ai-section-icon" style={{ background: 'rgba(34,197,94,0.12)' }}>💡</div>
                                <span className="ai-section-title">Suggestions</span>
                              </div>
                              <div className="ai-section-content">
                                <ul>
                                  {msg.data.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                                </ul>
                              </div>
                            </div>
                            <div className="ai-card-section">
                              <div className="ai-section-header">
                                <div className="ai-section-icon" style={{ background: 'rgba(245,158,11,0.12)' }}>📈</div>
                                <span className="ai-section-title">Score</span>
                              </div>
                              <div className="ai-analyzer-score-section-card">
                                <div className="ai-analyzer-score-bar-wrapper">
                                  <div className="ai-analyzer-score-bar-label">
                                    <span>{msg.data.score >= 70 ? 'Good' : msg.data.score >= 45 ? 'Fair' : 'Needs Work'}</span>
                                    <span>{msg.data.score}/100</span>
                                  </div>
                                  <div className="ai-analyzer-score-bar-track">
                                    <div className="ai-analyzer-score-bar-fill" style={{ width: `${msg.data.score}%`, background: msg.data.score >= 70 ? '#22c55e' : msg.data.score >= 45 ? '#f59e0b' : '#ef4444' }}></div>
                                  </div>
                                </div>
                                <div className="ai-analyzer-score-number-big" style={{ color: msg.data.score >= 70 ? '#22c55e' : msg.data.score >= 45 ? '#f59e0b' : '#ef4444' }}>{msg.data.score}</div>
                              </div>
                            </div>
                          </div>
                          <div className="ai-analyzer-inline-action-card">
                            <span className="ai-analyzer-inline-action-text">✨ Want me to rewrite this for you?</span>
                            <button className="ai-analyzer-inline-action-btn" onClick={() => triggerQuickAction('rewrite')}>Rewrite →</button>
                          </div>
                          <div className="ai-analyzer-msg-actions">
                            <button className="ai-analyzer-msg-action-btn primary" onClick={() => triggerQuickAction('improve')}>✨ Improve</button>
                            <button className="ai-analyzer-msg-action-btn" onClick={() => triggerQuickAction('analyze')}>🔄 Analyze Again</button>
                            <button className="ai-analyzer-msg-action-btn" onClick={() => triggerQuickAction('proposal')}>📝 Generate Proposal</button>
                            <button className="ai-analyzer-msg-action-btn" onClick={() => copyResponse(msg.data)}>📋 Copy</button>
                            <button className="ai-analyzer-msg-action-btn" onClick={() => downloadResponse(msg.data)}>⬇️ Export</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="ai-analyzer-msg ai">
                    <div className="ai-analyzer-msg-avatar" style={{ background: currentToolData.gradient }}>AI</div>
                    <div className="ai-analyzer-msg-content">
                      <div className="ai-analyzer-typing-indicator">
                        <span className="ai-analyzer-typing-label">AI is analyzing</span>
                        <div className="ai-analyzer-typing-dots">
                          <div className="ai-analyzer-typing-dot"></div><div className="ai-analyzer-typing-dot"></div><div className="ai-analyzer-typing-dot"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="ai-analyzer-chat-input-area">
              <div className="ai-analyzer-chat-input-wrapper">
                <textarea
                  ref={chatInputRef}
                  className="ai-analyzer-chat-input"
                  placeholder={currentToolData.placeholder}
                  rows="1"
                  value={chatInput}
                  onChange={handleInputChange}
                  onKeyDown={handleInputKeyDown}
                ></textarea>
                <div className="ai-analyzer-chat-input-actions">
                  <button className="ai-analyzer-input-action-btn" onClick={handleInsertSample} title="Insert sample">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  </button>
                  <button className="ai-analyzer-send-btn" onClick={() => sendMessage(chatInput)} disabled={isTyping || !chatInput.trim()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </button>
                </div>
              </div>
              <div className="ai-analyzer-input-hint">Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line</div>
            </div>
          </section>
        </main>

        {/* INSIGHTS PANEL */}
        <aside className="ai-analyzer-insights-panel">
          <div className="ai-analyzer-insights-header">
            <h3 className="ai-analyzer-insights-title">AI Insights</h3>
            <div className="ai-analyzer-insights-live"><div className="ai-analyzer-live-dot"></div><span>Live</span></div>
          </div>

          <div className="ai-analyzer-insight-card">
            <div className="ai-analyzer-insight-card-label">Overall Score</div>
            <div className="ai-analyzer-score-circle-wrapper">
              <svg className="ai-analyzer-score-circle-svg" viewBox="0 0 120 120">
                <circle className="ai-analyzer-score-track" cx="60" cy="60" r="50" />
                <circle className="ai-analyzer-score-fill" cx="60" cy="60" r="50"
                  strokeDasharray="314"
                  strokeDashoffset={latestAiResponse ? 314 - (latestAiResponse.score / 100) * 314 : 314}
                  style={{
                    '--score-color': latestAiResponse ? (latestAiResponse.score >= 70 ? '#22c55e' : latestAiResponse.score >= 45 ? '#f59e0b' : '#ef4444') : '#22c55e',
                    stroke: latestAiResponse ? (latestAiResponse.score >= 70 ? '#22c55e' : latestAiResponse.score >= 45 ? '#f59e0b' : '#ef4444') : '#22c55e',
                  }}
                />
              </svg>
              <div className="ai-analyzer-score-center">
                <span className="ai-analyzer-score-value">{latestAiResponse ? latestAiResponse.score : '—'}</span>
                <span className="ai-analyzer-score-label">{latestAiResponse ? (latestAiResponse.score >= 70 ? 'Excellent' : latestAiResponse.score >= 45 ? 'Fair' : 'Poor') : 'Analyzing...'}</span>
              </div>
            </div>
          </div>

          <div className="ai-analyzer-insight-card">
            <div className="ai-analyzer-insight-card-label">Risk Level</div>
            <div className="ai-analyzer-risk-display">
              {latestAiResponse ? (
                <>
                  <div className={`ai-analyzer-risk-badge ai-analyzer-risk-${latestAiResponse.risk}`}>
                    {latestAiResponse.risk.charAt(0).toUpperCase() + latestAiResponse.risk.slice(1)} Risk
                  </div>
                  <div className="ai-analyzer-risk-bar-track">
                    <div className="ai-analyzer-risk-bar-fill" style={{ width: latestAiResponse.risk === 'low' ? '25%' : latestAiResponse.risk === 'medium' ? '60%' : '90%', background: latestAiResponse.risk === 'low' ? '#22c55e' : latestAiResponse.risk === 'medium' ? '#f59e0b' : '#ef4444' }}></div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ai-analyzer-risk-badge ai-analyzer-risk-unknown">Awaiting Input</div>
                  <div className="ai-analyzer-risk-bar-track"><div className="ai-analyzer-risk-bar-fill" style={{ width: '0%', background: '#6b7280' }}></div></div>
                </>
              )}
            </div>
          </div>

          <div className="ai-analyzer-insight-card">
            <div className="ai-analyzer-insight-card-label">Profile Match</div>
            <div className="ai-analyzer-match-row">
              <div className="ai-analyzer-match-label">{latestAiResponse ? `${latestAiResponse.match}%` : '—'}</div>
              <div className="ai-analyzer-match-bar-track">
                <div className="ai-analyzer-match-bar-fill" style={{ width: latestAiResponse ? `${latestAiResponse.match}%` : '0%', background: latestAiResponse ? (latestAiResponse.match >= 70 ? '#22c55e' : latestAiResponse.match >= 45 ? '#f59e0b' : '#ef4444') : '' }}></div>
              </div>
            </div>
          </div>

          <div className="ai-analyzer-insight-card">
            <div className="ai-analyzer-insight-card-label">AI Confidence</div>
            <div className="ai-analyzer-confidence-row">
              {[1, 2, 3, 4, 5].map((level) => {
                const confClass = latestAiResponse ? (latestAiResponse.confidence >= 4 ? 'ai-analyzer-conf-filled-3' : latestAiResponse.confidence >= 3 ? 'ai-analyzer-conf-filled-2' : 'ai-analyzer-conf-filled-1') : '';
                return (
                  <div key={level} className={`ai-analyzer-conf-dot ${latestAiResponse && level <= latestAiResponse.confidence ? confClass : 'ai-analyzer-conf-empty'}`}></div>
                )
              })}
              <span className="ai-analyzer-conf-label">
                {latestAiResponse ? ['Very Low', 'Low', 'Moderate', 'High', 'Very High'][latestAiResponse.confidence - 1] : '—'}
              </span>
            </div>
          </div>

          <div className="ai-analyzer-insight-card">
            <div className="ai-analyzer-insight-card-label">Missing Skills</div>
            <div className="ai-analyzer-skills-list">
              {latestAiResponse && latestAiResponse.skills ? (
                latestAiResponse.skills.map((s, i) => (
                  <div key={i} className="ai-analyzer-skill-tag">
                    <span>{s.name}</span>
                    <span className={`ai-analyzer-skill-importance ${s.importance}`}>{s.importance}</span>
                  </div>
                ))
              ) : (
                <div className="ai-analyzer-skills-empty">Run an analysis to see skill gaps</div>
              )}
            </div>
          </div>

          {latestAiResponse && latestAiResponse.tips && (
            <div className="ai-analyzer-insight-card">
              <div className="ai-analyzer-insight-card-label">Quick Tips</div>
              <div className="ai-analyzer-tips-list">
                {latestAiResponse.tips.map((tip, i) => (
                  <div key={i} className="ai-analyzer-tip-item">{tip}</div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* TOAST */}
      <div className={`ai-analyzer-toast ${toastMessage ? 'show' : ''}`} aria-live="polite">{toastMessage}</div>
    </div>
  );
};

export default AIJobAnalyzer;
